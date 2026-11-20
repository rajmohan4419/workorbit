/**
 * TDS Calculation Engine (India)
 * Table-driven statutory configuration for Sections 192, 194A, 194C, 194H, 194I, 194J.
 * Incorporates Section 206AA higher penal rate (20%) when valid PAN is not provided.
 * FY 2025-26 only (Income-tax Act, 1961). TY 2026-27 section migration is not modelled.
 */

import { formatINR, money } from '../../lib/toolFormat.js';
import { calculateTaxSlabs } from './payslipEngine.js';

export const TDS_RULE_SOURCE = 'https://incometaxindia.gov.in/news/highlights-to-finance-act-2025.pdf';
export const TDS_RATE_SOURCE = 'https://www.incometaxindia.gov.in/w/tds-rates-1';
export const TDS_VERIFIED_ON = '2026-11-15';
export const TDS_CONFIG = Object.freeze({
  '192': {
    section: '192',
    title: 'Salary / Remuneration',
    description: 'TDS on salary income calculated as per progressive income tax slabs under chosen tax regime.',
    threshold: 0,
    challan: 'ITNS 281 (Form 24Q)',
    isSlab: true,
  },
  '194A': {
    section: '194A',
    title: 'Interest other than Securities',
    description: 'Interest from banks/co-operative banks/post office time deposits. Other payer thresholds are outside this estimator.',
    threshold: 50000,
    seniorThreshold: 100000,
    defaultRate: 0.10,
    challan: 'ITNS 281 (Form 26Q)',
  },
  '194C': {
    section: '194C',
    title: 'Payments to Contractors & Sub-contractors',
    description: 'Contractual payments for civil work, advertising, transport, catering, manufacturing.',
    singleThreshold: 30000,
    aggregateThreshold: 100000,
    rateIndividual: 0.01,
    rateCompany: 0.02,
    challan: 'ITNS 281 (Form 26Q)',
  },
  '194H': {
    section: '194H',
    title: 'Commission or Brokerage',
    description: 'Commission or brokerage paid to agents or brokers.',
    threshold: 20000,
    defaultRate: 0.02,
    challan: 'ITNS 281 (Form 26Q)',
  },
  '194I': {
    section: '194I',
    title: 'Rent on Property / Equipment',
    description: 'Rent for one month or part month (not annual rent): land, building, furniture, plant or machinery.',
    threshold: 50000,
    rateMachinery: 0.02,
    rateBuilding: 0.10,
    challan: 'ITNS 281 (Form 26Q)',
  },
  '194J': {
    section: '194J',
    title: 'Fees for Professional or Technical Services',
    description: 'Professional fees (legal, medical, engineering, CA), technical services (FTS), or royalty.',
    threshold: 50000,
    rateTechnical: 0.02,
    rateProfessional: 0.10,
    challan: 'ITNS 281 (Form 26Q)',
  },
});

export function isValidPan(pan) {
  if (!pan) return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(pan).trim().toUpperCase());
}

/**
 * Pure calculation for TDS deduction.
 */
export function calculateTds({
  section,
  amount,
  aggregateAmount = 0,
  panProvided = true,
  pan = '',
  recipientType = 'individual', // 'individual' | 'company'
  isSenior = false,
  subType = null, // 'machinery' | 'building' | 'technical' | 'professional'
  regime = 'new', // for section 192
}) {
  const amt = Math.max(0, Number(amount) || 0);
  const cfg = TDS_CONFIG[section];
  if (!cfg) {
    throw new Error(`Unknown TDS section: ${section}`);
  }

  // Section 192 (Salaries)
  if (cfg.isSlab) {
    const standardDeduction = regime === 'new' ? 75000 : 50000;
    const taxable = Math.max(0, amt - standardDeduction);
    const annualTax = calculateTaxSlabs(taxable, regime);
    const averageRate = amt > 0 ? annualTax / amt : 0;
    const isExempt = annualTax === 0;

    return {
      section,
      amount: amt,
      taxableAmount: taxable,
      rate: averageRate,
      ratePct: `${(averageRate * 100).toFixed(2)}%`,
      threshold: standardDeduction,
      tdsAmount: Math.round(annualTax),
      netPayable: Math.max(0, amt - Math.round(annualTax)),
      reason: isExempt
        ? `No TDS applicable under ${regime === 'new' ? 'New Regime (Section 87A rebate up to ₹12 Lakh)' : 'Old Regime'}`
        : `Calculated as per progressive tax slabs (${regime} regime)`,
      isExempt,
      isPenal: false,
      challan: cfg.challan,
      formattedAmount: formatINR(amt),
      formattedTds: formatINR(Math.round(annualTax)),
      formattedNetPayable: formatINR(Math.max(0, amt - Math.round(annualTax))),
    };
  }

  // Section 194A to 194J
  let threshold = cfg.threshold || 0;
  let rate = cfg.defaultRate || 0;
  let isExempt = false;

  if (section === '194A') {
    threshold = isSenior ? cfg.seniorThreshold : cfg.threshold;
    rate = cfg.defaultRate;
    isExempt = amt <= threshold;
  } else if (section === '194C') {
    threshold = cfg.singleThreshold;
    rate = recipientType === 'company' ? cfg.rateCompany : cfg.rateIndividual;
    const agg = Math.max(0, Number(aggregateAmount) || 0);
    if (agg > cfg.aggregateThreshold) {
      isExempt = false;
      threshold = cfg.aggregateThreshold;
    } else {
      isExempt = amt <= cfg.singleThreshold;
    }
  } else if (section === '194I') {
    threshold = cfg.threshold;
    rate = subType === 'machinery' ? cfg.rateMachinery : cfg.rateBuilding;
    isExempt = amt <= threshold;
  } else if (section === '194J') {
    threshold = cfg.threshold;
    rate = subType === 'technical' ? cfg.rateTechnical : cfg.rateProfessional;
    isExempt = amt <= threshold;
  } else {
    isExempt = amt <= threshold;
  }

  if (isExempt) {
    return {
      section,
      amount: amt,
      threshold,
      rate: 0,
      ratePct: '0% (Exempt)',
      tdsAmount: 0,
      netPayable: amt,
      reason: `Amount ₹${money(amt)} is within statutory threshold of ₹${money(threshold)}`,
      isExempt: true,
      isPenal: false,
      challan: cfg.challan,
      formattedAmount: formatINR(amt),
      formattedTds: formatINR(0),
      formattedNetPayable: formatINR(amt),
    };
  }

  // Section 206AA: Higher penal rate of 20% strictly applies when valid PAN is not provided
  const hasValidPan = panProvided !== false && (pan === '' || isValidPan(pan));
  if (!hasValidPan) {
    const penalRate = Math.max(0.20, rate);
    const tdsAmount = Math.round(amt * penalRate);
    return {
      section,
      amount: amt,
      rate: penalRate,
      ratePct: '20%',
      threshold,
      tdsAmount,
      netPayable: Math.max(0, amt - tdsAmount),
      reason: 'Section 206AA: Higher rate applied due to missing or invalid PAN',
      isExempt: false,
      isPenal: true,
      challan: cfg.challan,
      formattedAmount: formatINR(amt),
      formattedTds: formatINR(tdsAmount),
      formattedNetPayable: formatINR(Math.max(0, amt - tdsAmount)),
    };
  }


  const tds = Math.round(amt * rate);
  const net = amt - tds;

  return {
    section,
    amount: amt,
    threshold,
    rate,
    ratePct: `${(rate * 100).toFixed(0)}%`,
    tdsAmount: tds,
    netPayable: net,
    reason: `TDS @ ${(rate * 100).toFixed(0)}% deducted on ₹${money(amt)} (exceeds ₹${money(threshold)} threshold)`,
    isExempt: false,
    isPenal: false,
    challan: cfg.challan,
    formattedAmount: formatINR(amt),
    formattedTds: formatINR(tds),
    formattedNetPayable: formatINR(net),
  };
}
