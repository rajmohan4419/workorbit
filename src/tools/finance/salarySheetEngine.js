/**
 * Salary Sheet Engine (India)
 * Generates monthly payroll sheet for a team with attendance proration,
 * statutory deductions (EPF, ESI, PT, TDS), aggregates, and Excel XLSX export.
 */

import { formatINR } from '../../lib/toolFormat.js';
import { STATUTORY_LIMITS } from './payslipEngine.js';

export const SAMPLE_TEAM = Object.freeze([
  { id: 'EMP01', name: 'Aarav Patel', designation: 'Engineering Lead', monthlyGross: 180000, paidDays: 30, optPf: true, tds: 15000 },
  { id: 'EMP02', name: 'Neha Sharma', designation: 'Senior Developer', monthlyGross: 120000, paidDays: 28, optPf: true, tds: 8000 },
  { id: 'EMP03', name: 'Vikram Singh', designation: 'Junior Developer', monthlyGross: 40000, paidDays: 15, optPf: true, tds: 0 },
  { id: 'EMP04', name: 'Pooja Iyer', designation: 'QA Intern', monthlyGross: 20000, paidDays: 30, optPf: false, tds: 0 },
]);

/**
 * Pure calculation function for team salary sheet.
 */
export function generateSalarySheet({
  employees = [],
  daysInMonth = 30,
  companyName = 'WorkOrbit Technologies Pvt Ltd',
  monthYear = 'October 2026',
}) {
  const totalMonthDays = Math.max(1, Number(daysInMonth) || 30);

  let totalGross = 0;
  let totalBasic = 0;
  let totalPf = 0;
  let totalEsi = 0;
  let totalPt = 0;
  let totalTds = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  const rows = employees.map((emp, idx) => {
    const rawPaidDays = emp.paidDays !== undefined && emp.paidDays !== null ? Number(emp.paidDays) : totalMonthDays;
    const paidDays = Math.min(totalMonthDays, Math.max(0, isNaN(rawPaidDays) ? totalMonthDays : rawPaidDays));
    const proration = paidDays / totalMonthDays;

    const baseGross = Math.max(0, Number(emp.monthlyGross) || 0);
    const proratedGross = Math.round(baseGross * proration);

    const baseBasic = Math.round(proratedGross * 0.40);
    const pf = emp.optPf === false
      ? 0
      : Math.round(Math.min(baseBasic, STATUTORY_LIMITS.EPF.statutoryCeilingMonthly) * STATUTORY_LIMITS.EPF.employeeRate);

    let esi = 0;
    if (proratedGross <= STATUTORY_LIMITS.ESI.statutoryWageCeilingMonthly && proratedGross > 0) {
      esi = Math.round(proratedGross * STATUTORY_LIMITS.ESI.employeeRate);
    }

    const pt = proratedGross >= 25000 ? 200 : 0;
    const tds = Math.max(0, Number(emp.tds) || 0);

    const deductions = pf + esi + pt + tds;
    const net = Math.max(0, proratedGross - deductions);

    totalGross += proratedGross;
    totalBasic += baseBasic;
    totalPf += pf;
    totalEsi += esi;
    totalPt += pt;
    totalTds += tds;
    totalDeductions += deductions;
    totalNet += net;

    return {
      employeeId: emp.id || `EMP${String(idx + 1).padStart(3, '0')}`,
      name: emp.name || `Employee ${idx + 1}`,
      designation: emp.designation || 'Staff',
      baseGross,
      paidDays,
      proration,
      proratedGross,
      basic: baseBasic,
      pf,
      esi,
      pt,
      tds,
      totalDeductions: deductions,
      netSalary: net,
      formattedProratedGross: formatINR(proratedGross),
      formattedPf: formatINR(pf),
      formattedEsi: formatINR(esi),
      formattedPt: formatINR(pt),
      formattedTds: formatINR(tds),
      formattedTotalDeductions: formatINR(deductions),
      formattedNetSalary: formatINR(net),
    };
  });

  return {
    companyName,
    monthYear,
    daysInMonth: totalMonthDays,
    employeeCount: rows.length,
    totalGross,
    totalBasic,
    totalPf,
    totalEsi,
    totalPt,
    totalTds,
    totalDeductions,
    totalNet,
    formattedTotalGross: formatINR(totalGross),
    formattedTotalPf: formatINR(totalPf),
    formattedTotalEsi: formatINR(totalEsi),
    formattedTotalPt: formatINR(totalPt),
    formattedTotalTds: formatINR(totalTds),
    formattedTotalDeductions: formatINR(totalDeductions),
    formattedTotalNet: formatINR(totalNet),
    rows,
  };
}
