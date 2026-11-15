import * as XLSX from 'xlsx';

export const PARSE_TIMEOUT_MS = 15000;
export const MAX_WORKSHEETS = 30;

// Also used inside the worker and by Node tests. Validate dimensions before any
// sheet_to_json call can allocate a grid from an attacker-controlled !ref.
export function readWorkbookSync(data, options = {}) {
  const { maxRows = 50000, maxColumns = 256, headerAllowance = 10, ...readOptions } = options;
  const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: true, cellText: true,
    sheetRows: maxRows + headerAllowance + 2, ...readOptions });
  if (!workbook.SheetNames?.length) throw new Error('No readable worksheets found.');
  if (workbook.SheetNames.length > MAX_WORKSHEETS) throw new Error(`Maximum ${MAX_WORKSHEETS} worksheets. Split this workbook.`);
  let cells = 0;
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const ref = sheet?.['!fullref'] || sheet?.['!ref'];
    if (!ref) continue;
    const range = XLSX.utils.decode_range(ref);
    if (range.e.c >= maxColumns) throw new Error(`Worksheet exceeds maximum column limit of ${maxColumns}: "${name}".`);
    if (range.e.r >= maxRows + headerAllowance) throw new Error(`Worksheet exceeds maximum row limit of ${maxRows} rows: "${name}" (plus ${headerAllowance} header rows).`);
    cells += (range.e.r + 1) * (range.e.c + 1);
    if (cells > 2000000) throw new Error('Workbook exceeds 20 lakh cells. Split it into smaller files.');
  }
  return workbook;
}

export function readWorkbook(data, options = {}) {
  // Browsers always use an isolated worker. No main-thread fallback after errors.
  if (typeof Worker === 'undefined') {
    if (typeof window !== 'undefined' && !import.meta.env?.MODE?.includes('test')) {
      return Promise.reject(new Error('Local file processing requires Web Worker support. Use a current browser.'));
    }
    return Promise.resolve().then(() => readWorkbookSync(data, options));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./workbookReader.worker.js', import.meta.url), { type: 'module' });
    const finish = (error, workbook) => {
      clearTimeout(timer); worker.terminate();
      if (error) reject(error); else resolve(workbook);
    };
    const timer = setTimeout(() => finish(new Error('Spreadsheet processing exceeded 15 seconds. Split the file and retry.')), PARSE_TIMEOUT_MS);
    worker.onmessage = event => finish(event.data.error ? new Error(event.data.error) : null, event.data.workbook);
    worker.onerror = () => finish(new Error('Could not process the spreadsheet. Save it as CSV/XLSX and retry.'));
    worker.onmessageerror = () => finish(new Error('Could not read the local parser response. Retry with a smaller file.'));
    try { worker.postMessage({ data, options }); } catch (error) { finish(error); }
  });
}

// Numeric Excel cells can carry an explicit zero-padding format. CSV is read
// with raw:true. Restore formatted identifiers only for columns mapped as text.
export function formattedCellValue(cell) {
  return cell?.t === 'n' && /^0{2,}$/.test(cell.z || '') ? XLSX.utils.format_cell(cell) : cell?.v;
}
