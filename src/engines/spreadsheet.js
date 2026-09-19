import * as XLSX from 'xlsx';

function ensureRows(value) {
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

export function csvToXlsx(csvText) {
  const workbook = XLSX.read(csvText, { type: 'string' });
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return output;
}

export async function xlsxToCsv(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheets = workbook.SheetNames;
  if (!sheets.length) throw new Error('No worksheets found.');

  return sheets.map(name => {
    const worksheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return sheets.length === 1 ? csv : `### Sheet: ${name}\n${csv}`;
  }).join('\n\n');
}
