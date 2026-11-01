import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Safely read a text file relative to project root.
 */
export function readProjectFile(relPath) {
  const fullPath = path.resolve(PROJECT_ROOT, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Safely parse a JSON file relative to project root.
 */
export function readProjectJson(relPath) {
  const content = readProjectFile(relPath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Compute sha256 base64 hash formatted for CSP: 'sha256-<base64>'
 */
export function computeCspHash(content) {
  const hash = crypto.createHash('sha256').update(content, 'utf8').digest('base64');
  return `'sha256-${hash}'`;
}

/**
 * Dynamic module loader that tries to load an implementation file if it exists,
 * or falls back to a provided reference module.
 */
export async function loadModule(relPath, fallbackModule = null) {
  const fullPath = path.resolve(PROJECT_ROOT, relPath);
  if (fs.existsSync(fullPath)) {
    try {
      return await import(fullPath);
    } catch (err) {
      console.warn(`[harness] Failed to dynamically import ${relPath}:`, err.message);
    }
  }
  return fallbackModule;
}

/**
 * Authoritative Indian currency formatting specification.
 */
export function formatIndianCurrency(n) {
  const val = Math.max(0, Number(n) || 0);
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
}

/**
 * Statutory TDS Configuration Specification (FY 2026-27 / current rates)
 */
export const TDS_SECTIONS_SPEC = Object.freeze({
  '192': { name: 'Salaries', threshold: 0, defaultRate: null, isSlab: true },
  '194A': { name: 'Interest other than securities', threshold: 40000, seniorThreshold: 50000, defaultRate: 0.10 },
  '194C': { name: 'Contractors', singleThreshold: 30000, aggregateThreshold: 100000, rateIndividual: 0.01, rateCompany: 0.02 },
  '194H': { name: 'Commission / Brokerage', threshold: 15000, defaultRate: 0.05 },
  '194I': { name: 'Rent', threshold: 240000, rateMachinery: 0.02, rateBuilding: 0.10 },
  '194J': { name: 'Professional / Technical', threshold: 30000, rateTechnical: 0.02, rateProfessional: 0.10 },
});

/**
 * Statutory PF & ESI Configuration Specification
 */
export const STATUTORY_LIMITS_SPEC = Object.freeze({
  EPF: {
    statutoryCeilingMonthly: 15000,
    employeeRate: 0.12,
    employerRate: 0.12,
    epsRate: 0.0833,
    epfEmployerDiffRate: 0.0367,
    maxCappedEmployeeMonthly: 1800,
    maxCappedEpsMonthly: 1250,
  },
  ESI: {
    statutoryWageCeilingMonthly: 21000,
    disabilityWageCeilingMonthly: 25000,
    employeeRate: 0.0075,
    employerRate: 0.0325,
  },
});

/**
 * Reference Tax Calculator (AY 2026-27 / FY 2025-26)
 */
export function calculateTaxSlabs(taxable, regime = 'new') {
  if (taxable <= 0) return 0;
  if (regime === 'new') {
    const slabs = [
      [400000, 0],
      [400000, 0.05],
      [400000, 0.10],
      [400000, 0.15],
      [400000, 0.20],
      [400000, 0.25],
      [Infinity, 0.30],
    ];
    let remaining = taxable;
    let tax = 0;
    for (const [limit, rate] of slabs) {
      const amount = Math.min(remaining, limit);
      if (amount <= 0) break;
      tax += amount * rate;
      remaining -= amount;
    }
    // Section 87A rebate for new regime up to 12L
    if (taxable <= 1200000) tax = Math.max(0, tax - 60000);
    return tax * 1.04; // 4% cess
  } else {
    const slabs = [
      [250000, 0],
      [250000, 0.05],
      [500000, 0.20],
      [Infinity, 0.30],
    ];
    let remaining = taxable;
    let tax = 0;
    for (const [limit, rate] of slabs) {
      const amount = Math.min(remaining, limit);
      if (amount <= 0) break;
      tax += amount * rate;
      remaining -= amount;
    }
    // Section 87A rebate for old regime up to 5L
    if (taxable <= 500000) tax = Math.max(0, tax - 12500);
    return tax * 1.04; // 4% cess
  }
}

/**
 * Reference Authoritative Payslip Engine (F11 specification)
 */
export function calculateReferencePayslip({
  annualCtc = 0,
  monthlyCtc = null,
  fixedMonthlyGross = null,
  basicPct = 40,
  fixedBasic = null,
  hraPct = 50,
  capPf = true,
  regime = 'new',
  state = 'Karnataka',
  customTds = null,
}) {
  let totalAnnual = monthlyCtc ? monthlyCtc * 12 : Math.max(0, Number(annualCtc) || 0);
  if (fixedMonthlyGross !== null) {
    totalAnnual = fixedMonthlyGross * 12;
  }
  const basic = fixedBasic ? fixedBasic * 12 : (totalAnnual * Math.max(0, Number(basicPct) || 0)) / 100;
  const monthlyBasic = basic / 12;

  // EPF Calculation
  const monthlyPf = capPf
    ? Math.min(monthlyBasic, STATUTORY_LIMITS_SPEC.EPF.statutoryCeilingMonthly) * STATUTORY_LIMITS_SPEC.EPF.employeeRate
    : monthlyBasic * STATUTORY_LIMITS_SPEC.EPF.employeeRate;
  const annualPf = monthlyPf * 12;

  // HRA
  const annualHra = (basic * Math.max(0, Number(hraPct) || 0)) / 100;
  const monthlyHra = annualHra / 12;

  // Other allowance to balance CTC
  const annualEmployerPf = annualPf;
  const grossCashAnnual = fixedMonthlyGross !== null ? fixedMonthlyGross * 12 : Math.max(0, totalAnnual - annualEmployerPf);
  const monthlyGross = fixedMonthlyGross !== null ? fixedMonthlyGross : grossCashAnnual / 12;

  // ESI: gross monthly <= 21,000
  let monthlyEsi = 0;
  let monthlyEmployerEsi = 0;
  if (monthlyGross <= STATUTORY_LIMITS_SPEC.ESI.statutoryWageCeilingMonthly && monthlyGross > 0) {
    monthlyEsi = Math.round(monthlyGross * STATUTORY_LIMITS_SPEC.ESI.employeeRate);
    monthlyEmployerEsi = Math.round(monthlyGross * STATUTORY_LIMITS_SPEC.ESI.employerRate);
  }

  // Professional Tax (Karnataka: ₹200/mo or ₹2,500/yr if gross >= ₹25,000)
  let monthlyPt = 0;
  if (state === 'Karnataka' && monthlyGross >= 25000) {
    monthlyPt = 200;
  }

  // TDS / Income Tax
  let annualTds;
  if (customTds !== null) {
    annualTds = Math.max(0, Number(customTds) || 0);
  } else {
    const standardDeduction = regime === 'new' ? 75000 : 50000;
    const taxableSalary = Math.max(0, grossCashAnnual - standardDeduction);
    annualTds = calculateTaxSlabs(taxableSalary, regime);
  }
  const monthlyTds = Math.round(annualTds / 12);

  const totalMonthlyDeductions = monthlyPf + monthlyEsi + monthlyPt + monthlyTds;
  const monthlyTakeHome = Math.max(0, monthlyGross - totalMonthlyDeductions);

  return {
    annualCtc: totalAnnual,
    monthlyGross: Math.round(monthlyGross),
    basic: Math.round(monthlyBasic),
    hra: Math.round(monthlyHra),
    allowances: Math.max(0, Math.round(monthlyGross - monthlyBasic - monthlyHra)),
    employeePf: Math.round(monthlyPf),
    employerPf: Math.round(monthlyPf),
    employeeEsi: monthlyEsi,
    employerEsi: monthlyEmployerEsi,
    professionalTax: monthlyPt,
    tds: monthlyTds,
    totalDeductions: Math.round(totalMonthlyDeductions),
    netSalary: Math.round(monthlyTakeHome),
    formattedNetSalary: formatIndianCurrency(Math.round(monthlyTakeHome)),
  };
}

/**
 * Reference GSTR-2B vs Purchase Register Reconciler (F12 specification)
 */
export function reconcileReferenceGstr(gstrInvoices = [], prInvoices = [], tolerance = 1.0) {
  const normalizeGstin = g => String(g || '').trim().toUpperCase();
  const normalizeInv = i => String(i || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  const prMap = new Map();
  for (const pr of prInvoices) {
    const key = `${normalizeGstin(pr.gstin)}::${normalizeInv(pr.invoiceNumber)}`;
    prMap.set(key, pr);
  }

  const matches = [];
  const mismatches = [];
  const missingInPr = [];
  const matchedPrKeys = new Set();

  for (const g2b of gstrInvoices) {
    const key = `${normalizeGstin(g2b.gstin)}::${normalizeInv(g2b.invoiceNumber)}`;
    const pr = prMap.get(key);

    if (!pr) {
      missingInPr.push(g2b);
    } else {
      matchedPrKeys.add(key);
      const valDiff = Math.abs((Number(g2b.taxableValue) || 0) - (Number(pr.taxableValue) || 0));
      if (valDiff <= tolerance) {
        matches.push({ gstr: g2b, pr, diff: valDiff, status: 'MATCHED' });
      } else {
        mismatches.push({
          gstr: g2b,
          pr,
          gstrValue: Number(g2b.taxableValue) || 0,
          prValue: Number(pr.taxableValue) || 0,
          diff: valDiff,
          status: 'VALUE_MISMATCH',
        });
      }
    }
  }

  const missingIn2B = [];
  for (const pr of prInvoices) {
    const key = `${normalizeGstin(pr.gstin)}::${normalizeInv(pr.invoiceNumber)}`;
    if (!matchedPrKeys.has(key)) {
      missingIn2B.push(pr);
    }
  }

  return {
    summary: {
      totalGstr: gstrInvoices.length,
      totalPr: prInvoices.length,
      matchedCount: matches.length,
      mismatchCount: mismatches.length,
      missingIn2BCount: missingIn2B.length,
      missingInPrCount: missingInPr.length,
    },
    matches,
    mismatches,
    missingIn2B,
    missingInPr,
  };
}

/**
 * Reference TDS Calculator (F13 specification)
 */
export function calculateReferenceTds({
  section,
  amount,
  panProvided = true,
  recipientType = 'individual',
  isSenior = false,
  subType = null,
}) {
  const amt = Math.max(0, Number(amount) || 0);
  const cfg = TDS_SECTIONS_SPEC[section];
  if (!cfg) throw new Error(`Unknown TDS section: ${section}`);

  // Without valid PAN, Section 206AA dictates 20% flat rate (or higher)
  if (!panProvided) {
    return {
      section,
      amount: amt,
      rate: 0.20,
      tdsAmount: Math.round(amt * 0.20),
      reason: 'Section 206AA: Higher rate applied due to missing or invalid PAN',
      isExempt: false,
    };
  }

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
      tdsAmount: 0,
      reason: `Amount ₹${amt} is within threshold of ₹${threshold}`,
      isExempt: true,
    };
  }

  const tds = Math.round(amt * rate);
  return {
    section,
    amount: amt,
    threshold,
    rate,
    tdsAmount: tds,
    netPayable: amt - tds,
    isExempt: false,
  };
}

/**
 * Reference Salary Sheet Generator (F15 specification)
 */
export function generateReferenceSalarySheet({ employees = [], daysInMonth = 30 }) {
  if (daysInMonth <= 0) throw new Error('daysInMonth must be positive');

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  const rows = employees.map((emp, idx) => {
    const paidDays = Math.min(daysInMonth, Math.max(0, Number(emp.paidDays ?? daysInMonth)));
    const proration = paidDays / daysInMonth;

    const baseGross = Math.max(0, Number(emp.monthlyGross) || 0);
    const proratedGross = Math.round(baseGross * proration);

    const baseBasic = Math.round(proratedGross * 0.40);
    const pf = emp.optPf === false
      ? 0
      : Math.round(Math.min(baseBasic, STATUTORY_LIMITS_SPEC.EPF.statutoryCeilingMonthly) * 0.12);

    let esi = 0;
    if (proratedGross <= STATUTORY_LIMITS_SPEC.ESI.statutoryWageCeilingMonthly && proratedGross > 0) {
      esi = Math.round(proratedGross * STATUTORY_LIMITS_SPEC.ESI.employeeRate);
    }

    const pt = proratedGross >= 25000 ? 200 : 0;
    const tds = Math.max(0, Number(emp.tds) || 0);

    const deductions = pf + esi + pt + tds;
    const net = Math.max(0, proratedGross - deductions);

    totalGross += proratedGross;
    totalDeductions += deductions;
    totalNet += net;

    return {
      employeeId: emp.id || `EMP${String(idx + 1).padStart(3, '0')}`,
      name: emp.name || `Employee ${idx + 1}`,
      paidDays,
      proratedGross,
      pf,
      esi,
      pt,
      tds,
      totalDeductions: deductions,
      netSalary: net,
    };
  });

  return {
    daysInMonth,
    employeeCount: rows.length,
    totalGross,
    totalDeductions,
    totalNet,
    rows,
  };
}

/**
 * Reference Tool Variant Generator (F16 specification)
 */
export function generateReferenceVariants() {
  const emiAmounts = [1000000, 2500000, 5000000, 10000000];
  const emiLabels = ['10-lakh', '25-lakh', '50-lakh', '1-crore'];
  const emiTenures = [10, 15, 20, 25];

  const ctcLpas = [6, 8, 10, 12, 15, 20];
  const ctcRegimes = ['new', 'old'];

  const variants = [];

  // EMI variants (4 amounts x 4 tenures = 16)
  for (let i = 0; i < emiAmounts.length; i++) {
    for (let j = 0; j < emiTenures.length; j++) {
      const amt = emiAmounts[i];
      const tenure = emiTenures[j];
      const slug = `emi-calculator-${emiLabels[i]}-${tenure}-years`;
      variants.push({
        slug,
        baseToolSlug: 'emi',
        name: `₹${formatIndianCurrency(amt)} Home Loan EMI Calculator (${tenure} Years)`,
        description: `Calculate monthly EMI, interest, and payoff schedule for a ₹${formatIndianCurrency(amt)} loan over ${tenure} years.`,
        params: { principal: amt, tenureYears: tenure },
        canonicalUrl: 'https://orbitboard.in/tools/emi',
        intro: `Looking for monthly EMI on a ₹${formatIndianCurrency(amt)} loan? Plan your budget with repayment charts and interest calculations.`,
        faq: [
          [`What is the EMI for ₹${formatIndianCurrency(amt)} for ${tenure} years?`, `At an illustrative 8.5% p.a., calculate monthly payments and total interest instantly.`],
          ['Can I prepay to reduce tenure?', 'Yes, making prepayments directly reduces outstanding principal and overall interest burden.'],
        ],
      });
    }
  }

  // CTC variants (6 LPAs x 2 regimes = 12)
  for (const lpa of ctcLpas) {
    for (const regime of ctcRegimes) {
      const slug = `${lpa}-lpa-in-hand-salary-${regime}-regime`;
      variants.push({
        slug,
        baseToolSlug: 'ctc-to-inhand',
        name: `${lpa} LPA CTC In-Hand Salary Calculator (${regime === 'new' ? 'New' : 'Old'} Regime)`,
        description: `Detailed take-home breakdown for ₹${lpa} Lakh CTC under the ${regime} tax regime with PF, PT, and tax rebate.`,
        params: { ctcAnnual: lpa * 100000, regime },
        canonicalUrl: 'https://orbitboard.in/tools/ctc-to-inhand',
        intro: `Find out your exact monthly take-home salary on a ${lpa} LPA CTC offer under the ${regime} tax regime.`,
        faq: [
          [`How much in-hand salary for ${lpa} LPA in ${regime} regime?`, `Calculate your monthly pay after standard deduction, EPF, and tax.'`],
          ['Is PF compulsory on this salary?', 'EPF is statutory for basic pay up to ₹15,000/month and can be capped or uncapped.'],
        ],
      });
    }
  }

  return variants;
}
