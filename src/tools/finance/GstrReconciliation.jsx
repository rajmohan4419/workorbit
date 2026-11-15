import { useExportFeedback } from '../../lib/feedback/useTaskFeedback';
import { useState, useMemo, useEffect } from 'react';
import { useToolShareContext } from '../../lib/shareResults.js';
import { FinanceFileImport } from '../../components/tools/FinanceFileImport.jsx';
import { reconcileGstrData, detectColumnMapping, normalizeInvoiceRecord, SAMPLE_GSTR_DATA, SAMPLE_PURCHASE_DATA } from './gstrReconciliationEngine.js';
import { exportGstrReport } from '../../engines/financeReports.js';
import { downloadBlob, formatINR } from '../../lib/toolFormat.js';
const FIELDS = [
  { key: 'gstin', label: 'Supplier GSTIN', required: true }, { key: 'invoiceNumber', label: 'Invoice number', required: true },
  { key: 'invoiceDate', label: 'Invoice date' }, { key: 'taxableValue', label: 'Taxable value', required: true },
  ...['igst', 'cgst', 'sgst', 'cess'].map(key => ({ key, label: key.toUpperCase() })),
];
function validate(row, index) {
  const r = normalizeInvoiceRecord(row, {}, 'preview', index);
  return r.errors.map(message => ({ rowNumber: r.rowNumber, message }));
}
export function GstrReconciliation() {
  const feedback = useExportFeedback('spreadsheet');
  const { updateSharePayload, openShareModal } = useToolShareContext();
  const [sources, setSources] = useState({ gstr: null, books: null });
  const [demo, setDemo] = useState(false);
  const [importEpoch, setImportEpoch] = useState(0);
  const [tolerance, setTolerance] = useState(1);
  const ready = Boolean(sources.gstr && sources.books);
  const recon = useMemo(() => ready ? reconcileGstrData(sources.gstr.rows, sources.books.rows, tolerance) : null, [sources, ready, tolerance]);
  useEffect(() => {
    updateSharePayload(recon ? {
      headlineMetric: `${recon.summary.matchedCount} matched invoices`,
      subMetrics: [{ label: 'Requires review', value: String(recon.summary.mismatchCount + recon.summary.reviewCount) }],
      summaryText: 'Matched within configured tolerances. File matching does not determine ITC eligibility.', queryParams: {},
    } : null);
  }, [recon, updateSharePayload]);
  function commit(key, data) {
    // Activating any real file exits demo mode and removes BOTH synthetic sources.
    setSources(previous => ({ ...(demo ? { gstr: null, books: null } : previous), [key]: data }));
    setDemo(false);
  }
  const results = recon ? [
    ...recon.matches.map(m => ({ ...m.gstr, status: m.notes, books: m.pr, diffs: m.componentDiffs, diff: m.diff })),
    ...recon.mismatches.map(m => ({ ...m.gstr, status: m.notes, books: m.pr, diffs: m.componentDiffs, diff: m.diff })),
    ...recon.missingIn2B.map(r => ({ ...r, status: 'Present in uploaded books only' })),
    ...recon.missingInPr.map(r => ({ ...r, status: 'Present in uploaded GSTR-2B only' })),
    ...recon.reviewRecords.map(r => ({ ...r, status: `Requires review: ${r.reviewReason}` })),
    ...recon.invalidRows.map(r => ({ ...r, status: `Rejected: ${r.errors.join(' ')}` })),
  ] : [];
  return <div className="space-y-5 min-w-0">
    <div className="flex flex-wrap gap-3 items-center">
      <button className="orbit-control border rounded-lg" onClick={() => { setImportEpoch(n => n + 1); setDemo(true); setSources({ gstr: { rows: SAMPLE_GSTR_DATA, label: 'Synthetic GSTR-2B demo' }, books: { rows: SAMPLE_PURCHASE_DATA, label: 'Synthetic books demo' } }); }}>Load demo</button>
      <button className="orbit-control border rounded-lg" onClick={() => { setSources({ gstr: null, books: null }); setDemo(false); setImportEpoch(n => n + 1); }}>Reset workspace</button>
      <button className="orbit-control border rounded-lg" disabled={!ready || feedback.busy} onClick={() => feedback.run(() => downloadBlob(exportGstrReport(recon, { gstr: sources.gstr.label, books: sources.books.label }), 'gstr-reconciliation.xlsx'), 'xlsx')}>Export Excel report</button>
      <button className="orbit-control border rounded-lg" disabled={!ready} onClick={() => openShareModal()}>Share scorecard</button>
    </div>
    <p role="status">{demo ? 'Demo mode — synthetic data. Activating a real file clears both demo sources.' : ready ? 'Ready — both sources supplied.' : 'Awaiting both sources. Confirm each import to enable a report.'}</p>
    <p className="text-sm">File matching does not determine ITC eligibility. Missing tax fields are distinct from explicit zero; only mutually available components are compared. Missing identifiers require review.</p>
    <div className="grid md:grid-cols-2 gap-4">
      <FinanceFileImport key={`gstr-${importEpoch}`} title="GSTR-2B" fields={FIELDS} detect={detectColumnMapping} validate={validate} sample={SAMPLE_GSTR_DATA} allowJson activeRows={sources.gstr?.rows} activeLabel={sources.gstr?.label} onCommit={data => commit('gstr', data)} onClear={() => setSources(s => ({ ...s, gstr: null }))} />
      <FinanceFileImport key={`books-${importEpoch}`} title="Purchase register" fields={FIELDS} detect={detectColumnMapping} validate={validate} sample={SAMPLE_PURCHASE_DATA} activeRows={sources.books?.rows} activeLabel={sources.books?.label} onCommit={data => commit('books', data)} onClear={() => setSources(s => ({ ...s, books: null }))} />
    </div>
    <label className="block text-sm">Tolerance per taxable value and each available tax component (₹)
      <select className="orbit-control ml-2" value={tolerance} onChange={e => setTolerance(Number(e.target.value))}>{[0,1,5,10].map(v => <option key={v}>{v}</option>)}</select>
    </label>
    {recon && <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[
        ['Matched', recon.summary.matchedCount], ['Differences', recon.summary.mismatchCount], ['Books only', recon.summary.missingIn2BCount], ['GSTR-2B only', recon.summary.missingInPrCount],
        ['Awaiting review', recon.rowAccounting.awaitingReview], ['Rejected rows', recon.rowAccounting.rejected], ['GSTR-2B taxable', formatINR(recon.summary.totalGstrTaxable)], ['Books taxable', formatINR(recon.summary.totalPrTaxable)],
      ].map(([label, value]) => <div className="border rounded-xl p-3 min-w-0 break-words" key={label}><p className="text-xs">{label}</p><strong>{value}</strong></div>)}</div>
      <p role="status">{recon.rowAccounting.imported} imported rows = {recon.rowAccounting.processed} processed + {recon.rowAccounting.rejected} rejected + {recon.rowAccounting.awaitingReview} awaiting review.</p>
      <div className="overflow-x-auto"><table className="text-xs w-full"><thead><tr>{['Status', 'Source / row', 'GSTIN', 'Original invoice', 'Books invoice / row', 'Taxable', 'Taxable difference', 'Tax-component differences'].map(h => <th className="p-2 text-left" key={h}>{h}</th>)}</tr></thead>
        <tbody>{results.slice(0, 500).map((r, i) => <tr key={i} className="border-b"><td className="p-2">{r.status}</td><td className="p-2">{r.sourceLabel} / {r.rowNumber}</td><td className="p-2">{r.gstin}</td><td className="p-2">{r.invoiceNumber}</td><td className="p-2">{r.books ? `${r.books.invoiceNumber} / ${r.books.rowNumber}` : '—'}</td><td className="p-2">{Number.isFinite(r.taxableValue) ? formatINR(r.taxableValue) : 'Invalid'}</td><td className="p-2">{r.diff ?? '—'}</td><td className="p-2">{r.diffs ? Object.entries(r.diffs).map(([key, v]) => `${key.toUpperCase()}: ${v ?? 'not supplied'}`).join('; ') : '—'}</td></tr>)}</tbody>
      </table></div>{results.length > 500 && <p>Showing first 500 results. Export includes all records.</p>}
    </>}
  </div>;
}
export default GstrReconciliation;
