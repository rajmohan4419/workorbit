import { INFY_SYNTHETIC_DAILY } from './infySyntheticData';
import { runExperiment } from '../experiments/engine';

export const INFY_DEMO_EXPERIMENT = {
  universe: {
    type: 'security',
    symbols: ['INFY']
  },
  period: {
    from: INFY_SYNTHETIC_DAILY[0].date,
    to: INFY_SYNTHETIC_DAILY.at(-1).date
  },
  trigger: {
    all: [
      {
        metric: 'volume_ratio',
        operator: '>=',
        value: 1.75
      },
      {
        metric: 'open_interest_change',
        operator: '>=',
        value: 2
      }
    ]
  },
  forwardWindows: [1, 5, 20]
};

export function runInfySyntheticExperiment() {
  return runExperiment({
    rows: INFY_SYNTHETIC_DAILY,
    definition: INFY_DEMO_EXPERIMENT
  });
}
