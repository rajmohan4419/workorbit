/**
 * TDS Calculation Engine (India)
 * Table-driven statutory configuration for Sections 192, 194A, 194C, 194H, 194I, 194J.
 * Incorporates Section 206AA higher penal rate (20%) when valid PAN is not provided.
 * Complies with FY 2025-26 / FY 2026-27 statutory provisions.
 */

import { formatINR, money } from '../../lib/toolFormat.js';
import { calculateTaxSlabs } from './payslipEngine.js';

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
    description: 'Interest on bank fixed deposits, recurring deposits, or private loans.',
    threshold: 40000,
    seniorThreshold: 50000,
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
    threshold: 15000,
    defaultRate: 0.05,
    challan: 'ITNS 281 (Form 26Q)',
  },
  '194I': {
    section: '194I',
    title: 'Rent on Property / Equipment',
    description: 'Rent paid for land, building, furniture, or plant & machinery.',
    threshold: 240000,
    rateMachinery: 0.02,
    rateBuilding: 0.10,
    challan: 'ITNS 281 (Form 26Q)',
  },
  '194J': {
    section: '194J',
    title: 'Fees for Professional or Technical Services',
    description: 'Professional fees (legal, medical, engineering, CA), technical services (FTS), or royalty.',
    threshold: 30000,
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

  // Section 206AA: Higher penal rate of 20% strictly applies when valid PAN is not provided
  const hasValidPan = panProvided !== false && (pan === '' || isValidPan(pan));
  if (!hasValidPan) {
    const penalRate = 0.20;
    const tdsAmount = Math.round(amt * penalRate);
    return {
      section,
      amount: amt,
      rate: penalRate,
      ratePct: '20%',
      threshold: cfg.threshold || 0,
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

  if (section === '194A') {
    threshold = isSenior ? cfg.seniorThreshold : cfg.threshold;
    rate = cfg.defaultRate;
  } else if (section === '194C') {
    threshold = cfg.singleThreshold;
    rate = recipientType === 'company' ? cfg.rateCompany : cfg.rateIndividual;
  } else if (section === '194I') {
    threshold = cfg.threshold;
    rate = subType === 'machinery' ? cfg.rateMachinery : cfg.rateBuilding;
  } else if (section === '194J') {
    threshold = cfg.threshold;
    rate = subType === 'technical' ? cfg.rateTechnical : cfg.rateProfessional;
  }

  if (amt <= threshold) {
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
