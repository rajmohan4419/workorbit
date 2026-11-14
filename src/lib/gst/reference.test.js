import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applicableNumericRate, findRateReferences, searchClassifications } from './reference';

const codes = JSON.parse(readFileSync(new URL('../../../public/data/gst/codes.json', import.meta.url)));
const rates = JSON.parse(readFileSync(new URL('../../../public/data/gst/rates.json', import.meta.url)));

describe('local classification reference', () => {
  it('preserves leading zeros and supports goods and service descriptions', () => {
    expect(codes.some(row => row.code === '01')).toBe(true);
    expect(searchClassifications(codes, '6901')[0].code).toBe('6901');
    expect(searchClassifications(codes, 'bricks').some(row => row.kind === 'goods')).toBe(true);
    expect(searchClassifications(codes, 'accounting', 'services').length).toBeGreaterThan(0);
    expect(searchClassifications(codes, 'zznonexistent')).toEqual([]);
    expect(searchClassifications(codes, '6')).toEqual([]);
  });
  it('keeps conditional rates and parent matches as candidates, not defaults', () => {
    const service = findRateReferences(rates, { kind: 'services', code: '995411' });
    expect(service.length).toBeGreaterThan(1);
    expect(service.some(row => row.condition.includes('eighty percent'))).toBe(true);
    expect(findRateReferences(rates, { kind: 'goods', code: '99999999' })).toEqual([]);
    expect(findRateReferences(rates, { kind: 'goods', code: '6901' }).length).toBeGreaterThan(0);
  });
  it('does not silently convert unavailable, cess, conditional or special-valued rates to zero', () => {
    const plain = { cgst: '9%', sgst: '9%', igst: '18%', condition: '', description: 'Goods' };
    expect(applicableNumericRate(plain)).toBe(18);
    expect(applicableNumericRate({ ...plain, igst: '' })).toBeNull();
    expect(applicableNumericRate({ ...plain, igst: 'Nil' })).toBeNull();
    expect(applicableNumericRate({ ...plain, condition: '12% cess' })).toBeNull();
    expect(applicableNumericRate({ ...plain, description: 'Valuation under paragraph 2' })).toBeNull();
    expect(applicableNumericRate({ ...plain, cgst: '2.5%' })).toBeNull();
  });
});
