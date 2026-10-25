import { describe, it, expect } from 'vitest';
import { computeDecisionMatrix } from './decisionMatrix';

describe('computeDecisionMatrix', () => {
  const criteria = [{ name: 'Price', weight: 3 }, { name: 'Support', weight: 1 }];
  const options = ['A', 'B'];
  const scores = [
    [8, 6], // Price
    [4, 9], // Support
  ];

  it('computes a normalised weighted score on a 0-10 scale', () => {
    const r = computeDecisionMatrix({ criteria, options, scores });
    // A: (3*8 + 1*4) / 4 = 7.0 ; B: (3*6 + 1*9) / 4 = 6.75
    expect(r.ranked[0]).toMatchObject({ name: 'A', rank: 1 });
    expect(r.ranked[0].score).toBeCloseTo(7, 6);
    expect(r.ranked[1].score).toBeCloseTo(6.75, 6);
  });

  it('does not depend on weight scale: doubling every weight changes nothing', () => {
    const doubled = criteria.map(c => ({ ...c, weight: c.weight * 2 }));
    const a = computeDecisionMatrix({ criteria, options, scores });
    const b = computeDecisionMatrix({ criteria: doubled, options, scores });
    expect(b.ranked.map(r => r.score)).toEqual(a.ranked.map(r => r.score));
  });

  it('counts missing scores as zero and says so', () => {
    const r = computeDecisionMatrix({ criteria, options, scores: [[8, ''], [4, 9]] });
    expect(r.warnings.some(w => w.includes('B'))).toBe(true);
  });

  it('clamps scores to 0-10', () => {
    const r = computeDecisionMatrix({ criteria: [{ name: 'x', weight: 1 }], options: ['A'], scores: [[99]] });
    expect(r.ranked[0].score).toBe(10);
  });

  it('warns when there are no options or all weights are zero', () => {
    expect(computeDecisionMatrix({ criteria, options: [], scores: [] }).warnings.length).toBeGreaterThan(0);
    expect(computeDecisionMatrix({ criteria: [{ name: 'x', weight: 0 }], options, scores: [[1, 1]] }).warnings.length).toBeGreaterThan(0);
  });
});
