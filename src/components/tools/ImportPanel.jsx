import { useRef, useState } from 'react';
import { Upload, Download, Link as LinkIcon, Loader2 } from 'lucide-react';
import { toCsv, csvToRecords } from '../../lib/csv';
import { downloadBlob } from '../../lib/toolFormat';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB is far more than a typical ledger export

/**
 * Upload a CSV file (parsed in the browser, never sent to a server), or download
 * a template to fill in. Supports Local file upload and Google Drive link import.
 * Calls onParsed({ headers, records }) on success.
 */
export function ImportPanel({ title, templateName, templateRows, onParsed }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null); // { type: 'ok' | 'error', text }
  const [showDriveInput, setShowDriveInput] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [loadingDrive, setLoadingDrive] = useState(false);

  const processText = (text, filename = 'CSV') => {
    try {
      const parsed = csvToRecords(text);
      if (parsed.records.length === 0) {
        setStatus({ type: 'error', text: 'The file has a header row but no data rows.' });
        return;
      }
      onParsed(parsed);
      setStatus({ type: 'ok', text: `Loaded ${parsed.records.length} row(s) from ${filename}.` });
    } catch {
      setStatus({ type: 'error', text: 'Could not read that file. Check that it is a plain CSV.' });
    }
  };

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
      processText(text, file.name);
    } catch {
      setStatus({ type: 'error', text: 'Could not read that file. Check that it is a plain CSV.' });
    }
  };

  const handleDriveImport = async (e) => {
    e.preventDefault();
    if (!driveUrl.trim()) return;

    const match = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  driveUrl.match(/id=([a-zA-Z0-9_-]+)/) ||
                  driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = match ? match[1] : null;

    if (!fileId) {
      setStatus({ type: 'error', text: 'Invalid Google Drive link. Please use a public "Anyone with link" share URL.' });
      return;
    }

    setLoadingDrive(true);
    setStatus(null);

    try {
      const res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
      if (!res.ok) throw new Error('Could not fetch file.');
      const text = await res.text();
      processText(text, 'Google Drive CSV');
      setShowDriveInput(false);
      setDriveUrl('');
    } catch {
      setStatus({ type: 'error', text: 'Could not read Google Drive file. Ensure link sharing is set to "Anyone with the link".' });
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleTemplate = () => {
    const blob = new Blob([toCsv(templateRows)], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `orbitboard-${templateName}`, 'template');
  };

  return (
    <div className="rounded-2xl border border-dashed border-[var(--orbit-border)] p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</p>
          <p className="text-xs text-stone-600 dark:text-stone-300">Your file is read in your browser and is not uploaded to external servers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-[var(--orbit-border)] text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
            <Download size={14} /> Template
          </button>

          <button type="button" onClick={() => setShowDriveInput(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100">
            <span className="text-amber-500 font-bold">▲</span> Google Drive
          </button>

          <button type="button" onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-accent-600 text-white text-xs font-semibold hover:bg-accent-700">
            <Upload size={14} /> Local CSV
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} aria-label="Upload CSV file" />
        </div>
      </div>

      {showDriveInput && (
        <form onSubmit={handleDriveImport} className="pt-2 border-t border-[var(--orbit-border)] flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <LinkIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="url"
              value={driveUrl}
              onChange={e => setDriveUrl(e.target.value)}
              placeholder="Paste Google Drive share link (Anyone with link)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <button
            type="submit"
            disabled={loadingDrive}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {loadingDrive ? <Loader2 size={13} className="animate-spin" /> : null}
            <span>Import CSV</span>
          </button>
        </form>
      )}

      {status && (
        <p role="status" className={`text-xs font-medium ${status.type === 'ok' ? 'text-accent-700 dark:text-accent-300' : 'text-rose-700 dark:text-rose-300'}`}>
          {status.text}
        </p>
      )}
    </div>
  );
}
