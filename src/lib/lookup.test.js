import { describe, it, expect } from 'vitest';
import { applyLookup, normaliseKey } from './lookup';

const lookupRows = [
  { Customer: 'Acme Pvt Ltd', Region: 'South', 'Credit Limit': '500000' },
  { Customer: 'Beta Traders', Region: 'North', 'Credit Limit': '200000' },
];

describe('applyLookup', () => {
  it('returns the matching value for each row', () => {
    const r = applyLookup({ rowKeys: ['Acme Pvt Ltd', 'Beta Traders'], lookupRows, lookupKey: 'Customer', returnCol: 'Region' });
    expect(r.values).toEqual(['South', 'North']);
    expect(r.matched).toBe(2);
    expect(r.unmatched).toBe(0);
  });

  it('ignores case and surrounding spaces in keys', () => {
    const r = applyLookup({ rowKeys: ['  acme PVT ltd '], lookupRows, lookupKey: 'Customer', returnCol: 'Region' });
    expect(r.values).toEqual(['South']);
  });

  it('leaves unmatched and blank keys empty and counts them', () => {
    const r = applyLookup({ rowKeys: ['Unknown Co', ''], lookupRows, lookupKey: 'Customer', returnCol: 'Region' });
    expect(r.values).toEqual(['', '']);
    expect(r.unmatched).toBe(2);
  });

  it('uses the first row for a duplicate key and reports it', () => {
    const rows = [...lookupRows, { Customer: 'Acme Pvt Ltd', Region: 'West' }];
    const r = applyLookup({ rowKeys: ['Acme Pvt Ltd'], lookupRows: rows, lookupKey: 'Customer', returnCol: 'Region' });
    expect(r.values).toEqual(['South']);
    expect(r.duplicates).toEqual(['Acme Pvt Ltd']);
  });

  it('can return any column, not only the first', () => {
    const r = applyLookup({ rowKeys: ['Beta Traders'], lookupRows, lookupKey: 'Customer', returnCol: 'Credit Limit' });
    expect(r.values).toEqual(['200000']);
  });
});

describe('normaliseKey', () => {
  it('trims and lowercases', () => {
    expect(normaliseKey(' ABC ')).toBe('abc');
    expect(normaliseKey(null)).toBe('');
  });
});
