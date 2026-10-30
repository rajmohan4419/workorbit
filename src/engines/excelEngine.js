import * as XLSX from 'xlsx';

/**
 * Reusable Excel & Spreadsheet Engine for OrbitBoard
 * Handles parsing, schema detection, column mapping, validation,
 * transformation, and export for XLSX, XLS, and CSV files.
 */

/**
 * Parse an uploaded File or ArrayBuffer into sheet data and metadata.
 * @param {File|ArrayBuffer|Uint8Array} fileOrBuffer
 * @returns {Promise<{
 *   sheetNames: string[],
 *   selectedSheet: string,
 *   rawRows: any[][],
 *   headers: string[],
 *   rows: Record<string, any>[],
 *   rowCount: number
 * }>}
 */
export async function parseSpreadsheet(fileOrBuffer) {
  let buffer;
  if (fileOrBuffer instanceof Blob || (typeof File !== 'undefined' && fileOrBuffer instanceof File)) {
    buffer = await fileOrBuffer.arrayBuffer();
  } else {
    buffer = fileOrBuffer;
  }

  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('The uploaded file does not contain any readable sheets.');
  }

  const firstSheetName = sheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Extract raw 2D array (header + rows)
  const rawData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawData || rawData.length === 0) {
    return {
      sheetNames,
      selectedSheet: firstSheetName,
      rawRows: [],
      headers: [],
      rows: [],
      rowCount: 0,
    };
  }

  // Find the first non-empty row to use as headers
  let headerIndex = 0;
  for (let i = 0; i < Math.min(rawData.length, 10); i++) {
    const row = rawData[i];
    if (row && row.some(cell => String(cell || '').trim().length > 0)) {
      headerIndex = i;
      break;
    }
  }

  const headerRow = rawData[headerIndex] || [];
  const rawHeaders = headerRow.map((h, i) => {
    const str = String(h ?? '').trim();
    return str || `Column_${i + 1}`;
  });

  // Ensure unique header names
  const headers = [];
  const seenHeaders = new Map();
  rawHeaders.forEach(h => {
    const lower = h.toLowerCase();
    if (seenHeaders.has(lower)) {
      const count = seenHeaders.get(lower) + 1;
      seenHeaders.set(lower, count);
      headers.push(`${h}_${count}`);
    } else {
      seenHeaders.set(lower, 1);
      headers.push(h);
    }
  });

  // Convert subsequent rows into key-value objects
  const rows = [];
  for (let r = headerIndex + 1; r < rawData.length; r++) {
    const rowArray = rawData[r];
    if (!rowArray || rowArray.every(c => c === '' || c === null || c === undefined)) {
      continue; // Skip blank rows
    }

    const rowObj = {};
    headers.forEach((header, colIdx) => {
      let val = rowArray[colIdx];
      if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      }
      rowObj[header] = val ?? '';
    });
    rows.push(rowObj);
  }

  return {
    sheetNames,
    selectedSheet: firstSheetName,
    rawRows: rawData,
    headers,
    rows,
    rowCount: rows.length,
  };
}

/**
 * Infer column data types from samples.
 * Types: 'number' | 'currency' | 'date' | 'email' | 'boolean' | 'text'
 */
export function detectColumnTypes(rows, headers) {
  const types = {};

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
      if (!isNaN(Number(cleanNum)) && cleanNum !== '') {
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
    const mapped = {};
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
 * Schema format:
 * {
 *   [field]: {
 *     required?: boolean,
 *     type?: 'number' | 'date' | 'email' | 'string',
 *     min?: number,
 *     max?: number,
 *     pattern?: RegExp,
 *     customValidator?: (value, row) => string | null (error message)
 *   }
 * }
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
          if (isNaN(num)) {
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
    validCount: validRows.length,
    totalCount: rows.length,
  };
}

/**
 * Export data array or object of sheets to XLSX / CSV Blob
 * @param {{
 *   sheets: Array<{ name: string, data: any[], columns?: string[] }>,
 *   format?: 'xlsx' | 'csv',
 *   filename?: string
 * }} options
 */
export function exportSpreadsheet({ sheets, format = 'xlsx' }) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(sheetDef => {
    const ws = XLSX.utils.json_to_sheet(sheetDef.data, {
      header: sheetDef.columns,
    });
    XLSX.utils.book_append_sheet(wb, ws, sheetDef.name.slice(0, 31) || 'Sheet1');
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
 * Trigger browser file download from Blob
 */
export function downloadSpreadsheetBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

