/**
 * Market Lab — Volatility Risk Gate
 *
 * Detects unusually wide price ranges before a market signal is treated as clean.
 * This is a risk-control layer, not a prediction model.
 */

export const VOLATILITY_STATUS = Object.freeze({
  PASS: 'PASS',
  FLAGGED: 'FLAGGED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

export const DEFAULT_VOLATILITY_RULES = Object.freeze({
  windowDays: 365,
  rangeThresholdPct: 150,
  minimumObservations: 2
});

function numeric(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function dateOf(record) {
  return record.period?.end ?? record.period?.asOf ?? record.publishedAt ?? record.retrievedAt ?? null;
}

function entityKey(entity = {}) {
  return [entity.exchange ?? '', entity.symbol ?? ''].join('|');
}

function observationMap(records) {
  const byDate = new Map();

  for (const record of records) {
    const metric = record.metric?.key;
    if (!['high', 'low'].includes(metric)) continue;

    const value = numeric(record.value);
    const date = dateOf(record);
    if (value === null || value <= 0 || !date) continue;

    const entry = byDate.get(date) ?? { date, high: null, low: null };
    entry[metric] = value;
    byDate.set(date, entry);
  }

  return [...byDate.values()]
    .filter(item => numeric(item.high) !== null && numeric(item.low) !== null && item.high >= item.low)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function calculatePriceRangePct(observations) {
  if (!Array.isArray(observations) || observations.length === 0) return null;

  const maxHigh = Math.max(...observations.map(item => item.high));
  const minLow = Math.min(...observations.map(item => item.low));

  if (!Number.isFinite(maxHigh) || !Number.isFinite(minLow) || minLow <= 0) return null;

  return ((maxHigh - minLow) / minLow) * 100;
}

export function assessVolatilityRisk(records = [], entity = null, options = {}) {
  const rules = { ...DEFAULT_VOLATILITY_RULES, ...options };
  const scoped = entity
    ? records.filter(record => entityKey(record.entity) === entityKey(entity))
    : records;

  const observations = observationMap(scoped);

  if (observations.length < rules.minimumObservations) {
    return {
      status: VOLATILITY_STATUS.INSUFFICIENT_DATA,
      entity,
      windowDays: rules.windowDays,
      thresholdPct: rules.rangeThresholdPct,
      observationCount: observations.length,
      rangePct: null,
      maxHigh: null,
      minLow: null,
      windowStart: null,
      windowEnd: null,
      rationale: 'Volatility cannot be assessed because the required high/low observations are incomplete.'
    };
  }

  const latestDate = new Date(observations.at(-1).date);
  const cutoff = Number.isNaN(latestDate.getTime())
    ? null
    : new Date(latestDate.getTime() - (rules.windowDays * 24 * 60 * 60 * 1000));

  const windowed = cutoff
    ? observations.filter(item => {
        const date = new Date(item.date);
        return !Number.isNaN(date.getTime()) && date >= cutoff && date <= latestDate;
      })
    : observations;

  const usable = windowed.length >= rules.minimumObservations ? windowed : observations;
  const rangePct = calculatePriceRangePct(usable);
  const maxHigh = Math.max(...usable.map(item => item.high));
  const minLow = Math.min(...usable.map(item => item.low));
  const flagged = rangePct !== null && rangePct > rules.rangeThresholdPct;

  return {
    status: flagged ? VOLATILITY_STATUS.FLAGGED : VOLATILITY_STATUS.PASS,
    entity,
    windowDays: rules.windowDays,
    thresholdPct: rules.rangeThresholdPct,
    observationCount: usable.length,
    rangePct,
    maxHigh,
    minLow,
    windowStart: usable[0]?.date ?? null,
    windowEnd: usable.at(-1)?.date ?? null,
    rationale: flagged
      ? `Price range is ${rangePct.toFixed(2)}%, above the ${rules.rangeThresholdPct}% volatility-risk threshold; additional validation is required before treating the signal as clean.`
      : `Price range is ${rangePct.toFixed(2)}%, within the configured volatility-risk threshold.`
  };
}

export function assessVolatilityRiskForEntities(records = [], options = {}) {
  const entities = new Map();

  for (const record of records) {
    const key = entityKey(record.entity);
    if (!key || key === '|') continue;
    if (!entities.has(key)) entities.set(key, record.entity);
  }

  return [...entities.values()].map(entity => assessVolatilityRisk(records, entity, options));
}
