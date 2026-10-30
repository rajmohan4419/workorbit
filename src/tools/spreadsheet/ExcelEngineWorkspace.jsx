import { useState, useMemo } from 'react';
import {
  Upload, FileSpreadsheet, Download, Check, AlertCircle, ShieldCheck
} from 'lucide-react';
import {
  parseSpreadsheet,
  detectColumnTypes,
  validateRows,
  exportSpreadsheet,
  downloadSpreadsheetBlob,
} from '../../engines/excelEngine';

export default function ExcelEngineWorkspace() {
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [colTypes, setColTypes] = useState({});
  const [error, setError] = useState(null);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Validation state
  const [validationSchema, setValidationSchema] = useState({});
  const [validationResults, setValidationResults] = useState(null);

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    try {
      setError(null);
      setFileName(uploadedFile.name);

      const parsed = await parseSpreadsheet(uploadedFile);
      setHeaders(parsed.headers);
      setRows(parsed.rows);

      const detectedTypes = detectColumnTypes(parsed.rows, parsed.headers);
      setColTypes(detectedTypes);

      // Initialize default schema
      const initialSchema = {};
      parsed.headers.forEach(h => {
        initialSchema[h] = {
          required: false,
          type: detectedTypes[h] || 'text',
        };
      });
      setValidationSchema(initialSchema);
      setValidationResults(null);
      setPage(1);
    } catch (err) {
      setError(`Failed to read spreadsheet: ${err.message}`);
    }
  };

  const handleValidate = () => {
    if (!rows.length) return;
    const res = validateRows(rows, validationSchema);
    setValidationResults(res);
  };

  const handleTransform = (transformType, column) => {
    if (!rows.length || !column) return;
    const updated = rows.map(r => {
      const val = r[column];
      let newVal = val;
      if (transformType === 'trim') {
        newVal = String(val ?? '').trim();
      } else if (transformType === 'upper') {
        newVal = String(val ?? '').toUpperCase();
      } else if (transformType === 'lower') {
        newVal = String(val ?? '').toLowerCase();
      } else if (transformType === 'num_clean') {
        const cleaned = String(val ?? '').replace(/[$€£₹,\s]/g, '');
        newVal = isNaN(Number(cleaned)) ? val : Number(cleaned);
      }
      return { ...r, [column]: newVal };
    });
    setRows(updated);
    if (validationResults) {
      setValidationResults(validateRows(updated, validationSchema));
    }
  };

  const handleExport = (format) => {
    if (!rows.length) return;
    const blob = exportSpreadsheet({
      sheets: [{ name: 'Processed Data', data: rows }],
      format,
    });
    const baseName = fileName.replace(/\.[^/.]+$/, '') || 'processed_spreadsheet';
    downloadSpreadsheetBlob(blob, `${baseName}_exported.${format}`);
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r =>
      headers.some(h => String(r[h] ?? '').toLowerCase().includes(term))
    );
  }, [rows, headers, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const displayedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const loadDemoData = () => {
    const demoHeaders = ['Order ID', 'Customer Email', 'Amount', 'Status', 'Date'];
    const demoRows = [
      { 'Order ID': 'ORD-101', 'Customer Email': 'raj@example.com', 'Amount': 4500, 'Status': 'Paid', 'Date': '2025-03-01' },
      { 'Order ID': 'ORD-102', 'Customer Email': 'sneha@company.in', 'Amount': 12000, 'Status': 'Pending', 'Date': '2025-03-02' },
      { 'Order ID': 'ORD-103', 'Customer Email': 'invalid-email', 'Amount': 850, 'Status': 'Paid', 'Date': '2025-03-04' },
      { 'Order ID': '', 'Customer Email': 'alex@cloud.co', 'Amount': 22500, 'Status': 'Paid', 'Date': '2025-03-05' },
      { 'Order ID': 'ORD-105', 'Customer Email': 'vikram@domain.com', 'Amount': -100, 'Status': 'Refunded', 'Date': '2025-03-07' },
    ];
    setFileName('Ecommerce_Orders_Demo.xlsx');
    setHeaders(demoHeaders);
    setRows(demoRows);
    const types = detectColumnTypes(demoRows, demoHeaders);
    setColTypes(types);
    setValidationSchema({
      'Order ID': { required: true, type: 'text' },
      'Customer Email': { required: true, type: 'email' },
      'Amount': { required: true, type: 'number', min: 0 },
      'Status': { required: true, type: 'text' },
      'Date': { required: true, type: 'date' },
    });
    setValidationResults(null);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--orbit-border)] bg-stone-50/60 dark:bg-stone-900/60">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-500" size={22} />
            Excel & CSV Processing Engine
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Universal XLSX/CSV spreadsheet engine with schema validation, column mapping, data cleaning, and export.
          </p>
        </div>
        <button
          type="button"
          onClick={loadDemoData}
          className="px-3.5 py-1.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-50 shadow-xs transition"
        >
          Load Demo Sheet
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      {!rows.length && (
        <label className="border-2 border-dashed border-[var(--orbit-border)] hover:border-emerald-500 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer bg-stone-50/40 dark:bg-stone-900/40 transition">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          <Upload size={32} className="text-emerald-500 mb-2" />
          <span className="text-sm font-bold text-stone-800 dark:text-stone-200">
            Upload XLSX, XLS, or CSV Spreadsheet
          </span>
          <span className="text-xs text-stone-400 mt-1">
            Processes 100% locally in your browser without uploading to external servers
          </span>
        </label>
      )}

      {/* Data Ingestion Workspace */}
      {rows.length > 0 && (
        <div className="space-y-6">
          {/* Controls strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-200">
                {fileName} ({rows.length} rows, {headers.length} columns)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleValidate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition"
              >
                <ShieldCheck size={14} />
                Validate Schema
              </button>
              <button
                type="button"
                onClick={() => handleExport('xlsx')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition"
              >
                <Download size={14} />
                Export XLSX
              </button>
              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium text-xs transition"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Validation Report Banner */}
          {validationResults && (
            <div className={`p-4 rounded-xl border text-xs ${
              validationResults.isValid
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  {validationResults.isValid ? <Check size={16} /> : <AlertCircle size={16} />}
                  {validationResults.isValid
                    ? `All ${validationResults.totalCount} rows passed schema validation.`
                    : `Found ${validationResults.errorCount} validation issues across ${validationResults.totalCount} rows.`}
                </span>
                <span className="text-[11px]">
                  {validationResults.validCount} valid / {validationResults.errorCount} invalid
                </span>
              </div>
              {!validationResults.isValid && validationResults.errors.length > 0 && (
                <div className="mt-2.5 max-h-32 overflow-y-auto space-y-1">
                  {validationResults.errors.slice(0, 5).map((err, i) => (
                    <div key={i} className="text-[11px] font-mono bg-white/60 dark:bg-black/20 p-1.5 rounded">
                      Row {err.row}: {err.field} — {err.message} (Value: "{String(err.value ?? '')}")
                    </div>
                  ))}
                  {validationResults.errors.length > 5 && (
                    <div className="text-[10px] text-stone-500">
                      + {validationResults.errors.length - 5} more issues...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Transformations Bar */}
          <div className="p-3.5 rounded-xl border border-[var(--orbit-border)] bg-stone-50/70 dark:bg-stone-850/60 text-xs flex flex-wrap items-center gap-3">
            <span className="font-bold text-stone-600 dark:text-stone-300">Clean Column:</span>
            {headers.slice(0, 4).map(h => (
              <div key={h} className="flex items-center gap-1 bg-white dark:bg-stone-800 border border-[var(--orbit-border)] px-2 py-1 rounded-lg">
                <span className="font-mono text-[11px] text-stone-500">{h}:</span>
                <button
                  type="button"
                  onClick={() => handleTransform('trim', h)}
                  className="hover:text-accent-600 text-[10px] px-1 font-semibold"
                  title="Trim extra whitespace"
                >
                  Trim
                </button>
                <span className="text-stone-300">|</span>
                <button
                  type="button"
                  onClick={() => handleTransform('upper', h)}
                  className="hover:text-accent-600 text-[10px] px-1 font-semibold"
                  title="To Uppercase"
                >
                  UPPER
                </button>
              </div>
            ))}
          </div>

          {/* Interactive Data Table Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="Search across all columns..."
                className="w-full max-w-xs rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 outline-none"
              />
              <span className="text-xs text-stone-400">
                Page {page} of {totalPages}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--orbit-border)] bg-stone-50/80 dark:bg-stone-850/80 text-stone-600 dark:text-stone-300 font-bold">
                    <th className="py-2.5 px-3 w-12 text-stone-400">#</th>
                    {headers.map(h => (
                      <th key={h} className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{h}</span>
                          <span className="text-[10px] font-mono px-1 rounded bg-stone-200 dark:bg-stone-750 text-stone-600 dark:text-stone-400">
                            {colTypes[h] || 'text'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--orbit-border)]">
                  {displayedRows.map((row, i) => (
                    <tr key={i} className="hover:bg-stone-50/50 dark:hover:bg-stone-850/50">
                      <td className="py-2 px-3 text-stone-400 font-mono text-[11px]">
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      {headers.map(h => (
                        <td key={h} className="py-2 px-3 text-stone-800 dark:text-stone-200 font-mono">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-[var(--orbit-border)] text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-stone-500">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(filteredRows.length, page * pageSize)} of {filteredRows.length} rows
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-lg border border-[var(--orbit-border)] text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
