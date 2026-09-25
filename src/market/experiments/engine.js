/**
 * OrbitBoard Market Experiment Engine
 *
 * Deterministic, provider-agnostic experiment execution.
 * AI may create an experiment definition later, but this module is the
 * source of truth for evaluating it.
 */

const OPERATORS = {
  '>': (left, right) => left > right,
  '>=': (left, right) => left >= right,
  '<': (left, right) => left < right,
  '<=': (left, right) => left <= right,
  '==': (left, right) => left === right,
  '!=': (left, right) => left !== right
};

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const round = (value, decimals = 10) => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const percentageChange = (current, previous) => {
  if (!isFiniteNumber(current) || !isFiniteNumber(previous) || Number(previous) === 0) return null;
  return ((Number(current) - Number(previous)) / Number(previous)) * 100;
};

const average = (values) => {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
};

const median = (values) => {
  const valid = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!valid.length) return null;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2;
};

const quantile = (values, q) => {
  const valid = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!valid.length) return null;
  const position = (valid.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return valid[lower];
  return valid[lower] + (valid[upper] - valid[lower]) * (position - lower);
};

const validateDefinition = (definition) => {
  if (!definition || typeof definition !== 'object') {
    throw new Error('Experiment definition is required.');
  }

  if (!definition.trigger?.all?.length) {
    throw new Error('Experiment requires at least one trigger condition.');
  }

  for (const condition of definition.trigger.all) {
    if (!condition.metric || !OPERATORS[condition.operator]) {
      throw new Error(`Unsupported trigger condition: ${JSON.stringify(condition)}`);
    }
    if (!isFiniteNumber(condition.value)) {
      throw new Error(`Trigger value must be numeric: ${JSON.stringify(condition)}`);
    }
  }

  const windows = definition.forwardWindows ?? [1, 5, 20];
  if (!Array.isArray(windows) || windows.some((window) => !Number.isInteger(window) || window <= 0)) {
    throw new Error('forwardWindows must contain positive integers.');
  }

  return true;
};

const metricValue = (rows, index, metric) => {
  const current = rows[index];
  const previous = rows[index - 1];

  switch (metric) {
    case 'daily_return':
      return percentageChange(current?.close, previous?.close);

    case 'volume_ratio': {
      if (!previous) return null;
      const baselineRows = rows.slice(Math.max(0, index - 30), index);
      const baseline = average(baselineRows.map((row) => Number(row.volume)));
      return baseline ? Number(current.volume) / baseline : null;
    }

    case 'open_interest_change':
      return percentageChange(current?.openInterest, previous?.openInterest);

    case 'price':
      return Number(current?.close);

    case 'volume':
      return Number(current?.volume);

    case 'open_interest':
      return Number(current?.openInterest);

    default:
      return null;
  }
};

const conditionMatches = (rows, index, condition) => {
  const actual = metricValue(rows, index, condition.metric);
  if (!Number.isFinite(actual)) return false;
  return OPERATORS[condition.operator](actual, Number(condition.value));
};

const findForwardRow = (rows, index, window) => rows[index + window] ?? null;

const buildObservation = (rows, index, window, benchmarkRows) => {
  const current = rows[index];
  const exit = findForwardRow(rows, index, window);
  if (!current || !exit) return null;

  const forwardReturn = percentageChange(exit.close, current.close);
  const benchmarkAtTrigger = benchmarkRows?.[index];
  const benchmarkAtExit = benchmarkRows?.[index + window];
  const benchmarkReturn = benchmarkAtTrigger && benchmarkAtExit
    ? percentageChange(benchmarkAtExit.close, benchmarkAtTrigger.close)
    : null;

  return {
    triggerDate: current.date,
    forwardDate: exit.date,
    triggerClose: Number(current.close),
    forwardClose: Number(exit.close),
    forwardReturn: round(forwardReturn),
    benchmarkReturn: round(benchmarkReturn),
    excessReturn: round(
      Number.isFinite(forwardReturn) && Number.isFinite(benchmarkReturn)
        ? forwardReturn - benchmarkReturn
        : null
    ),
    outcome: forwardReturn == null
      ? 'unknown'
      : forwardReturn > 0
        ? 'positive'
        : forwardReturn < 0
          ? 'negative'
          : 'flat'
  };
};

const summarize = (observations) => {
  const returns = observations.map((item) => item.forwardReturn).filter(Number.isFinite);
  const benchmarkReturns = observations.map((item) => item.benchmarkReturn).filter(Number.isFinite);
  const excessReturns = observations.map((item) => item.excessReturn).filter(Number.isFinite);

  const positive = observations.filter((item) => item.outcome === 'positive').length;
  const negative = observations.filter((item) => item.outcome === 'negative').length;
  const flat = observations.filter((item) => item.outcome === 'flat').length;

  return {
    observations: observations.length,
    positive,
    negative,
    flat,
    positiveRate: observations.length ? round((positive / observations.length) * 100, 4) : null,
    averageReturn: round(average(returns)),
    medianReturn: round(median(returns)),
    medianBenchmarkReturn: round(median(benchmarkReturns)),
    medianExcessReturn: round(median(excessReturns)),
    minReturn: round(returns.length ? Math.min(...returns) : null),
    maxReturn: round(returns.length ? Math.max(...returns) : null),
    returnP25: round(quantile(returns, 0.25)),
    returnP75: round(quantile(returns, 0.75))
  };
};

/**
 * Run one experiment against already-normalized daily rows.
 *
 * rows: [{ date, open, high, low, close, volume, openInterest }]
 * benchmarkRows: optional rows aligned by date with the same shape.
 */
export function runExperiment({ rows, benchmarkRows = null, definition }) {
  validateDefinition(definition);

  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error('At least two market observations are required.');
  }

  const sortedRows = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const sortedBenchmark = benchmarkRows
    ? [...benchmarkRows].sort((a, b) => a.date.localeCompare(b.date))
    : null;

  const windows = definition.forwardWindows ?? [1, 5, 20];
  const results = {};

  for (const window of windows) {
    const observations = [];

    for (let index = 1; index < sortedRows.length - window; index += 1) {
      const matches = definition.trigger.all.every((condition) =>
        conditionMatches(sortedRows, index, condition)
      );

      if (!matches) continue;

      const observation = buildObservation(
        sortedRows,
        index,
        window,
        sortedBenchmark
      );

      if (observation) observations.push(observation);
    }

    results[window] = {
      window,
      ...summarize(observations),
      observations
    };
  }

  return {
    definition,
    results,
    generatedAt: new Date().toISOString()
  };
}

export { median, percentageChange, validateDefinition };
