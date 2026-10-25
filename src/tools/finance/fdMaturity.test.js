import { describe, it, expect } from 'vitest';
import { computeFdMaturity } from './fdMaturity';

describe('computeFdMaturity', () => {
  it('uses quarterly compounding by default: 100000 at 7% for 1 year', () => {
    const r = computeFdMaturity({ principal: 100000, annualRatePct: 7, years: 1, months: 0 });
    expect(r.amount).toBeCloseTo(107185.90, 2);
    expect(r.interest).toBeCloseTo(7185.90, 2);
    expect(r.effectiveRatePct).toBeCloseTo(7.1859, 3);
  });

  it('handles months as a fraction of a year: 50000 at 8% half-yearly for 1 year 6 months', () => {
    const r = computeFdMaturity({ principal: 50000, annualRatePct: 8, years: 1, months: 6, timesPerYear: 2 });
    expect(r.amount).toBeCloseTo(56243.20, 2);
  });

  it('treats a months-only tenure correctly: 6 months at 8% quarterly', () => {
    const r = computeFdMaturity({ principal: 100000, annualRatePct: 8, years: 0, months: 6 });
    expect(r.amount).toBeCloseTo(100000 * Math.pow(1 + 0.08 / 4, 4 * 0.5), 2);
  });
});
