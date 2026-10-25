const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Weighted sales pipeline.
 * stages: [{ name, deals, avgValue, winRatePct }]
 * Expected revenue per stage = deals x avgValue x win rate.
 */
export function computePipeline({ stages = [], quota }) {
  const target = num(quota);
  let totalValue = 0;
  let weightedValue = 0;
  let expectedDeals = 0;

  const perStage = stages.map((s) => {
    const deals = num(s.deals);
    const value = deals * num(s.avgValue);
    const rate = Math.min(100, num(s.winRatePct)) / 100;
    const weighted = value * rate;
    totalValue += value;
    weightedValue += weighted;
    expectedDeals += deals * rate;
    return { name: s.name, value, weighted };
  });

  const gap = target > 0 ? Math.max(0, target - weightedValue) : null;
  const coverage = target > 0 ? totalValue / target : null;

  return { totalValue, weightedValue, expectedDeals, gap, coverage, perStage };
}
