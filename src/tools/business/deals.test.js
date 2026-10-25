import { describe, it, expect } from 'vitest';
import { aggregateDeals } from './deals';

const stageNames = ['Lead', 'Qualified'];

describe('aggregateDeals', () => {
  it('summarises deals per stage with a value-weighted win rate', () => {
    const { stages, warnings } = aggregateDeals({
      stageNames,
      defaultRates: { Lead: 10, Qualified: 25 },
      deals: [
        { name: 'a', stage: 'Lead', value: '1000', winRate: '20' },
        { name: 'b', stage: 'Lead', value: '3000', winRate: '40' },
        { name: 'c', stage: 'Qualified', value: '5000' },
      ],
    });
    expect(warnings).toEqual([]);
    expect(stages.Lead.deals).toBe(2);
    expect(stages.Lead.avgValue).toBe(2000);
    // (1000*20 + 3000*40) / 4000 = 35
    expect(stages.Lead.winRatePct).toBeCloseTo(35, 6);
    expect(stages.Qualified.winRatePct).toBeCloseTo(25, 6); // default rate
  });

  it('keeps the weighted pipeline exact: deals x avg x rate equals the sum of value x rate', () => {
    const { stages } = aggregateDeals({
      stageNames: ['Lead'],
      defaultRates: { Lead: 0 },
      deals: [{ stage: 'Lead', value: '1000', winRate: '20' }, { stage: 'Lead', value: '3000', winRate: '40' }],
    });
    const s = stages.Lead;
    expect(s.deals * s.avgValue * (s.winRatePct / 100)).toBeCloseTo(1000 * 0.2 + 3000 * 0.4, 6);
  });

  it('matches stage names regardless of case and reports unknown stages and bad values', () => {
    const { stages, warnings } = aggregateDeals({
      stageNames,
      defaultRates: { Lead: 10, Qualified: 10 },
      deals: [
        { name: 'ok', stage: 'lead', value: '100' },
        { name: 'nostage', stage: 'Won', value: '100' },
        { name: 'novalue', stage: 'Lead', value: 'abc' },
      ],
    });
    expect(stages.Lead.deals).toBe(1);
    expect(warnings).toHaveLength(2);
  });
});
