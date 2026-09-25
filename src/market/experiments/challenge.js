import { runExperiment } from './engine';

const withCondition = (definition, condition) => ({
  ...definition,
  trigger: { ...definition.trigger, all: [...definition.trigger.all, condition] }
});

const withoutCondition = (definition, index) => ({
  ...definition,
  trigger: {
    ...definition.trigger,
    all: definition.trigger.all.filter((_, conditionIndex) => conditionIndex !== index)
  }
});

const stressDefinitions = (definition) => {
  const conditions = definition.trigger.all;
  const variants = [
    { id: 'baseline', label: 'Baseline', definition },
    ...conditions.map((condition, index) => ({
      id: `without-${index + 1}`,
      label: `Remove condition ${index + 1}`,
      definition: withoutCondition(definition, index)
    })),
    ...conditions.flatMap((condition, index) => {
      const value = Number(condition.value);
      if (!Number.isFinite(value) || value === 0) return [];
      const shift = Math.abs(value) * 0.2;
      return [
        {
          id: `looser-${index + 1}`,
          label: `Loosen condition ${index + 1} by 20%`,
          definition: withCondition(
            { ...definition, trigger: { ...definition.trigger, all: conditions.filter((_, i) => i !== index) } },
            { ...condition, value: condition.operator.includes('<') ? value + shift : value - shift }
          )
        },
        {
          id: `stricter-${index + 1}`,
          label: `Tighten condition ${index + 1} by 20%`,
          definition: withCondition(
            { ...definition, trigger: { ...definition.trigger, all: conditions.filter((_, i) => i !== index) } },
            { ...condition, value: condition.operator.includes('<') ? value - shift : value + shift }
          )
        }
      ];
    })
  ];

  return variants;
};

export function runChallenge({ rows, definition, benchmarkRows = null }) {
  const variants = stressDefinitions(definition);
  const runs = variants.map((variant) => {
    const run = runExperiment({ rows, benchmarkRows, definition: variant.definition });
    const window = variant.definition.forwardWindows[0];
    const result = run.results[window];

    return {
      id: variant.id,
      label: variant.label,
      observations: result.observations,
      positiveRate: result.positiveRate,
      medianReturn: result.medianReturn,
      averageReturn: result.averageReturn,
      medianExcessReturn: result.medianExcessReturn
    };
  });

  const baseline = runs[0];
  const comparisons = runs.slice(1).map((run) => ({
    ...run,
    observationDelta: run.observations - baseline.observations,
    medianReturnDelta: Number.isFinite(run.medianReturn) && Number.isFinite(baseline.medianReturn)
      ? run.medianReturn - baseline.medianReturn
      : null
  }));

  return {
    baseline,
    comparisons,
    variants: runs,
    interpretation: buildInterpretation(baseline, comparisons)
  };
}

function buildInterpretation(baseline, comparisons) {
  if (!baseline.observations) {
    return 'The baseline produced no matching observations, so there is not enough evidence to stress-test the hypothesis.';
  }

  const surviving = comparisons.filter((item) => item.observations > 0);
  const returnChanges = surviving
    .map((item) => item.medianReturnDelta)
    .filter(Number.isFinite);

  const stable = returnChanges.length > 0 && returnChanges.every((change) => Math.abs(change) < 0.5);
  if (stable) {
    return 'The observed median return changed by less than 0.5 percentage points across the tested variants. This does not prove the hypothesis; it only indicates limited sensitivity in this synthetic sample.';
  }

  return 'The experiment changes when its conditions are loosened, tightened or removed. Treat the baseline result as conditional evidence rather than a standalone pattern.';
}
