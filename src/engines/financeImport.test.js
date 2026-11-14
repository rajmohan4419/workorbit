import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { readFinanceFile, financeSheetRows, mapFinanceRows, readGstrJson, MAX_FINANCE_BYTES } from './financeImport.js';
import { reconcileGstrData } from '../tools/finance/gstrReconciliationEngine.js';
import { exportGstrReport } from './financeReports.js';
import { exportSpreadsheet } from './excelEngine.js';
const invoice = { gstin: '29ABCDE1234F1Z5', invoiceNumber: '=UNTRUSTED()', invoiceDate: '2026-10-01', taxableValue: 45000, igst: 8100, cgst: 0, sgst: 0 };
const file = (bytes, name = 'synthetic.xlsx') => ({ name, size: bytes.byteLength, arrayBuffer: async () => bytes });
describe('local finance import and export', () => {
  it('selects sheets and physical header rows without converting amounts into dates', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Ignore me']]), 'Instructions');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Title'], [], Object.keys(invoice), Object.values(invoice), [], Object.values({ ...invoice, invoiceNumber: 'B' })]), 'Invoices');
    const loaded = await readFinanceFile(file(XLSX.write(wb, { type: 'array', bookType: 'xlsx' })));
    expect(loaded.sheetNames).toEqual(['Instructions', 'Invoices']);
    const data = financeSheetRows(loaded, 'Invoices', 3);
    expect(data.rows.map(r => r.__sourceRow)).toEqual([4,6]);
    expect(data.rows[0].taxableValue).toBe(45000);
    expect(mapFinanceRows(data.rows, { taxableValue: 'taxableValue' }, 'Invoices')[0].taxableValue).toBe(45000);
  });
  it('rejects empty, oversized, ambiguous headers and unsupported JSON', async () => {
    await expect(readFinanceFile({ size: 0 })).rejects.toThrow(/empty/);
    await expect(readFinanceFile({ size: MAX_FINANCE_BYTES + 1 })).rejects.toThrow(/10 MB/);
    for (const data of [{ schema: 'unknown' }, { schema: 'orbitboard-gstr2b/1', invoices: [] }, { schema: 'orbitboard-gstr2b/1', invoices: [invoice], amendments: [] }, { schema: 'orbitboard-gstr2b/1', invoices: [{ ...invoice, nested: {} }] }]) expect(() => readGstrJson(data)).toThrow();
    const data = readGstrJson({ schema: 'orbitboard-gstr2b/1', invoices: [invoice] });
    expect(data[0].__sourceRow).toBe(1);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a','a'], [1,2]]), 'Bad');
    const loaded = await readFinanceFile(file(XLSX.write(wb, { type: 'array', bookType: 'xlsx' })));
    expect(() => financeSheetRows(loaded,'Bad')).toThrow(/unique/);
    expect(() => mapFinanceRows([{ a:1 }],{ debit:'a', credit:'a' })).toThrow(/different/);
  });
  it('rejects excessive row counts before materializing rows', () => {
    const loaded = { workbook: { Sheets: { Big: { '!ref': 'A1:A10002' } } } };
    expect(() => financeSheetRows(loaded,'Big')).toThrow(/10,000/);
  });
  it('exports all categories, row accounting, tolerances and literal formula-like text', async () => {
    const result = reconcileGstrData([invoice, { ...invoice, invoiceNumber:'B', taxableValue:'bad' }, { ...invoice, invoiceNumber:'C' }, { ...invoice, invoiceNumber:'C' }], [invoice]);
    const blob = exportGstrReport(result, { gstr:'Synthetic 2B', books:'Synthetic books' });
    const wb = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
    expect(wb.SheetNames).toContain('Rejected rows');
    expect(XLSX.utils.sheet_to_json(wb.Sheets['Ambiguous and incomplete'])).toHaveLength(2);
    expect(XLSX.utils.sheet_to_json(wb.Sheets['Rejected rows'])).toHaveLength(1);
    const matched = XLSX.utils.sheet_to_json(wb.Sheets.Matched);
    expect(matched[0]['Invoice identifier']).toBe('=UNTRUSTED()');
    const cell = Object.values(wb.Sheets.Matched).find(c => c?.v === '=UNTRUSTED()');
    expect(cell.t).toBe('s'); expect(cell.f).toBeUndefined();
    expect(XLSX.utils.sheet_to_json(wb.Sheets.Summary)).toContainEqual({ Metric:'Tolerance per available amount', Value:1 });
  });
  it('protects CSV formula-looking text while retaining numeric amounts', async () => {
    const blob = exportSpreadsheet({ sheets:[{ name:'Text',data:[{ a:'=UNTRUSTED()', amount:-10 }] }],format:'csv' });
    expect(await blob.text()).toContain("'=UNTRUSTED()");
    expect(await blob.text()).toContain('-10');
  });
});

it('accounts for every normalized JSON fixture row including missing tax and rejected records', async () => {
  const { readFile } = await import('node:fs/promises');
  const fixture = JSON.parse(await readFile(new URL('../../tests/fixtures/finance/gstr2b-v1.json', import.meta.url), 'utf8'));
  const rows = readGstrJson(fixture);
  const result = reconcileGstrData(rows, []);
  expect(result.rowAccounting).toEqual({ imported:5, processed:3, rejected:2, awaitingReview:0 });
  expect(result.invalidRows.map(r => r.rowNumber)).toEqual([4,5]);
  expect(result.missingInPr[2].igst).toBeNull();
});
