import { describe, expect, it } from 'vitest';
import { reconcileGstrData, parseAmount, parseDate } from '../tools/finance/gstrReconciliationEngine.js';
import { normalizeTransaction } from './bankReconciliationEngine.js';
const invoice = { gstin: '29ABCDE1234F1Z5', invoiceNumber: 'A-1', taxableValue: 100, igst: 18, cgst: 0, sgst: 0 };
describe('financial matching reliability regressions', () => {
  it('compares tax even when taxable values agree', () => {
    expect(reconcileGstrData([invoice], [{ ...invoice, igst: 15 }]).matches).toHaveLength(0);
  });
  it('compares individual components even when total tax agrees', () => {
    const result = reconcileGstrData([invoice], [{ ...invoice, igst: 0, cgst: 9, sgst: 9 }]);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0].componentDiffs).toEqual({ igst: 18, cgst: 9, sgst: 9, cess: null });
  });
  it('distinguishes absent tax from explicit zero', () => {
    const missing = { ...invoice };
    delete missing.igst;
    const result = reconcileGstrData([{ ...invoice, igst: 0 }], [missing]);
    expect(result.matches).toHaveLength(0);
    expect(result.reviewRecords).toHaveLength(2);
  });
  it('rejects malformed and non-finite amounts', () => {
    for (const value of ['12oops', 'Infinity', Infinity, NaN]) expect(Number.isNaN(parseAmount(value))).toBe(true);
    const result = reconcileGstrData([{ ...invoice, taxableValue: '12oops' }], [invoice]);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.summary.totalGstrTaxable).toBe(0);
  });
  it('rejects invalid calendar dates', () => {
    expect(parseDate('2026-02-30')).toBe('');
    expect(parseDate('31/04/2026')).toBe('');
    expect(reconcileGstrData([{ ...invoice, invoiceDate: '2026-02-30' }], []).invalidRows).toHaveLength(1);
  });
  it('flags duplicate and punctuation-colliding keys without consuming candidates', () => {
    for (const duplicate of [invoice, { ...invoice, invoiceNumber: 'A/1' }]) {
      const result = reconcileGstrData([invoice, duplicate], [invoice]);
      expect(result.matches).toHaveLength(0);
      expect(result.reviewRecords).toHaveLength(3);
      expect(result.rowAccounting).toEqual({ imported: 3, processed: 0, rejected: 0, awaitingReview: 3 });
      expect(reconcileGstrData([invoice, duplicate], [invoice])).toEqual(result);
    }
  });
  it.each([['bank', 'DR', -100], ['ledger', 'CR', -100], ['bank', 'CR', 100], ['ledger', 'DR', 100], ['bank', 'RECEIPT', 100], ['ledger', 'PAYMENT', -100]])('respects %s %s direction', (source, type, expected) => {
    const result = normalizeTransaction({ date: '2026-10-01', amount: 100, type }, { date: 'date', amount: 'amount', type: 'type' }, source);
    expect(result.transaction.amount).toBe(expected);
  });
  it('rejects conflicting direction indicators and debit/credit combinations', () => {
    expect(normalizeTransaction({ date: '2026-10-01', amount: 100, type: 'DR CR' }, { date: 'date', amount: 'amount', type: 'type' }).transaction).toBeNull();
    for (const [dr, cr] of [[100, 100], [-100, 0], [Infinity, 0], ['100oops', 0]]) {
      expect(normalizeTransaction({ date: '2026-10-01', dr, cr }, { date: 'date', debit: 'dr', credit: 'cr' }).transaction).toBeNull();
    }
  });
});

it('rejects debit/credit direction conflicting with a mapped type', () => {
  expect(normalizeTransaction({ date:'2026-10-01', debit:100, credit:0, type:'CR' }, { date:'date', debit:'debit', credit:'credit', type:'type' },'bank').transaction).toBeNull();
});
