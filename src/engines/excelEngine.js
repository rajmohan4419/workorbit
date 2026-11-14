import * as XLSX from 'xlsx';
import { downloadBlob } from '../lib/toolFormat.js';

/**
 * Reusable Excel & Spreadsheet Engine for OrbitBoard
 * Handles parsing, schema detection, column mapping, validation,
 * transformation, safety limits, CSV sanitization, and export for XLSX, XLS, and CSV files.
 */

/**
 * Parse an uploaded File or ArrayBuffer into sheet data and metadata.
 * Supports choosing a specific worksheet, enforcing file-size and row limits,
 * detecting duplicate/empty headers, and safely preserving dates.
 *
 * @param {File|Blob|ArrayBuffer|Uint8Array} fileOrBuffer
 * @param {Object} [options]
 * @param {string} [options.sheetName] Worksheet to read (defaults to first sheet)
 * @param {number} [options.maxFileSizeMB=25] Max allowed file size in MB
 * @param {number} [options.maxRows=50000] Max allowed rows
 * @returns {Promise<{
 *   sheetNames: string[],
 *   selectedSheet: string,
 *   rawRows: any[][],
 *   headers: string[],
 *   duplicateHeaders: string[],
 *   emptyHeaders: number[],
 *   rows: Record<string, any>[],
 *   rowCount: number
 * }>}
 */
export async function parseSpreadsheet(fileOrBuffer, options = {}) {
  const {
    sheetName = null,
    maxColumns = 256,
    maxFileSizeMB = 25,
    maxRows = 50000,
  } = options;

  let buffer;

  if (fileOrBuffer instanceof Blob || (typeof File !== 'undefined' && fileOrBuffer instanceof File)) {
    const size = fileOrBuffer.size;
    if (size > maxFileSizeMB * 1024 * 1024) {
      throw new Error(`File size (${(size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum limit of ${maxFileSizeMB} MB.`);
    }
    buffer = await fileOrBuffer.arrayBuffer();
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    const size = fileOrBuffer.byteLength;
    if (size > maxFileSizeMB * 1024 * 1024) {
      throw new Error(`File size (${(size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum limit of ${maxFileSizeMB} MB.`);
    }
    buffer = fileOrBuffer;
  } else if (fileOrBuffer && fileOrBuffer.buffer instanceof ArrayBuffer) {
    const size = fileOrBuffer.byteLength;
    if (size > maxFileSizeMB * 1024 * 1024) {
      throw new Error(`File size (${(size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum limit of ${maxFileSizeMB} MB.`);
    }
    buffer = fileOrBuffer.buffer.slice(fileOrBuffer.byteOffset || 0, (fileOrBuffer.byteOffset || 0) + fileOrBuffer.byteLength);
  } else {
    buffer = fileOrBuffer;
  }

  let workbook;
  try {
    workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false,
      raw: true,
      sheetRows: maxRows + 12,
    });
  } catch (err) {
    throw new Error(`Malformed or unsupported spreadsheet file: ${err.message}`, { cause: err });
  }

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('The spreadsheet does not contain any readable worksheets.');
  }

  // Select target sheet
  if (sheetName && !sheetNames.includes(sheetName)) throw new Error(`Worksheet "${sheetName}" could not be found.`);
  const selectedSheet = (sheetName && sheetNames.includes(sheetName))
    ? sheetName
    : sheetNames[0];

  const worksheet = workbook.Sheets[selectedSheet];
  if (!worksheet) {
    throw new Error(`Worksheet "${selectedSheet}" could not be found in the workbook.`);
  }

  const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
  if (range && range.e.c >= maxColumns) throw new Error(`Worksheet exceeds maximum column limit of ${maxColumns}.`);
  const originalRange = worksheet['!fullref'] || worksheet['!ref'];
  if (originalRange && XLSX.utils.decode_range(originalRange).e.r > maxRows + 10) throw new Error(`Worksheet exceeds maximum row limit of ${maxRows} rows.`);
  // Extract raw 2D array (header + rows)
  const rawData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawData || rawData.length === 0) {
    return {
      sheetNames,
      selectedSheet,
      rawRows: [],
      headers: [],
      duplicateHeaders: [],
      emptyHeaders: [],
      rows: [],
      rowCount: 0,
    };
  }

  // Find the first non-empty row to use as headers
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rawData.length, 10); i++) {
    const row = rawData[i];
    if (row && row.some(cell => String(cell ?? '').trim().length > 0)) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return {
      sheetNames,
      selectedSheet,
      rawRows: rawData,
      headers: [],
      duplicateHeaders: [],
      emptyHeaders: [],
      rows: [],
      rowCount: 0,
    };
  }

  const width = Math.max(...rawData.map(row => row.length));
  const headerRow = Array.from({length:width}, (_,i) => rawData[headerIndex]?.[i] ?? "");
  const duplicateHeaders = [];
  const emptyHeaders = [];

  const rawHeaders = headerRow.map((h, i) => {
    const str = String(h ?? '').trim();
    if (!str) {
      emptyHeaders.push(i + 1);
      return `Column_${i + 1}`;
    }
    return str;
  });

  // Ensure unique header names and detect duplicates
  const headers = [];
  const usedHeaders = new Set();
  rawHeaders.forEach(h => {
    let candidate = h, suffix = 2;
    while (usedHeaders.has(candidate.toLowerCase())) candidate = `${h}_${suffix++}`;
    if (candidate !== h) duplicateHeaders.push(h);
    usedHeaders.add(candidate.toLowerCase());
    headers.push(candidate);
  });

  // Convert subsequent rows into key-value objects
  const rows = [];
  for (let r = headerIndex + 1; r < rawData.length; r++) {
    const rowArray = rawData[r];
    if (!rowArray || rowArray.every(c => c === '' || c === null || c === undefined)) {
      continue; // Skip blank rows
    }

    const rowObj = Object.create(null);
    headers.forEach((header, colIdx) => {
      let val = rowArray[colIdx];
      if (val instanceof Date) {
        val = formatUtcDate(val);
      } else if (typeof val === 'number' && /date/i.test(header) && isLikelySerialDate(val)) {
        val = formatSerialDate(val);
      }
      rowObj[header] = val ?? '';
    });
    rows.push(rowObj);

    if (rows.length > maxRows) {
      throw new Error(`Worksheet exceeds maximum row limit of ${maxRows.toLocaleString()} rows (found > ${maxRows.toLocaleString()}).`);
    }
  }

  return {
    sheetNames,
    selectedSheet,
    rawRows: rawData,
    headers,
    duplicateHeaders: [...new Set(duplicateHeaders)],
    emptyHeaders,
    rows,
    rowCount: rows.length,
  };
}

function formatUtcDate(d) {
  if (isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isLikelySerialDate(num) {
  // Typical Excel serial date range: 25000 (year 1968) to 60000 (year 2064)
  // Only treat as date if it's integer or exact day fraction
  return num >= 25000 && num <= 65000 && Math.floor(num) === num;
}

function formatSerialDate(serial) {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(excelEpoch.getTime() + serial * 86400000);
  return formatUtcDate(date);
}

/**
 * Infer column data types from samples.
 * Types: 'number' | 'currency' | 'date' | 'email' | 'boolean' | 'text'
 */
export function detectColumnTypes(rows, headers) {
  const types = Object.create(null);

  headers.forEach(header => {
    let numCount = 0;
    let dateCount = 0;
    let emailCount = 0;
    let boolCount = 0;
    let totalNonEmpty = 0;

    const sample = rows.slice(0, 100);
    sample.forEach(row => {
      const val = row[header];
      if (val === null || val === undefined || String(val).trim() === '') return;

      totalNonEmpty++;
      const str = String(val).trim();

      // Check Boolean
      if (/^(true|false|yes|no|1|0)$/i.test(str)) {
        boolCount++;
      }

      // Check Number / Currency
      const cleanNum = str.replace(/[$€£₹,\s]/g, '');
      if (Number.isFinite(Number(cleanNum)) && cleanNum !== '' && !/^0\d+$/.test(str) && !/^\d{16,}$/.test(str)) {
        numCount++;
      }

      // Check Email
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
        emailCount++;
      }

      // Check Date
      if (!isNaN(Date.parse(str)) && (str.includes('/') || str.includes('-') || str.includes('.'))) {
        dateCount++;
      }
    });

    if (totalNonEmpty === 0) {
      types[header] = 'text';
    } else if (numCount / totalNonEmpty > 0.8) {
      types[header] = 'number';
    } else if (dateCount / totalNonEmpty > 0.8) {
      types[header] = 'date';
    } else if (emailCount / totalNonEmpty > 0.8) {
      types[header] = 'email';
    } else if (boolCount / totalNonEmpty > 0.8) {
      types[header] = 'boolean';
    } else {
      types[header] = 'text';
    }
  });

  return types;
}

/**
 * Remap rows according to a mapping definition { targetKey: sourceHeaderName }
 */
export function applyColumnMapping(rows, mapping) {
  return rows.map(row => {
    const mapped = Object.create(null);
    Object.entries(mapping).forEach(([targetKey, sourceHeader]) => {
      if (sourceHeader && row[sourceHeader] !== undefined) {
        mapped[targetKey] = row[sourceHeader];
      } else {
        mapped[targetKey] = null;
      }
    });
    return mapped;
  });
}

/**
 * Validate mapped or raw rows against a schema.
 */
export function validateRows(rows, schema) {
  const errors = [];
  const validRows = [];

  rows.forEach((row, rowIndex) => {
    let rowHasError = false;

    Object.entries(schema).forEach(([field, rules]) => {
      const val = row[field];
      const strVal = String(val ?? '').trim();
      const isEmpty = strVal === '';

      if (rules.required && isEmpty) {
        errors.push({
          row: rowIndex + 1,
          field,
          value: val,
          message: `Field "${field}" is required.`,
        });
        rowHasError = true;
        return;
      }

      if (!isEmpty) {
        if (rules.type === 'number') {
          const num = Number(strVal.replace(/[$€£₹,\s]/g, ''));
          if (!Number.isFinite(num) || strVal.replace(/[$€£₹,\s]/g, '') === '') {
            errors.push({
              row: rowIndex + 1,
              field,
              value: val,
              message: `Must be a valid number.`,
            });
            rowHasError = true;
          } else {
            if (rules.min !== undefined && num < rules.min) {
              errors.push({
                row: rowIndex + 1,
                field,
                value: val,
                message: `Minimum value is ${rules.min}.`,
              });
              rowHasError = true;
            }
            if (rules.max !== undefined && num > rules.max) {
              errors.push({
                row: rowIndex + 1,
                field,
                value: val,
                message: `Maximum value is ${rules.max}.`,
              });
              rowHasError = true;
            }
          }
        } else if (rules.type === 'date') {
          if (isNaN(Date.parse(strVal))) {
            errors.push({
              row: rowIndex + 1,
              field,
              value: val,
              message: `Must be a valid date.`,
            });
            rowHasError = true;
          }
        } else if (rules.type === 'email') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
            errors.push({
              row: rowIndex + 1,
              field,
              value: val,
              message: `Invalid email address format.`,
            });
            rowHasError = true;
          }
        }

        if (rules.pattern && !rules.pattern.test(strVal)) {
          errors.push({
            row: rowIndex + 1,
            field,
            value: val,
            message: rules.patternMessage || `Value does not match required pattern.`,
          });
          rowHasError = true;
        }

        if (rules.customValidator) {
          const customErr = rules.customValidator(val, row);
          if (customErr) {
            errors.push({
              row: rowIndex + 1,
              field,
              value: val,
              message: customErr,
            });
            rowHasError = true;
          }
        }
      }
    });

    if (!rowHasError) {
      validRows.push(row);
    }
  });

  return {
    isValid: errors.length === 0,
    validRows,
    errors,
    errorCount: errors.length,
    invalidCount: rows.length - validRows.length,
    validCount: validRows.length,
    totalCount: rows.length,
  };
}

/**
 * Sanitizes untrusted cell values to prevent CSV Formula Injection (CWE-1236).
 * Prepend a single quote `'` if the cell begins with `=`, `+`, `-`, `@`, `\t`, or `\r`.
 */
export function sanitizeCsvCell(val) {
  if (typeof val !== 'string') return val;
  if (/^[=+\-@\t\r]/.test(val)) {
    return `'${val}`;
  }
  return val;
}

/**
 * Export data array or object of sheets to XLSX / CSV Blob.
 * Automatically guards CSV exports against formula injection.
 *
 * @param {{
 *   sheets: Array<{ name: string, data: any[], columns?: string[] }>,
 *   format?: 'xlsx' | 'csv',
 *   sanitizeFormulaInjection?: boolean
 * }} options
 */
export function exportSpreadsheet({ sheets, format = 'xlsx', sanitizeFormulaInjection = true }) {
  if (!['xlsx','csv'].includes(format) || !sheets?.length) throw new Error('Choose XLSX or CSV and at least one sheet.');
  if (format === 'csv' && sheets.length !== 1) throw new Error('CSV export supports one worksheet at a time.');
  const wb = XLSX.utils.book_new();

  sheets.forEach(sheetDef => {
    let exportData = sheetDef.data;

    // Apply formula injection protection for CSV or when enabled
    if (sanitizeFormulaInjection && format === 'csv') {
      exportData = sheetDef.data.map(row => {
        const sanitizedRow = Object.create(null);
        Object.entries(row).forEach(([k, v]) => {
          sanitizedRow[k] = sanitizeCsvCell(v);
        });
        return sanitizedRow;
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData, {
      header: sheetDef.columns,
    });
    if (format === 'csv' && sanitizeFormulaInjection && ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = ws[XLSX.utils.encode_cell({r:range.s.r,c:col})];
        if (cell) cell.v = sanitizeCsvCell(cell.v);
      }
    }
    let name = String(sheetDef.name || 'Sheet1').replace(/[\\/?*[\]:]/g, '_').slice(0,31) || 'Sheet1';
    const base = name; let suffix = 2;
    while (wb.SheetNames.some(existing=>existing.toLowerCase()===name.toLowerCase())) { const ending = `_${suffix++}`; name=base.slice(0,31-ending.length)+ending; }
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  if (format === 'csv') {
    const firstSheetName = wb.SheetNames[0];
    const csvString = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheetName]);
    return new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Export downloadable validation error report as XLSX or CSV Blob
 */
export function exportValidationErrorReport(errors, format = 'xlsx') {
  const reportData = errors.map(err => ({
    'Row Number': err.row,
    'Field Name': err.field,
    'Invalid Value': String(err.value ?? ''),
    'Error Details': err.message,
  }));

  return exportSpreadsheet({
    sheets: [{ name: 'Validation Errors', data: reportData }],
    format,
  });
}

/**
 * Trigger browser file download from Blob
 */
export function downloadSpreadsheetBlob(blob, filename) {
  return downloadBlob(blob, filename);
}

/**
 * Bulk / Batch Processing helper for multiple spreadsheet files or multi-sheet workbooks.
 * Requires bulk_processing entitlement when invoked in user workflows.
 */
export async function processSpreadsheetBatch(files, options = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('At least one file is required for batch processing.');
  }
  if (files.length > 10) throw new Error('Batch limit is 10 files.');
  if (files.reduce((sum,file)=>sum+(file?.size || file?.byteLength || 0),0) > 50*1024*1024) throw new Error('Combined batch size exceeds 50 MB.');
  const results = [];
  const allRows = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = file?.name || `file_${i + 1}.xlsx`;
    const parsed = await parseSpreadsheet(file, options);
    let validation = null;
    if (options.schema) {
      validation = validateRows(parsed.rows, options.schema);
    }
    results.push({
      filename: name,
      rowCount: parsed.rowCount,
      errors: validation?.errors || [],
      sheetNames: parsed.sheetNames,
    });
    if (allRows.length + parsed.rows.length > (options.maxRows || 50000)) throw new Error('Combined batch exceeds maximum row limit.');
    allRows.push(...parsed.rows);
  }
  return {
    totalFiles: files.length,
    totalRows: allRows.length,
    results,
    allRows,
  };
}
