export const COMPOUND_FREQUENCIES = [
  { label: 'Yearly', value: 1 },
  { label: 'Half-yearly', value: 2 },
  { label: 'Quarterly', value: 4 },
  { label: 'Monthly', value: 12 },
  { label: 'Daily', value: 365 },
];

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Compound interest: A = P * (1 + r/n)^(n*t)
 * Returns the maturity amount, interest earned and the effective annual rate.
 */
export function computeCompoundInterest({ principal, annualRatePct, years, timesPerYear }) {
  const P = safeNumber(principal);
  const r = safeNumber(annualRatePct) / 100;
  const t = safeNumber(years);
  const n = Math.max(1, Math.round(safeNumber(timesPerYear)) || 1);

  const amount = P * Math.pow(1 + r / n, n * t);
  const interest = amount - P;
  const effectiveRatePct = (Math.pow(1 + r / n, n) - 1) * 100;

  return { amount, interest, effectiveRatePct };
}
