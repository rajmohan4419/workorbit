import { describe, it, expect } from 'vitest';
import { computePipeline } from './salesPipeline';

const stages = [
  { name: 'Lead', deals: 10, avgValue: 5000, winRatePct: 10 },
  { name: 'Qualified', deals: 5, avgValue: 20000, winRatePct: 25 },
  { name: 'Proposal', deals: 2, avgValue: 50000, winRatePct: 50 },
];

describe('computePipeline', () => {
  it('totals pipeline and weighted value', () => {
    const r = computePipeline({ stages, quota: 200000 });
    expect(r.totalValue).toBe(250000);
    expect(r.weightedValue).toBe(80000);
    expect(r.expectedDeals).toBeCloseTo(3.25, 6);
  });

  it('gives the gap to quota and coverage on total pipeline', () => {
    const r = computePipeline({ stages, quota: 200000 });
    expect(r.gap).toBe(120000);
    expect(r.coverage).toBeCloseTo(1.25, 6);
  });

  it('reports per-stage values', () => {
    const r = computePipeline({ stages, quota: 200000 });
    expect(r.perStage[1]).toEqual({ name: 'Qualified', value: 100000, weighted: 25000 });
  });

  it('returns no gap or coverage without a quota', () => {
    const r = computePipeline({ stages, quota: 0 });
    expect(r.gap).toBeNull();
    expect(r.coverage).toBeNull();
  });

  it('caps win rates at 100% and ignores bad inputs', () => {
    const r = computePipeline({ stages: [{ name: 'X', deals: 2, avgValue: 100, winRatePct: 400 }, { name: 'Y', deals: 'abc', avgValue: 50, winRatePct: 50 }], quota: 0 });
    expect(r.weightedValue).toBe(200);
    expect(r.totalValue).toBe(200);
  });
});
