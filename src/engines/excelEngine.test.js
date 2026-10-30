import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseSpreadsheet,
  detectColumnTypes,
  applyColumnMapping,
  validateRows,
  exportSpreadsheet,
} from './excelEngine.js';

describe('Excel Engine (excelEngine.js)', () => {
  it('parses XLSX buffer with headers and records accurately', async () => {
    // Construct sample workbook
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
      { reference: '', amount: 500, email: 'valid@orbit.in' }, // Missing reference
      { reference: 'INV-102', amount: 5, email: 'valid@orbit.in' }, // Amount < min 10
      { reference: 'INV-103', amount: 'abc', email: 'valid@orbit.in' }, // Invalid amount
      { reference: 'INV-104', amount: 200, email: 'not-an-email' }, // Invalid email
    ];

    const validation = validateRows(rows, schema);
    expect(validation.isValid).toBe(false);
    expect(validation.validCount).toBe(1);
    expect(validation.errorCount).toBe(4);
    expect(validation.validRows[0].reference).toBe('INV-100');
  });

  it('exports valid XLSX and CSV Blobs', () => {
    const sampleData = [
      { Name: 'Acme Corp', Revenue: 50000 },
      { Name: 'Globex Inc', Revenue: 85000 },
    ];

    const xlsxBlob = exportSpreadsheet({
      sheets: [{ name: 'Companies', data: sampleData }],
      format: 'xlsx',
    });
    expect(xlsxBlob.size).toBeGreaterThan(0);
    expect(xlsxBlob.type).toContain('spreadsheetml.sheet');

    const csvBlob = exportSpreadsheet({
      sheets: [{ name: 'Companies', data: sampleData }],
      format: 'csv',
    });
    expect(csvBlob.size).toBeGreaterThan(0);
    expect(csvBlob.type).toContain('text/csv');
  });
});
