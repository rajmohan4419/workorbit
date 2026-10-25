// Indian banks usually compound recurring deposit interest quarterly.
export const RD_DEFAULT_FREQUENCY = 4;

const safe = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Recurring deposit maturity.
 * Each monthly instalment compounds from the month it is paid until maturity:
 * instalment k earns (1 + r/n)^(n * t), where t is the years it stays deposited.
 * This is an estimate; banks may round or apply their own rules.
 */
export function computeRdMaturity({ monthlyDeposit, annualRatePct, years, months, timesPerYear = RD_DEFAULT_FREQUENCY }) {
  const P = safe(monthlyDeposit);
  const r = safe(annualRatePct) / 100;
  const n = Math.max(1, Math.round(safe(timesPerYear)) || 1);
  const totalMonths = Math.round(safe(years) * 12 + safe(months));

  let maturity = 0;
  for (let k = 1; k <= totalMonths; k++) {
    const yearsHeld = (totalMonths - k + 1) / 12;
    maturity += P * Math.pow(1 + r / n, n * yearsHeld);
  }

  const invested = P * totalMonths;
  return { invested, maturity, interest: maturity - invested, totalMonths };
}
