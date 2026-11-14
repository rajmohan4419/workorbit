import { useMemo, useRef, useState } from 'react';
import { readFinanceFile, financeSheetRows, mapFinanceRows, FINANCE_SCOPE } from '../../engines/financeImport.js';
import { exportSpreadsheet, downloadSpreadsheetBlob } from '../../engines/excelEngine.js';

/** Staged local import. The active source changes only after explicit confirmation. */
export function FinanceFileImport({ title, fields, detect, validate, onCommit, onClear, activeLabel, activeRows, sample, allowJson = false }) {
  const [loaded, setLoaded] = useState(null);
  const [sheet, setSheet] = useState('');
  const [header, setHeader] = useState(1);
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const activeStats = useMemo(() => {
    if (!activeRows) return null;
    const errors = activeRows.flatMap((row, index) => validate(row, index));
    const rejected = new Set(errors.map(e => e.rowNumber)).size;
    return { accepted: activeRows.length - rejected, rejected };
  }, [activeRows, validate]);
  const staged = useMemo(() => {
    if (!loaded) return null;
    try { return financeSheetRows(loaded, sheet, header); } catch (e) { return { error: e.message }; }
  }, [loaded, sheet, header]);
  const preview = useMemo(() => {
    if (!staged || staged.error) return null;
    try {
      if (fields.some(f => f.required && !mapping[f.key])) throw new Error('Map all required fields before confirming.');
      const rows = mapFinanceRows(staged.rows, mapping, sheet);
      const errors = rows.flatMap((row, index) => validate(row, index));
      const rejected = new Set(errors.map(e => e.rowNumber)).size;
      return { rows, errors, accepted: rows.length - rejected, rejected };
    } catch (e) { return { error: e.message }; }
  }, [staged, mapping, fields, validate, sheet]);
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const id = ++request.current;
    setBusy(true); setError('');
    try {
      const data = await readFinanceFile(file, allowJson);
      if (id !== request.current) return;
      data.name = file.name;
      setLoaded(data); setSheet(data.sheetNames[0]); setHeader(1);
      try { setMapping(detect(financeSheetRows(data, data.sheetNames[0], 1).headers)); } catch { setMapping({}); }
    } catch (e) { if (id === request.current) { setError(e.message + ' Your active dataset is unchanged.'); setLoaded(null); } }
    finally { if (id === request.current) setBusy(false); }
  }
  function choose(nextSheet, nextHeader) {
    setSheet(nextSheet); setHeader(nextHeader);
    try { setMapping(detect(financeSheetRows(loaded, nextSheet, nextHeader).headers)); } catch { setMapping({}); }
  }
  return <section className="min-w-0 rounded-xl border border-[var(--orbit-border)] p-4 space-y-3">
    <h3 className="font-semibold">{title}</h3>
    <p className="text-xs break-all">Active source: {activeLabel || 'Not supplied'}</p>
    <p role="status" className="text-xs">{activeStats ? `${activeStats.accepted} accepted / ${activeStats.rejected} rejected active rows` : 'No active rows'}</p>
    <p className="text-xs">Read locally in your browser. {FINANCE_SCOPE}</p>
    <label className="block text-sm">Choose replacement file
      <input aria-label={`Upload ${title}`} type="file" accept={allowJson ? '.csv,.xlsx,.xls,.json' : '.csv,.xlsx,.xls'} onChange={upload} disabled={busy} className="block w-full text-xs my-2" />
    </label>
    <div className="flex flex-wrap gap-3 text-sm">
      <button type="button" onClick={() => { request.current++; setBusy(false); setLoaded(null); setError(''); onClear(); }}>Clear source</button>
      <button type="button" onClick={() => downloadSpreadsheetBlob(exportSpreadsheet({ sheets: [{ name: 'Synthetic sample', data: sample }] }), `${allowJson ? 'gstr' : 'source'}-synthetic-sample.xlsx`)}>Download synthetic template</button>
      {allowJson && <a href="/samples/gstr2b-v1.json" download>JSON template</a>}
    </div>
    {busy && <p role="status">Reading local file…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {loaded && <div className="space-y-3">
      <p className="text-sm">Replacement preview — confirm to activate. Previous source remains active until then.</p>
      <label className="block text-sm">Worksheet <select aria-label={`${title} worksheet`} value={sheet} onChange={e => choose(e.target.value, 1)} className="orbit-control max-w-full">{loaded.sheetNames.map(s => <option key={s}>{s}</option>)}</select></label>
      {!loaded.jsonRows && <label className="block text-sm">Header row <input aria-label={`${title} header row`} type="number" min="1" max="100" value={header} onChange={e => choose(sheet, Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="orbit-control w-24" /></label>}
      {staged?.error ? <p role="alert">{staged.error}</p> : <>
        <div className="grid sm:grid-cols-2 gap-2">{fields.map(field => <label key={field.key} className="min-w-0 text-xs">{field.label}{field.required ? ' *' : ''}
          <select aria-label={`${title} ${field.label}`} className="orbit-control w-full" value={mapping[field.key] || ''} onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value }))}>
            <option value="">Not supplied</option>{staged.headers.map(h => <option key={h}>{h}</option>)}
          </select>
        </label>)}</div>
        <div className="overflow-x-auto max-h-44"><table className="text-xs"><caption>First five source rows</caption><thead><tr>{staged.headers.map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{staged.rows.slice(0, 5).map((r, i) => <tr key={i}>{staged.headers.map(h => <td key={h} className="p-2 whitespace-nowrap">{r[h] instanceof Date ? r[h].toISOString().slice(0, 10) : String(r[h] ?? '')}</td>)}</tr>)}</tbody></table></div>
        {preview?.error ? <p role="alert">{preview.error}</p> : <p role="status">{preview?.accepted} accepted / {preview?.rejected} rejected of {staged.rows.length} rows. Rejected rows remain in the report.</p>}
        <div className="max-h-40 overflow-y-auto text-xs" role="status">{preview?.errors?.slice(0, 100).map((e, i) => <p key={i}>Row {e.rowNumber}: {e.message}</p>)}</div>
        <button type="button" className="orbit-control border rounded-lg" disabled={!preview?.accepted || busy} onClick={() => { onCommit({ rows: preview.rows, label: `${loaded.name} / ${sheet}`, scope: FINANCE_SCOPE }); setLoaded(null); }}>Confirm mapping and use source</button>
      </>}
      <button type="button" onClick={() => setLoaded(null)}>Cancel replacement</button>
    </div>}
  </section>;
}
