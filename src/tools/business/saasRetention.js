/**
 * SaaS retention and unit economics for a 12-month period.
 * All money inputs must be in the same currency. Percentages are returned as 0-100 numbers.
 * Benchmarks are rough guides, not targets, and vary by segment and stage.
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : null);

export function computeSaasRetention({
  startMrr,
  expansionMrr,
  contractionMrr,
  churnedMrr,
  startCustomers,
  churnedCustomers,
  acquisitionSpend,
  newCustomers,
  arpaMonthly,
  grossMarginPct,
}) {
  const start = num(startMrr);
  const expansion = num(expansionMrr);
  const contraction = num(contractionMrr);
  const churned = num(churnedMrr);
  const customers = num(startCustomers);
  const lost = num(churnedCustomers);
  const spend = num(acquisitionSpend);
  const added = num(newCustomers);
  const arpa = num(arpaMonthly);
  const margin = Math.min(100, num(grossMarginPct)) / 100;

  const warnings = [];
  if (contraction + churned > start && start > 0) {
    warnings.push('Downgrades and churned MRR together exceed starting MRR. Check the inputs.');
  }
  if (lost > customers && customers > 0) {
    warnings.push('Churned customers exceed starting customers. Check the inputs.');
  }

  const nrr = pct(start + expansion - contraction - churned, start);
  const grr = pct(Math.max(0, start - contraction - churned), start);
  const logoChurnPct = pct(lost, customers);

  // Convert the 12-month logo churn to a monthly rate for the lifetime estimate.
  const monthlyChurnRate = logoChurnPct === null ? null : 1 - Math.pow(1 - logoChurnPct / 100, 1 / 12);
  const monthlyGrossProfit = arpa * margin;

  const cac = added > 0 ? spend / added : null;
  const ltv = monthlyChurnRate && monthlyChurnRate > 0 && monthlyGrossProfit > 0
    ? monthlyGrossProfit / monthlyChurnRate
    : null;
  const ltvToCac = ltv !== null && cac ? ltv / cac : null;
  const paybackMonths = cac !== null && monthlyGrossProfit > 0 ? cac / monthlyGrossProfit : null;

  return {
    nrr,
    grr,
    logoChurnPct,
    monthlyChurnPct: monthlyChurnRate === null ? null : monthlyChurnRate * 100,
    cac,
    ltv,
    ltvToCac,
    paybackMonths,
    warnings,
  };
}

/** Rough reading of each metric against common SaaS rules of thumb. */
export function rateMetric(metric, value) {
  if (value === null || value === undefined) return 'na';
  switch (metric) {
    case 'nrr':
      return value >= 100 ? 'good' : value >= 90 ? 'ok' : 'weak';
    case 'grr':
      return value >= 90 ? 'good' : value >= 80 ? 'ok' : 'weak';
    case 'ltvToCac':
      return value >= 3 ? 'good' : value >= 1 ? 'ok' : 'weak';
    case 'coverage':
      return value >= 3 ? 'good' : value >= 2 ? 'ok' : 'weak';
    case 'paybackMonths':
      return value <= 12 ? 'good' : value <= 18 ? 'ok' : 'weak';
    default:
      return 'na';
  }
}
