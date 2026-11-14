import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseSpreadsheet,
  detectColumnTypes,
  applyColumnMapping,
  validateRows,
  exportSpreadsheet,
  sanitizeCsvCell,
  exportValidationErrorReport,
} from './excelEngine.js';

describe('Excel Engine (excelEngine.js)', () => {
  it('parses XLSX buffer with headers and records accurately', async () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Transaction Date', 'Description', 'Amount', 'Type'],
      ['2025-01-01', 'Client Deposit', 15000, 'Credit'],
      ['2025-01-03', 'Server Cloud AWS', 1200, 'Debit'],
      ['2025-01-05', 'Office Rent', 5000, 'Debit'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = await parseSpreadsheet(buffer);
    expect(result.sheetNames).toEqual(['Ledger']);
    expect(result.rowCount).toBe(3);
    expect(result.headers).toEqual(['Transaction Date', 'Description', 'Amount', 'Type']);
    expect(result.rows[0]['Description']).toBe('Client Deposit');
    expect(result.rows[0]['Amount']).toBe(15000);
  });

  it('supports selecting a specific worksheet among multiple sheets', async () => {
    const wb = XLSX.utils.book_new();
    const sheet1 = XLSX.utils.aoa_to_sheet([['ID', 'Name'], ['1', 'First Sheet Item']]);
    const sheet2 = XLSX.utils.aoa_to_sheet([['Code', 'Target Product'], ['SKU-99', 'Second Sheet Item']]);

    XLSX.utils.book_append_sheet(wb, sheet1, 'Overview');
    XLSX.utils.book_append_sheet(wb, sheet2, 'Products');

    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsedSheet2 = await parseSpreadsheet(buffer, { sheetName: 'Products' });
    expect(parsedSheet2.sheetNames).toEqual(['Overview', 'Products']);
    expect(parsedSheet2.selectedSheet).toBe('Products');
    expect(parsedSheet2.headers).toEqual(['Code', 'Target Product']);
    expect(parsedSheet2.rows[0]['Target Product']).toBe('Second Sheet Item');
  });

  it('detects duplicate headers and empty headers visibly', async () => {
    const wb = XLSX.utils.book_new();
    // Headers has duplicate 'Amount' and empty header in column 2
    const wsData = [
      ['Date', '', 'Amount', 'Amount'],
      ['2025-01-01', 'Note 1', 100, 200],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = await parseSpreadsheet(buffer);
    expect(result.emptyHeaders).toContain(2); // Column 2 was empty
    expect(result.duplicateHeaders).toContain('Amount');
    expect(result.headers).toEqual(['Date', 'Column_2', 'Amount', 'Amount_2']);
  });

  it('handles empty worksheets gracefully without throwing', async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, ws, 'EmptySheet');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = await parseSpreadsheet(buffer);
    expect(result.rowCount).toBe(0);
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('rejects malformed non-spreadsheet data with a clear error', async () => {
    // Corrupted ZIP / XLSX header
    const malformedBuffer = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0xFF, 0xFF]);
    await expect(parseSpreadsheet(malformedBuffer)).rejects.toThrow('Malformed or unsupported spreadsheet file');
  });

  it('enforces maximum row limit and file size limits', async () => {
    const wb = XLSX.utils.book_new();
    const data = [['RowID']];
    for (let i = 0; i < 50; i++) {
      data.push([`Row_${i}`]);
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    await expect(parseSpreadsheet(buffer, { maxRows: 25 })).rejects.toThrow('Worksheet exceeds maximum row limit of 25 rows');
  });

  it('preserves Excel serial dates and Date objects consistently', async () => {
    const wb = XLSX.utils.book_new();
    // Excel serial 45658 = 2025-01-01
    const wsData = [
      ['DateCol'],
      [45658],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Dates');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = await parseSpreadsheet(buffer);
    expect(result.rows[0]['DateCol']).toBe('2025-01-01');
  });

  it('sanitizes untrusted cells to prevent CSV formula injection', () => {
    expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvCell('+cmd|/C calc')).toBe("'+cmd|/C calc");
    expect(sanitizeCsvCell('-50')).toBe("'-50");
    expect(sanitizeCsvCell('@SUM(1+1)')).toBe("'@SUM(1+1)");
    expect(sanitizeCsvCell('\tmalicious')).toBe("'\tmalicious");
    expect(sanitizeCsvCell('Normal Text 123')).toBe('Normal Text 123');
    expect(sanitizeCsvCell(12345)).toBe(12345);
  });

  it('protects CSV exports against formula injection automatically', async () => {
    const dirtyData = [
      { User: 'Alice', Formula: '=HYPERLINK("http://attacker.com")', Notes: '+12345' },
    ];

    const blob = exportSpreadsheet({
      sheets: [{ name: 'Test', data: dirtyData }],
      format: 'csv',
      sanitizeFormulaInjection: true,
    });

    const csvText = await blob.text();
    expect(csvText).toContain("'=HYPERLINK");
    expect(csvText).toContain("'+12345");
  });

  it('exports downloadable validation error report correctly', async () => {
    const errors = [
      { row: 2, field: 'email', value: 'bad-email', message: 'Invalid email address' },
      { row: 5, field: 'amount', value: -10, message: 'Amount cannot be negative' },
    ];

    const reportBlob = exportValidationErrorReport(errors, 'csv');
    const reportText = await reportBlob.text();
    expect(reportText).toContain('Invalid email address');
    expect(reportText).toContain('Amount cannot be negative');
    expect(reportText).toContain('bad-email');
  });

  it('detects column data types automatically', () => {
    const headers = ['id', 'user_email', 'total_spent', 'signup_date', 'notes'];
    const rows = [
      { id: 1, user_email: 'alice@example.com', total_spent: '$1,200.50', signup_date: '2025-01-15', notes: 'VIP user' },
      { id: 2, user_email: 'bob@example.com', total_spent: '$450.00', signup_date: '2025-02-10', notes: 'Trial' },
      { id: 3, user_email: 'carol@domain.org', total_spent: '$3,800.00', signup_date: '2025-03-01', notes: 'Enterprise' },
    ];

    const types = detectColumnTypes(rows, headers);
    expect(types['user_email']).toBe('email');
    expect(types['total_spent']).toBe('number');
    expect(types['signup_date']).toBe('date');
    expect(types['notes']).toBe('text');
  });

  it('remaps columns according to a columnMapping schema', () => {
    const rawRows = [
      { 'Txn Ref': 'TX-901', 'Val Date': '2025-01-10', 'Net Amt': 4500 },
      { 'Txn Ref': 'TX-902', 'Val Date': '2025-01-12', 'Net Amt': 1200 },
    ];
    const mapping = {
      reference: 'Txn Ref',
      date: 'Val Date',
      amount: 'Net Amt',
      category: 'NonExistentColumn',
    };

    const mapped = applyColumnMapping(rawRows, mapping);
    expect(mapped[0]).toEqual({
      reference: 'TX-901',
      date: '2025-01-10',
      amount: 4500,
      category: null,
    });
  });

  it('validates rows and reports field-level validation errors', () => {
    const schema = {
      reference: { required: true },
      amount: { required: true, type: 'number', min: 10 },
      email: { type: 'email' },
    };

    const rows = [
      { reference: 'INV-100', amount: 500, email: 'valid@orbit.in' },
      { reference: '', amount: 500, email: 'valid@orbit.in' },
      { reference: 'INV-102', amount: 5, email: 'valid@orbit.in' },
      { reference: 'INV-103', amount: 'abc', email: 'valid@orbit.in' },
      { reference: 'INV-104', amount: 200, email: 'not-an-email' },
    ];

    const validation = validateRows(rows, schema);
    expect(validation.isValid).toBe(false);
    expect(validation.validCount).toBe(1);
    expect(validation.errorCount).toBe(4);
    expect(validation.validRows[0].reference).toBe('INV-100');
  });
});

it('preserves ordinary monetary amounts in the Excel date-serial range', async () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Date', 'Taxable value', 'Amount'], [45658, 45000, 65000]]), 'Synthetic finance');
  const result = await parseSpreadsheet(XLSX.write(wb, { type:'array', bookType:'xlsx' }));
  expect(result.rows[0]).toEqual({ Date:'2025-01-01', 'Taxable value':45000, Amount:65000 });
});

describe('Excel data preservation regressions',()=>{
  function buffer(data) {
    const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(data),'Data');return new Uint8Array(XLSX.write(workbook,{type:'array',bookType:'xlsx'}));
  }
  it('reads only the uploaded typed-array slice',async()=>{
    const bytes=buffer([['Name'],['Synthetic']]);const padded=new Uint8Array(bytes.length+20);padded.set(bytes,10);
    expect((await parseSpreadsheet(padded.subarray(10,10+bytes.length))).rows[0].Name).toBe('Synthetic');
  });
  it('keeps generated and literal suffix headers unique and retains extra columns',async()=>{
    const parsed=await parseSpreadsheet(buffer([['Amount','Amount','Amount_2'],[1,2,3,'extra']]));
    expect(new Set(parsed.headers.map(h=>h.toLowerCase())).size).toBe(4);
    expect(parsed.rows[0][parsed.headers[2]]).toBe(3);expect(parsed.rows[0].Column_4).toBe('extra');
  });
  it('preserves leading-zero CSV identifiers',async()=>{
    const parsed=await parseSpreadsheet(new TextEncoder().encode('Code,Amount\n001234,100\n'));
    expect(parsed.rows[0].Code).toBe('001234');
  });
  it('rejects nonexistent worksheets, excessive columns and non-finite numbers',async()=>{
    await expect(parseSpreadsheet(buffer([['A','B'],[1,2]]),{sheetName:'Missing'})).rejects.toThrow('could not be found');
    await expect(parseSpreadsheet(buffer([['A','B'],[1,2]]),{maxColumns:1})).rejects.toThrow('column limit');
    const result=validateRows([{Amount:Infinity},{Amount:'₹'},{Amount:0}],{Amount:{type:'number',required:true}});
    expect(result.invalidCount).toBe(2);expect(result.validCount).toBe(1);
  });
  it('protects CSV headers as well as values and refuses silent multi-sheet loss',async()=>{
    const blob=exportSpreadsheet({sheets:[{name:'Data',data:[{'=1+1':'=2+2'}]}],format:'csv'});
    expect(await blob.text()).toContain("'=1+1");expect(await blob.text()).toContain("'=2+2");
    expect(()=>exportSpreadsheet({sheets:[{name:'A',data:[]},{name:'B',data:[]}],format:'csv'})).toThrow('one worksheet');
  });
});
