import { runExperiment } from './engine';

const sameTriggerDateSet = (observations) => new Set(observations.map((item) => item.triggerDate));

const summarizeReturns = (observations) => {
  const returns = observations.map((item) => item.forwardReturn).filter(Number.isFinite);
  if (!returns.length) return { observations: 0, averageReturn: null, medianReturn: null, positiveRate: null };

  const sorted = [...returns].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const medianReturn = sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;

  return {
    observations: returns.length,
    averageReturn: returns.reduce((sum, value) => sum + value, 0) / returns.length,
    medianReturn,
    positiveRate: (returns.filter((value) => value > 0).length / returns.length) * 100
  };
};

const buildForwardObservation = (rows, index, window) => {
  const current = rows[index];
  const exit = rows[index + window];
  if (!current || !exit) return null;

  const forwardReturn = current.close === 0
    ? null
    : ((exit.close - current.close) / current.close) * 100;

  return {
    triggerDate: current.date,
    forwardDate: exit.date,
    triggerClose: Number(current.close),
    forwardClose: Number(exit.close),
    forwardReturn
  };
};

/**
 * Compare matching trigger cases with non-triggering control cases.
 *
 * Control cases are selected deterministically from eligible non-trigger dates,
 * using a simple chronological spacing rule. This is a prototype control group,
 * not propensity matching or a causal inference method.
 */
export function runControlComparison({ rows, definition, controlRatio = 1 }) {
  const sortedRows = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const window = definition.forwardWindows?.[0] ?? 5;
  const triggerDates = sameTriggerDateSet(
    runExperiment({ rows: sortedRows, definition }).results[window].observations
  );

  const eligible = [];
  const controls = [];

  for (let index = 1; index < sortedRows.length - window; index += 1) {
    const row = sortedRows[index];
    if (!triggerDates.has(row.date)) eligible.push(index);
  }

  const targetCount = Math.min(triggerDates.size * controlRatio, eligible.length);
  if (targetCount > 0) {
    const step = eligible.length / targetCount;
    for (let i = 0; i < targetCount; i += 1) {
      controls.push(eligible[Math.min(eligible.length - 1, Math.floor(i * step))]);
    }
  }

  const controlObservations = controls
    .map((index) => buildForwardObservation(sortedRows, index, window))
    .filter(Boolean);

  const triggerObservations = sortedRows
    .map((_, index) => index)
    .filter((index) => triggerDates.has(sortedRows[index].date))
    .map((index) => buildForwardObservation(sortedRows, index, window))
    .filter(Boolean);

  const triggerSummary = summarizeReturns(triggerObservations);
  const controlSummary = summarizeReturns(controlObservations);

  return {
    window,
    trigger: {
      ...triggerSummary,
      observations: triggerObservations
    },
    control: {
      ...controlSummary,
      observations: controlObservations
    },
    comparison: {
      medianReturnDelta: Number.isFinite(triggerSummary.medianReturn) && Number.isFinite(controlSummary.medianReturn)
        ? triggerSummary.medianReturn - controlSummary.medianReturn
        : null,
      averageReturnDelta: Number.isFinite(triggerSummary.averageReturn) && Number.isFinite(controlSummary.averageReturn)
        ? triggerSummary.averageReturn - controlSummary.averageReturn
        : null,
      positiveRateDelta: Number.isFinite(triggerSummary.positiveRate) && Number.isFinite(controlSummary.positiveRate)
        ? triggerSummary.positiveRate - controlSummary.positiveRate
        : null
    },
    methodology: 'Deterministic chronological control selection from non-triggering observations. This is a comparison aid, not a causal inference method.'
  };
}
