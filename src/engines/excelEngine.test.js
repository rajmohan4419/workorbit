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
