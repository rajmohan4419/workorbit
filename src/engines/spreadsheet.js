import { readWorkbook } from './workbookReader.js';
import * as XLSX from 'xlsx';

export function ensureRows(value) {
  if (!Array.isArray(value)) {
    throw new Error('Expected a JSON array of objects.');
  }
  if (!value.length) return [];
  if (!value.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
    throw new Error('Each JSON item must be an object.');
  }
  return value;
}

export function jsonToXlsx(jsonText) {
  const rows = ensureRows(JSON.parse(jsonText));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

export async function csvToXlsx(csvText) {
  if (new Blob([csvText]).size > 10 * 1024 * 1024) throw new Error('Maximum CSV size is 10 MB.');
  const workbook = await readWorkbook(csvText, { type: 'string', raw: true, maxRows: 10000, headerAllowance: 1 });
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return output;
}

export async function xlsxToCsv(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error('Maximum spreadsheet size is 10 MB.');
  const workbook = await readWorkbook(await file.arrayBuffer(), { maxRows: 10000, headerAllowance: 1 });
  const sheets = workbook.SheetNames;
  if (!sheets.length) throw new Error('No worksheets found.');

  return sheets.map(name => {
    const worksheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return sheets.length === 1 ? csv : `### Sheet: ${name}\n${csv}`;
  }).join('\n\n');
}
