/**
 * Turn a deal-level list (one row per deal) into the stage summary used by the pipeline.
 * Each deal can carry its own win rate. A deal without one uses the stage's default rate.
 * The stage win rate is value-weighted, so the weighted pipeline stays exact.
 */
export const DEAL_ALIASES = {
  name: ['deal', 'dealname', 'name', 'opportunity', 'opportunityname'],
  stage: ['stage', 'status', 'pipelinestage'],
  value: ['value', 'amount', 'dealvalue', 'dealsize', 'size'],
  winRate: ['winrate', 'winratepct', 'probability', 'chance', 'prob'],
};

const toNumber = (v) => {
  const text = String(v ?? '').trim();
  if (text === '') return null; // blank is missing, not zero
  const n = Number(text.replace(/[, ₹$%]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export function aggregateDeals({ deals, stageNames, defaultRates }) {
  const warnings = [];
  const lookup = Object.fromEntries(stageNames.map(s => [s.toLowerCase(), s]));
  const acc = Object.fromEntries(stageNames.map(s => [s, { deals: 0, valueSum: 0, weightedSum: 0 }]));

  deals.forEach((d, i) => {
    const label = d.name || `Row ${i + 1}`;
    const stage = lookup[String(d.stage ?? '').trim().toLowerCase()];
    if (!stage) {
      warnings.push(`${label}: stage "${d.stage ?? ''}" is not one of ${stageNames.join(', ')}. Skipped.`);
      return;
    }
    const value = toNumber(d.value);
    if (value === null || value < 0) {
      warnings.push(`${label}: value is missing or not a number. Skipped.`);
      return;
    }
    const rawRate = toNumber(d.winRate);
    const rate = rawRate !== null ? rawRate : (defaultRates[stage] ?? 0);
    const clamped = Math.min(100, Math.max(0, rate));
    acc[stage].deals += 1;
    acc[stage].valueSum += value;
    acc[stage].weightedSum += value * clamped;
  });

  const stages = Object.fromEntries(stageNames.map(s => {
    const a = acc[s];
    const avgValue = a.deals ? a.valueSum / a.deals : 0;
    const winRatePct = a.valueSum > 0 ? a.weightedSum / a.valueSum : (defaultRates[s] ?? 0);
    return [s, { deals: a.deals, avgValue, winRatePct }];
  }));
  return { stages, warnings };
}
