/**
 * Payslip Calculation Engine
 * Indian Payroll: Basic, HRA, Allowances, EPF, ESI, Professional Tax, TDS.
 * Complies with FY 2025-26 / FY 2026-27 Income Tax slabs and statutory wage ceilings.
 */

import { formatINR, money } from '../../lib/toolFormat.js';

export const STATUTORY_LIMITS = Object.freeze({
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
 * Calculate Indian income tax slabs + 4% cess.
 * Supports New Tax Regime (Section 115BAC with ₹75k standard deduction)
 * and Old Tax Regime (with ₹50k standard deduction).
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
    // Section 87A rebate for new regime up to 12L taxable
    if (taxable <= 1200000) tax = Math.max(0, tax - 60000);
    return tax * 1.04;
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
    // Section 87A rebate for old regime up to 5L taxable
    if (taxable <= 500000) tax = Math.max(0, tax - 12500);
    return tax * 1.04;
  }
}

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertIndianGroup(n) {
  if (n === 0) return '';
  if (n < 1000) return numToWords(n);

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thou = Math.floor((n % 100000) / 1000);
  const rem = n % 1000;

  let words = '';
  if (crore > 0) words += convertIndianGroup(crore) + ' Crore ';
  if (lakh > 0) words += numToWords(lakh) + ' Lakh ';
  if (thou > 0) words += numToWords(thou) + ' Thousand ';
  if (rem > 0) words += numToWords(rem);

  return words.trim();
}

export function numToWords(n) {
  const numVal = Math.floor(Math.abs(n));
  if (numVal === 0) return 'Zero';
  if (numVal < 20) return ones[numVal];
  if (numVal < 100) return tens[Math.floor(numVal / 10)] + (numVal % 10 ? ' ' + ones[numVal % 10] : '');
  if (numVal < 1000) return ones[Math.floor(numVal / 100)] + ' Hundred' + (numVal % 100 ? ' ' + numToWords(numVal % 100) : '');
  return convertIndianGroup(numVal);
}

export function amountToWords(amount) {
  const val = Number(amount) || 0;
  if (val === 0) return 'Rupees Zero Only';
  const prefix = val < 0 ? 'Negative ' : '';
  const absVal = Math.abs(val);
  const rupees = Math.floor(absVal);
  const paise = Math.round((absVal - rupees) * 100);

  let result = prefix + 'Rupees ' + numToWords(rupees);
  if (paise > 0) {
    result += ' and ' + numToWords(paise) + ' Paise';
  }
  result += ' Only';
  return result;
}

/**
 * Pure calculation function for payslip generation.
 */
export function calculatePayslip({
  annualCtc = 0,
  monthlyCtc = null,
  fixedMonthlyGross = null,
  basicPct = 40,
  fixedBasic = null,
  hraPct = 50,
  capPf = true,
  optPf = true,
  regime = 'new',
  state = 'Karnataka',
  customTds = null,
  hasDisability = false,
  daysInMonth = 30,
  paidDays = null,
  employee = {},
  company = {},
}) {
  const totalDays = Math.max(1, Number(daysInMonth) || 30);
  const effectivePaidDays = paidDays === null || paidDays === undefined
    ? totalDays
    : Math.min(totalDays, Math.max(0, Number(paidDays) || 0));
  const proration = effectivePaidDays / totalDays;
  const lopDays = Math.max(0, totalDays - effectivePaidDays);

  let totalAnnual = monthlyCtc ? monthlyCtc * 12 : Math.max(0, Number(annualCtc) || 0);
  if (fixedMonthlyGross !== null) {
    totalAnnual = fixedMonthlyGross * 12;
  }

  // Basic calculation
  const basicAnnual = fixedBasic !== null ? fixedBasic * 12 : (totalAnnual * Math.max(0, Number(basicPct) || 0)) / 100;
  const fullMonthlyBasic = basicAnnual / 12;

  // EPF Calculation
  let monthlyPf = 0;
  if (optPf) {
    monthlyPf = capPf
      ? Math.min(fullMonthlyBasic, STATUTORY_LIMITS.EPF.statutoryCeilingMonthly) * STATUTORY_LIMITS.EPF.employeeRate
      : fullMonthlyBasic * STATUTORY_LIMITS.EPF.employeeRate;
  }
  const annualPf = monthlyPf * 12;
  const annualEmployerPf = annualPf;

  // HRA calculation
  const annualHra = (basicAnnual * Math.max(0, Number(hraPct) || 0)) / 100;
  const fullMonthlyHra = annualHra / 12;

  // Monthly gross calculation
  const grossCashAnnual = fixedMonthlyGross !== null
    ? fixedMonthlyGross * 12
    : Math.max(0, totalAnnual - annualEmployerPf);
  const fullMonthlyGross = fixedMonthlyGross !== null ? fixedMonthlyGross : grossCashAnnual / 12;

  // Prorated components
  const monthlyGross = fullMonthlyGross * proration;
  const monthlyBasic = fullMonthlyBasic * proration;
  const monthlyHra = fullMonthlyHra * proration;
  const monthlyAllowances = Math.max(0, monthlyGross - monthlyBasic - monthlyHra);

  // Prorated EPF
  const proratedPf = optPf
    ? (capPf
      ? Math.min(monthlyBasic, STATUTORY_LIMITS.EPF.statutoryCeilingMonthly) * STATUTORY_LIMITS.EPF.employeeRate
      : monthlyBasic * STATUTORY_LIMITS.EPF.employeeRate)
    : 0;

  // ESI: applies when monthly gross is <= 21,000 (or 25,000 for disability)
  const esiCeiling = hasDisability
    ? STATUTORY_LIMITS.ESI.disabilityWageCeilingMonthly
    : STATUTORY_LIMITS.ESI.statutoryWageCeilingMonthly;
  let monthlyEsi = 0;
  let monthlyEmployerEsi = 0;
  if (monthlyGross <= esiCeiling && monthlyGross > 0) {
    monthlyEsi = Math.round(monthlyGross * STATUTORY_LIMITS.ESI.employeeRate);
    monthlyEmployerEsi = Math.round(monthlyGross * STATUTORY_LIMITS.ESI.employerRate);
  }

  // Professional Tax (Karnataka: ₹200/mo if gross >= ₹25,000)
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
    const taxableSalary = Math.max(0, (monthlyGross * 12) - standardDeduction);
    annualTds = calculateTaxSlabs(taxableSalary, regime);
  }
  const monthlyTds = Math.round(annualTds / 12);

  const totalDeductions = Math.round(proratedPf + monthlyEsi + monthlyPt + monthlyTds);
  const roundedGross = Math.round(monthlyGross);
  const netSalary = Math.max(0, roundedGross - totalDeductions);

  return {
    annualCtc: totalAnnual,
    monthlyGross: roundedGross,
    basic: Math.round(monthlyBasic),
    hra: Math.round(monthlyHra),
    allowances: Math.round(monthlyAllowances),
    employeePf: Math.round(proratedPf),
    employerPf: Math.round(proratedPf),
    employeeEsi: monthlyEsi,
    employerEsi: monthlyEmployerEsi,
    professionalTax: monthlyPt,
    tds: monthlyTds,
    totalDeductions,
    netSalary,
    formattedNetSalary: money(netSalary),
    formattedGross: formatINR(roundedGross),
    formattedBasic: formatINR(Math.round(monthlyBasic)),
    formattedHra: formatINR(Math.round(monthlyHra)),
    formattedAllowances: formatINR(Math.round(monthlyAllowances)),
    formattedTotalDeductions: formatINR(totalDeductions),
    netSalaryInWords: amountToWords(netSalary),
    daysInMonth: totalDays,
    paidDays: effectivePaidDays,
    lopDays,
    proration,
    employee: {
      name: employee.name || 'Alex Morgan',
      id: employee.id || 'EMP-1001',
      designation: employee.designation || 'Software Engineer',
      department: employee.department || 'Engineering',
      dateOfJoining: employee.dateOfJoining || '2024-01-15',
      bankName: employee.bankName || 'HDFC Bank',
      accountNumber: employee.accountNumber || '50100234567890',
      pan: employee.pan || 'ABCDE1234F',
      uan: employee.uan || '101234567890',
      ...employee,
    },
    company: {
      name: company.name || 'WorkOrbit Technologies Pvt Ltd',
      address: company.address || 'Prestige Tech Park, Marathahalli, Bengaluru, Karnataka 560103',
      monthYear: company.monthYear || 'October 2026',
      ...company,
    },
  };
}
