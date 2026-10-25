import { useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { toCsv, csvToRecords } from '../../lib/csv';
import { downloadBlob } from '../../lib/toolFormat';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB is far more than a typical ledger export

/**
 * Upload a CSV file (parsed in the browser, never sent to a server), or download
 * a template to fill in. Calls onParsed({ headers, records }) on success.
 */
export function ImportPanel({ title, templateName, templateRows, onParsed }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null); // { type: 'ok' | 'error', text }

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-uploading the same file
    if (!file) return;

    if (!/\.csv$/i.test(file.name)) {
      setStatus({ type: 'error', text: 'Please upload a .csv file. In Excel or Sheets, use File → Download → Comma-separated values.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus({ type: 'error', text: 'That file is larger than 2 MB. Split it into smaller files.' });
      return;
    }

    try {
      const text = await file.text();
      const parsed = csvToRecords(text);
      if (parsed.records.length === 0) {
        setStatus({ type: 'error', text: 'The file has a header row but no data rows.' });
        return;
      }
      onParsed(parsed);
      setStatus({ type: 'ok', text: `Loaded ${parsed.records.length} row(s) from ${file.name}.` });
    } catch {
      setStatus({ type: 'error', text: 'Could not read that file. Check that it is a plain CSV.' });
    }
  };

  const handleTemplate = () => {
    const blob = new Blob([toCsv(templateRows)], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, templateName);
  };

  return (
    <div className="rounded-2xl border border-dashed border-[var(--orbit-border)] p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</p>
          <p className="text-xs text-stone-600 dark:text-stone-300">Your file is read in your browser and is not uploaded.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-[var(--orbit-border)] text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
            <Download size={14} /> Template
          </button>
          <button type="button" onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-accent-600 text-white text-xs font-semibold hover:bg-accent-700">
            <Upload size={14} /> Upload CSV
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} aria-label="Upload CSV file" />
        </div>
      </div>
      {status && (
        <p role="status" className={`text-xs font-medium ${status.type === 'ok' ? 'text-accent-700 dark:text-accent-300' : 'text-rose-700 dark:text-rose-300'}`}>
          {status.text}
        </p>
      )}
    </div>
  );
}
