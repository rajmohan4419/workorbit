/**
 * PF and ESI Statutory Calculator Engine (India)
 * Table-driven statutory ceilings and contribution rates.
 * Zero hardcoded magic numbers in calculation logic.
 */

import { formatINR } from '../../lib/toolFormat.js';

export const PF_STATUTORY_CONFIG = Object.freeze({
  wageCeilingMonthly: 15000,      // Statutory wage ceiling for EPF/EPS (₹15,000/mo)
  employeeEpfRate: 0.12,          // 12% employee contribution
  employerTotalEpfRate: 0.12,     // 12% employer total share
  employerEpsRate: 0.0833,        // 8.33% employer share diverted to EPS
  employerEpfDiffRate: 0.0367,    // 3.67% employer net share to EPF
  maxCappedEmployeeMonthly: 1800, // 12% of 15,000 = max ₹1,800
  maxCappedEpsMonthly: 1250,      // 8.33% of 15,000 = max ₹1,250
  edliRate: 0.005,                // 0.5% EDLI insurance contribution
  maxCappedEdliMonthly: 75,       // 0.5% of 15,000 = max ₹75
  adminChargesRate: 0.005,        // 0.50% EPF Admin charges
  minAdminChargeMonthly: 500,     // ₹500 minimum establishment admin charge
});

export const ESI_STATUTORY_CONFIG = Object.freeze({
  statutoryWageCeilingMonthly: 21000,  // Standard ESI wage ceiling (₹21,000/mo)
  disabilityWageCeilingMonthly: 25000, // ESI ceiling for employees with disabilities (₹25,000/mo)
  employeeRate: 0.0075,                // 0.75% employee contribution
  employerRate: 0.0325,                // 3.25% employer contribution
  totalRate: 0.0400,                   // 4.00% total contribution
  dailyWageExemption: 176,             // Daily average wage exempt from employee share
});

/**
 * Pure calculation function for PF and ESI statutory contributions.
 */
export function calculatePfEsi({
  basicSalary = 0,
  grossSalary = null,
  capPf = true,
  hasDisability = false,
  dailyWage = null,
  pfConfig = PF_STATUTORY_CONFIG,
  esiConfig = ESI_STATUTORY_CONFIG,
}) {
  const basic = Math.max(0, Number(basicSalary) || 0);
  const gross = grossSalary !== null ? Math.max(0, Number(grossSalary) || 0) : basic;

  // 1. EPF Calculations
  const epfEligibleWage = capPf
    ? Math.min(basic, pfConfig.wageCeilingMonthly)
    : basic;

  const employeePf = capPf && basic >= pfConfig.wageCeilingMonthly
    ? pfConfig.maxCappedEmployeeMonthly
    : Math.round(epfEligibleWage * pfConfig.employeeEpfRate);

  // Employer EPS (pension) is always capped at the statutory ceiling (₹15,000)
  const epsBaseWage = Math.min(basic, pfConfig.wageCeilingMonthly);
  const employerEps = Math.min(
    pfConfig.maxCappedEpsMonthly,
    Math.round(epsBaseWage * pfConfig.employerEpsRate)
  );

  // Employer EPF is the remainder of 12% minus EPS
  const totalEmployerEpf = Math.round(epfEligibleWage * pfConfig.employerTotalEpfRate);
  const employerEpf = Math.max(0, totalEmployerEpf - employerEps);

  // EDLI (0.5% capped at ₹75)
  const employerEdli = Math.min(
    pfConfig.maxCappedEdliMonthly,
    Math.round(epsBaseWage * pfConfig.edliRate)
  );

  // Admin charges (0.5% on EPF wage)
  const employerAdmin = Math.round(epfEligibleWage * pfConfig.adminChargesRate);

  const totalEmployerPfRemittance = employerEpf + employerEps + employerEdli + employerAdmin;
  const totalPfRemittance = employeePf + totalEmployerPfRemittance;

  // 2. ESI Calculations
  const esiCeiling = hasDisability
    ? esiConfig.disabilityWageCeilingMonthly
    : esiConfig.statutoryWageCeilingMonthly;

  const isEsiEligible = gross > 0 && gross <= esiCeiling;

  let employeeEsi = 0;
  let employerEsi = 0;

  if (isEsiEligible) {
    const isExemptFromEmployeeShare = dailyWage !== null && Number(dailyWage) <= esiConfig.dailyWageExemption;
    employeeEsi = isExemptFromEmployeeShare ? 0 : Math.round(gross * esiConfig.employeeRate);
    employerEsi = Math.round(gross * esiConfig.employerRate);
  }

  const totalEsiRemittance = employeeEsi + employerEsi;

  // Totals
  const totalEmployeeDeductions = employeePf + employeeEsi;
  const totalEmployerContribution = totalEmployerPfRemittance + employerEsi;
  const totalStatutoryRemittance = totalPfRemittance + totalEsiRemittance;

  return {
    basicSalary: basic,
    grossSalary: gross,
    capPf,
    hasDisability,

    // EPF Breakdown
    epfEligibleWage,
    employeePf,
    employerEpf,
    employerEps,
    employerEdli,
    employerAdmin,
    totalEmployerPfRemittance,
    totalPfRemittance,

    // ESI Breakdown
    isEsiEligible,
    esiCeiling,
    employeeEsi,
    employerEsi,
    totalEsiRemittance,

    // Aggregates
    totalEmployeeDeductions,
    totalEmployerContribution,
    totalStatutoryRemittance,
    netPayAfterStatutory: Math.max(0, gross - totalEmployeeDeductions),

    // Formatted strings
    formattedBasic: formatINR(basic),
    formattedGross: formatINR(gross),
    formattedEmployeePf: formatINR(employeePf),
    formattedEmployerPf: formatINR(employerEpf),
    formattedEmployerEps: formatINR(employerEps),
    formattedEmployerEdli: formatINR(employerEdli),
    formattedEmployeeEsi: formatINR(employeeEsi),
    formattedEmployerEsi: formatINR(employerEsi),
    formattedTotalEmployeeDeductions: formatINR(totalEmployeeDeductions),
    formattedTotalEmployerContribution: formatINR(totalEmployerContribution),
    formattedTotalStatutoryRemittance: formatINR(totalStatutoryRemittance),
  };
}
