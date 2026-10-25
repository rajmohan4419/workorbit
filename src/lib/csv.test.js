import { describe, it, expect } from 'vitest';
import { parseCsv, csvToRecords, mapColumns, normaliseHeader, toCsv } from './csv';

describe('parseCsv', () => {
  it('parses simple rows and CRLF endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('handles quoted commas, escaped quotes and embedded newlines', () => {
    const rows = parseCsv('name,note\n"Acme, Ltd","He said ""hi"""\n"Two\nlines",x');
    expect(rows[1]).toEqual(['Acme, Ltd', 'He said "hi"']);
    expect(rows[2]).toEqual(['Two\nlines', 'x']);
  });

  it('strips a UTF-8 byte order mark and blank lines', () => {
    expect(parseCsv('\uFEFFa,b\n\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('csvToRecords and mapColumns', () => {
  it('maps header aliases regardless of case, spaces and punctuation', () => {
    const { headers, records } = csvToRecords('Invoice No,Client,Total,Due Date\nINV-1,Acme,1000,2026-09-30');
    const map = mapColumns(headers, {
      invoice: ['invoiceno', 'invoice', 'invoicenumber'],
      customer: ['customer', 'client'],
      due: ['duedate', 'due'],
    });
    expect(map).toEqual({ invoice: 'Invoice No', customer: 'Client', due: 'Due Date' });
    expect(records[0][map.customer]).toBe('Acme');
  });

  it('returns null for missing columns', () => {
    expect(mapColumns(['a'], { due: ['duedate'] })).toEqual({ due: null });
  });

  it('normalises headers', () => {
    expect(normaliseHeader(' Due-Date ')).toBe('duedate');
  });
});

describe('toCsv', () => {
  it('quotes fields that contain commas or quotes', () => {
    expect(toCsv([['a,b', 'c"d', 'e']])).toBe('"a,b","c""d",e');
  });
});
