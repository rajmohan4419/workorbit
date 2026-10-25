import { describe, it, expect } from 'vitest';
import { computeHraExemption } from './hraExemption';

describe('computeHraExemption', () => {
  it('limits by rent minus 10% of basic when that is lowest (metro)', () => {
    const r = computeHraExemption({ basicAnnual: 600000, hraReceivedAnnual: 240000, rentPaidAnnual: 240000, metro: true });
    expect(r.exempt).toBe(180000);
    expect(r.taxable).toBe(60000);
    expect(r.binding).toBe('rentMinusTenPercent');
  });

  it('limits by 50% of basic for metro cities', () => {
    const r = computeHraExemption({ basicAnnual: 400000, hraReceivedAnnual: 300000, rentPaidAnnual: 400000, metro: true });
    expect(r.exempt).toBe(200000);
    expect(r.taxable).toBe(100000);
    expect(r.binding).toBe('percentOfBasic');
  });

  it('uses 40% of basic for non-metro cities', () => {
    const r = computeHraExemption({ basicAnnual: 400000, hraReceivedAnnual: 300000, rentPaidAnnual: 400000, metro: false });
    expect(r.exempt).toBe(160000);
    expect(r.taxable).toBe(140000);
  });

  it('is limited by actual HRA when that is lowest', () => {
    const r = computeHraExemption({ basicAnnual: 1000000, hraReceivedAnnual: 100000, rentPaidAnnual: 400000, metro: true });
    expect(r.exempt).toBe(100000);
    expect(r.taxable).toBe(0);
    expect(r.binding).toBe('actualHra');
  });

  it('gives no exemption when rent is below 10% of basic', () => {
    const r = computeHraExemption({ basicAnnual: 500000, hraReceivedAnnual: 100000, rentPaidAnnual: 30000, metro: true });
    expect(r.exempt).toBe(0);
    expect(r.taxable).toBe(100000);
  });
});
