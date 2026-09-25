import { runExperiment } from './engine';

const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const summarize = (observations) => {
  const returns = observations.map((item) => item.forwardReturn).filter(Number.isFinite);
  const positive = returns.filter((value) => value > 0).length;
  return {
    observations: returns.length,
    positiveRate: returns.length ? (positive / returns.length) * 100 : null,
    averageReturn: average(returns),
    medianReturn: returns.length ? [...returns].sort((a, b) => a - b)[Math.floor(returns.length / 2)] : null
  };
};

const splitByCalendarYear = (rows) => {
  const groups = new Map();
  rows.forEach((row) => {
    const year = row.date.slice(0, 4);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(row);
  });
  return [...groups.entries()].map(([label, group]) => ({ label: `Year ${label}`, rows: group }));
};

const splitByMarketDirection = (rows) => {
  const groups = { Rising: [], Falling: [] };
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const row = rows[index];
    if (row.close >= previous.close) groups.Rising.push(row);
    else groups.Falling.push(row);
  }
  return Object.entries(groups).map(([label, group]) => ({ label, rows: group }));
};

export function runRegimeAnalysis({ rows, definition }) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const window = definition.forwardWindows?.[0] ?? 5;
  const experiments = [
    { id: 'calendar', label: 'Calendar periods', groups: splitByCalendarYear(sorted) },
    { id: 'direction', label: 'Session direction', groups: splitByMarketDirection(sorted) }
  ];

  const analyses = experiments.map((experiment) => ({
    id: experiment.id,
    label: experiment.label,
    groups: experiment.groups.map((group) => {
      const result = runExperiment({ rows: group.rows, definition }).results[window];
      return { label: group.label, ...summarize(result.observations) };
    })
  }));

  return {
    window,
    analyses,
    methodology: 'Regime slices are descriptive subgroup analyses. They do not establish causation and may become unstable when subgroup sample sizes are small.'
  };
}
