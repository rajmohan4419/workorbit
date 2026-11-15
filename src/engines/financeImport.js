import { reviewedDate } from './financeValidation.js';
import { readWorkbook, formattedCellValue } from './workbookReader.js';
import * as XLSX from 'xlsx';
export const MAX_FINANCE_BYTES = 10 * 1024 * 1024;
export const MAX_FINANCE_ROWS = 10000;
export const FINANCE_SCOPE = 'Local CSV/XLS/XLSX: one selected worksheet and header row; up to 10 MB and 10,000 data rows. GSTR JSON: OrbitBoard normalized GSTR-2B schema orbitboard-gstr2b/1 only (not raw GST portal JSON); invoices only, no amendments, credit/debit notes, imports or ISD.';
export function readGstrJson(data) {
  if (!data || data.schema !== 'orbitboard-gstr2b/1') throw new Error('Unsupported JSON schema/version. Use the documented orbitboard-gstr2b/1 template; raw portal JSON is not supported.');
  const extra = Object.keys(data).filter(k => !['schema', 'invoices'].includes(k));
  if (extra.length) throw new Error(`Unsupported JSON sections: ${extra.join(', ')}. No records imported.`);
  if (!Array.isArray(data.invoices) || !data.invoices.length) throw new Error('JSON invoices must be a non-empty array.');
  if (data.invoices.length > MAX_FINANCE_ROWS) throw new Error('Maximum 10,000 invoices. Split the file.');
  const fields = ['gstin', 'invoiceNumber', 'invoiceDate', 'taxableValue', 'igst', 'cgst', 'sgst', 'cess'];
  for (const row of data.invoices) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(k => !fields.includes(k))) throw new Error('Unsupported invoice fields or structure. Use the documented flat invoice schema.');
    if (Object.values(row).some(v => v !== null && !['string', 'number'].includes(typeof v))) throw new Error('Invoice fields must be scalar strings, numbers or null.');
  }
  return data.invoices.map((r, i) => ({ ...r, __sourceRow: i + 1 }));
}
export async function readFinanceFile(file, allowJson = false) {
  if (!file.size) throw new Error('The file is empty. Choose a file containing headers and data.');
  if (file.size > MAX_FINANCE_BYTES) throw new Error('Maximum file size is 10 MB. Split the file and try again.');
  if (/\.json$/i.test(file.name)) {
    if (!allowJson) throw new Error('JSON is supported for the GSTR-2B source only.');
    let data;
    try { data = JSON.parse(await file.text()); } catch { throw new Error('Invalid JSON syntax. Check the synthetic JSON template.'); }
    return { jsonRows: readGstrJson(data), sheetNames: ['JSON invoices'] };
  }
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error('Choose a CSV, XLSX or XLS file.');
  let workbook;
  try { workbook = await readWorkbook(await file.arrayBuffer(), { maxRows: MAX_FINANCE_ROWS, headerAllowance: 100, cellNF: true }); }
  catch (error) { throw new Error(`Could not read the spreadsheet: ${error.message}`); }
  if (!workbook.SheetNames.length) throw new Error('No worksheets found.');
  return { workbook, sheetNames: workbook.SheetNames };
}
export function financeSheetRows(loaded, sheetName, headerRow = 1) {
  if (loaded.jsonRows) {
    return { headers: [...new Set(loaded.jsonRows.flatMap(r => Object.keys(r)))].filter(k => !k.startsWith('__')), rows: loaded.jsonRows };
  }
  const sheet = loaded.workbook.Sheets[sheetName];
  if (!sheet) throw new Error('Choose an existing worksheet.');
  if (!Number.isInteger(headerRow) || headerRow < 1 || headerRow > 100) throw new Error('Choose a header row from 1 to 100.');
  const range = sheet['!fullref'] || sheet['!ref'];
  if (range && XLSX.utils.decode_range(range).e.r - headerRow + 1 > MAX_FINANCE_ROWS) throw new Error('Maximum 10,000 data rows per worksheet. Split this worksheet.');
  if (range && XLSX.utils.decode_range(range).e.c >= 256) throw new Error('Maximum 256 columns per worksheet.');
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true, raw: true, range: 0 });
  const rawHeaders = (grid[headerRow - 1] || []).map(v => String(v).trim());
  if (!rawHeaders.length || rawHeaders.every(h => !h)) throw new Error('This header row is empty. Select the correct header row.');
  if (rawHeaders.some(h => !h) || new Set(rawHeaders).size !== rawHeaders.length || rawHeaders.some(h => h.startsWith('__') || ['constructor', 'prototype'].includes(h))) throw new Error('Headers must be non-empty, unique and must not start with __. Select another header row or correct the file.');
  const rows = [];
  grid.slice(headerRow).forEach((cells, index) => {
    if (cells.every(v => v === '' || v == null)) return;
    if (cells.slice(rawHeaders.length).some(v => v !== '' && v != null)) throw new Error(`Row ${headerRow + index + 1} has data without a header. Correct the header row.`);
    const record = { __sourceRow: headerRow + index + 1, __sourceLabel: sheetName };
    rawHeaders.forEach((h, col) => { const cell = sheet[XLSX.utils.encode_cell({r:headerRow + index,c:col})]; record[h] = (cell?.z && /^0{2,}$/.test(cell.z) ? formattedCellValue(cell) : cells[col]) ?? ''; });
    rows.push(record);
  });
  if (!rows.length) throw new Error('No data rows below this header. Choose another sheet/header or add data.');
  if (rows.length > MAX_FINANCE_ROWS) throw new Error('Maximum 10,000 data rows. Split the file.');
  return { headers: rawHeaders, rows };
}
export function mapFinanceRows(rows, mapping, label, dateOrder = 'reject') {
  if (mapping.amount && (mapping.debit || mapping.credit)) throw new Error('Map either signed amount or separate debit/credit columns. Clear the unused amount mapping.');
  const used = Object.values(mapping).filter(Boolean);
  if (new Set(used).size !== used.length) throw new Error('Each mapped field must use a different column.');
  return rows.map(row => {
    const mapped = { __sourceRow: row.__sourceRow, __sourceLabel: label };
    for (const [key, header] of Object.entries(mapping)) if (header) { const value = row[header]; mapped[key] = ['date', 'invoiceDate'].includes(key) ? (value == null || String(value).trim() === '' ? '' : reviewedDate(value, dateOrder) || `Invalid date for selected convention: ${String(value)}`) : value; }
    return mapped;
  });
}
