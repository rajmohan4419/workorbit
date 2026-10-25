import { describe, it, expect } from 'vitest';
import { computeRdMaturity } from './rdMaturity';

describe('computeRdMaturity', () => {
  it('returns the plain total when the rate is zero', () => {
    const r = computeRdMaturity({ monthlyDeposit: 1000, annualRatePct: 0, years: 1, months: 0 });
    expect(r.invested).toBe(12000);
    expect(r.maturity).toBeCloseTo(12000, 6);
    expect(r.interest).toBeCloseTo(0, 6);
  });

  it('matches the quarterly-compounded value for 12 instalments of 1000 at 6%', () => {
    const r = computeRdMaturity({ monthlyDeposit: 1000, annualRatePct: 6, years: 1, months: 0, timesPerYear: 4 });
    expect(r.totalMonths).toBe(12);
    expect(r.maturity).toBeCloseTo(12395.23, 2);
    expect(r.interest).toBeCloseTo(395.23, 2);
  });

  it('adds years and months together for the tenure', () => {
    const r = computeRdMaturity({ monthlyDeposit: 500, annualRatePct: 5, years: 1, months: 6 });
    expect(r.totalMonths).toBe(18);
    expect(r.invested).toBe(9000);
  });

  it('treats invalid input as zero', () => {
    const r = computeRdMaturity({ monthlyDeposit: 'x', annualRatePct: -1, years: 1, months: 0 });
    expect(r.invested).toBe(0);
    expect(r.maturity).toBe(0);
  });
});
