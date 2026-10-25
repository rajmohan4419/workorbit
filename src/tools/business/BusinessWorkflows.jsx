import { useMemo, useState } from 'react';
import { Field, Result } from '../../components/tools/ToolFields';
import { ImportPanel } from '../../components/tools/ImportPanel';
import { money, downloadBlob } from '../../lib/toolFormat';
import { mapColumns, toCsv } from '../../lib/csv';
import { applyLookup } from '../../lib/lookup';
import { computeAging, AGING_BUCKETS, INVOICE_ALIASES } from './invoiceAging';
import { computeDecisionMatrix } from './decisionMatrix';

const today = () => new Date().toISOString().slice(0, 10);

const blankInvoice = (n) => ({ id: `INV-${n}`, customer: '', amount: '', paid: '', dueDate: '', invoiceDate: '', termsDays: '' });

const INVOICE_TEMPLATE = [
  ['Invoice', 'Customer', 'Amount', 'Paid', 'Due Date', 'Invoice Date', 'Terms (days)'],
  ['INV-001', 'Acme Pvt Ltd', '50000', '0', '2026-09-30', '', ''],
  ['INV-002', 'Beta Traders', '12000', '5000', '', '2026-09-01', '30'],
];

const MATRIX_TEMPLATE = [
  ['Criterion', 'Weight', 'Vendor A', 'Vendor B', 'Vendor C'],
  ['Price', '3', '8', '6', '7'],
  ['Support', '2', '5', '9', '6'],
  ['Ease of use', '1', '7', '7', '9'],
];

export function InvoiceAging() {
  const [invoices, setInvoices] = useState([blankInvoice(1), blankInvoice(2)]);
  const [customColumns, setCustomColumns] = useState([]);
  const [newColumn, setNewColumn] = useState('');
  const [asOf, setAsOf] = useState(today());
  const [groupBy, setGroupBy] = useState('');
  const [importNote, setImportNote] = useState(null);
  const [lookupTable, setLookupTable] = useState(null);
  const [lookupConfig, setLookupConfig] = useState({ invoiceKey: 'customer', lookupKey: '', returnCol: '' });
  const [lookupNote, setLookupNote] = useState(null);

  const update = (i, key, value) => setInvoices(prev => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  const updateExtra = (i, col, value) => setInvoices(prev => prev.map((r, idx) => (idx === i ? { ...r, extra: { ...r.extra, [col]: value } } : r)));
  const remove = (i) => setInvoices(prev => prev.filter((_, idx) => idx !== i));

  const builtInLabels = ['invoice', 'customer', 'amount', 'paid', 'due date', 'invoice date', 'terms (days)'];

  const addColumn = () => {
    const name = newColumn.trim();
    if (!name) return;
    if (builtInLabels.includes(name.toLowerCase()) || customColumns.includes(name)) {
      setImportNote({ type: 'error', text: `"${name}" already exists as a column.` });
      return;
    }
    setCustomColumns(prev => [...prev, name]);
    setInvoices(prev => prev.map(r => ({ ...r, extra: { ...r.extra, [name]: '' } })));
    setNewColumn('');
  };

  const removeColumn = (name) => {
    setCustomColumns(prev => prev.filter(c => c !== name));
    setInvoices(prev => prev.map(r => {
      const rest = Object.fromEntries(Object.entries(r.extra || {}).filter(([k]) => k !== name));
      return { ...r, extra: rest };
    }));
    if (groupBy === name) setGroupBy('');
  };

  const handleImport = ({ headers, records }) => {
    const map = mapColumns(headers, INVOICE_ALIASES);
    const missing = [];
    if (!map.amount) missing.push('Amount');
    if (!map.dueDate && !(map.invoiceDate && map.termsDays)) missing.push('Due Date (or Invoice Date and Terms)');
    if (missing.length) {
      setImportNote({ type: 'error', text: `Missing column(s): ${missing.join(', ')}. Use the template for the expected headings.` });
      return;
    }
    const known = Object.values(map).filter(Boolean);
    const extraHeaders = headers.map(h => h.trim()).filter(h => h && !known.includes(h));
    const rows = records.map((rec, i) => ({
      id: map.id ? rec[map.id] : `Row ${i + 1}`,
      customer: map.customer ? rec[map.customer] : '',
      amount: map.amount ? rec[map.amount] : '',
      paid: map.paid ? rec[map.paid] : '',
      dueDate: map.dueDate ? rec[map.dueDate] : '',
      invoiceDate: map.invoiceDate ? rec[map.invoiceDate] : '',
      termsDays: map.termsDays ? rec[map.termsDays] : '',
      extra: Object.fromEntries(extraHeaders.map(h => [h, rec[h] ?? ''])),
    }));
    setCustomColumns(extraHeaders);
    setInvoices(rows);
    setGroupBy('');
    setImportNote({
      type: 'ok',
      text: `Imported ${rows.length} invoice(s)${extraHeaders.length ? ` and ${extraHeaders.length} custom column(s): ${extraHeaders.join(', ')}` : ''}.`,
    });
  };

  const handleLookupImport = ({ headers, records }) => {
    setLookupTable({ headers, records });
    setLookupConfig({
      invoiceKey: 'customer',
      lookupKey: headers[0] || '',
      returnCol: headers[1] || '',
    });
    setLookupNote({ type: 'ok', text: `Lookup table loaded: ${records.length} row(s). Choose the columns to match, then apply.` });
  };

  const applyLookupNow = () => {
    if (!lookupTable || !lookupConfig.lookupKey || !lookupConfig.returnCol) {
      setLookupNote({ type: 'error', text: 'Load a lookup table and choose the key and return columns first.' });
      return;
    }
    const keys = invoices.map(inv => (lookupConfig.invoiceKey === 'customer' ? inv.customer : inv.extra?.[lookupConfig.invoiceKey] ?? ''));
    const res = applyLookup({
      rowKeys: keys,
      lookupRows: lookupTable.records,
      lookupKey: lookupConfig.lookupKey,
      returnCol: lookupConfig.returnCol,
    });
    const col = lookupConfig.returnCol;
    if (!customColumns.includes(col)) setCustomColumns(prev => [...prev, col]);
    setInvoices(prev => prev.map((inv, i) => ({ ...inv, extra: { ...inv.extra, [col]: res.values[i] } })));

    const parts = [`Matched ${res.matched} row(s)`, `${res.unmatched} had no match`];
    if (res.duplicates.length) parts.push(`duplicate keys in the lookup table, first row used: ${res.duplicates.join(', ')}`);
    setLookupNote({ type: res.unmatched || res.duplicates.length ? 'info' : 'ok', text: `${parts.join('; ')}. Column "${col}" is now filled.` });
  };

  const exportCsv = () => {
    if (!r) return;
    const bucketLabel = Object.fromEntries(AGING_BUCKETS.map(b => [b.key, b.label]));
    const header = ['Invoice', 'Customer', 'Balance', 'Days overdue', 'Bucket', ...customColumns];
    const body = r.rows.map(row => [
      row.id, row.customer, row.balance, row.daysOverdue, bucketLabel[row.bucket],
      ...customColumns.map(c => row.extra?.[c] ?? ''),
    ]);
    const blob = new Blob([toCsv([header, ...body])], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `invoice-aging-${asOf}.csv`);
  };

  const result = useMemo(() => {
    try {
      return { data: computeAging({ invoices, asOf, groupBy: groupBy || null }), error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  }, [invoices, asOf, groupBy]);

  const r = result.data;
  const keyOptions = ['customer', ...customColumns];
  const lookupColumns = lookupTable?.headers || [];

  return (
    <div className="space-y-6">
      <ImportPanel
        title="Import invoices from a CSV"
        templateName="invoice-aging-template.csv"
        templateRows={INVOICE_TEMPLATE}
        onParsed={handleImport}
      />
      {importNote && (
        <p role="status" className={`text-xs font-medium ${importNote.type === 'ok' ? 'text-accent-700 dark:text-accent-300' : 'text-rose-700 dark:text-rose-300'}`}>{importNote.text}</p>
      )}

      <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-7 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Report as of" type="date" value={asOf} onChange={setAsOf} />
            <label className="block">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Group balances by</span>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base">
                <option value="">Nothing (overall only)</option>
                {customColumns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input aria-label="New column name" placeholder="Add a column, e.g. Region or Sales rep" value={newColumn}
              onChange={e => setNewColumn(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColumn(); } }}
              className="flex-1 rounded-xl border border-[var(--orbit-border)] px-3 py-2 min-h-[40px] bg-white dark:bg-stone-900 text-sm" />
            <button type="button" onClick={addColumn}
              className="px-4 py-2 min-h-[40px] rounded-xl border border-[var(--orbit-border)] text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
              Add column
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--orbit-border)]">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 text-left text-xs text-stone-600 dark:text-stone-300">
                <tr>
                  <th className="px-3 py-2 font-semibold">Invoice</th>
                  <th className="px-3 py-2 font-semibold">Customer</th>
                  <th className="px-3 py-2 font-semibold">Amount</th>
                  <th className="px-3 py-2 font-semibold">Paid</th>
                  <th className="px-3 py-2 font-semibold">Due date</th>
                  {customColumns.map(c => (
                    <th key={c} className="px-3 py-2 font-semibold whitespace-nowrap">
                      {c} <button type="button" onClick={() => removeColumn(c)} aria-label={`Remove column ${c}`} className="ml-1 text-rose-700 dark:text-rose-300">×</button>
                    </th>
                  ))}
                  <th className="px-3 py-2"><span className="sr-only">Remove row</span></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={i} className="border-t border-[var(--orbit-border)]">
                    <td className="p-2"><input aria-label="Invoice number" value={inv.id} onChange={e => update(i, 'id', e.target.value)} className="w-full min-w-[90px] rounded-lg border border-[var(--orbit-border)] px-2 py-1.5 bg-white dark:bg-stone-900" /></td>
                    <td className="p-2"><input aria-label="Customer" value={inv.customer} onChange={e => update(i, 'customer', e.target.value)} className="w-full min-w-[120px] rounded-lg border border-[var(--orbit-border)] px-2 py-1.5 bg-white dark:bg-stone-900" /></td>
                    <td className="p-2"><input aria-label="Amount" inputMode="decimal" value={inv.amount} onChange={e => update(i, 'amount', e.target.value)} className="w-full min-w-[100px] rounded-lg border border-[var(--orbit-border)] px-2 py-1.5 bg-white dark:bg-stone-900" /></td>
                    <td className="p-2"><input aria-label="Amount paid" inputMode="decimal" value={inv.paid} onChange={e => update(i, 'paid', e.target.value)} className="w-full min-w-[100px] rounded-lg border border-[var(--orbit-border)] px-2 py-1.5 bg-white dark:bg-stone-900" /></td>
                    <td className="p-2"><input aria-label="Due date" placeholder="DD/MM/YYYY" value={inv.dueDate} onChange={e => update(i, 'dueDate', e.target.value)} className="w-full min-w-[120px] rounded-lg border border-[var(--orbit-border)] px-2 py-1.5 bg-white dark:bg-stone-900" /></td>
                    {customColumns.map(c => (
                      <td key={c} className="p-2"><input aria-label={`${c} for invoice ${i + 1}`} value={inv.extra?.[c] ?? ''} onChange={e => updateExtra(i, c, e.target.value)} className="w-full min-w-[110px] rounded-lg border border-[var(--orbit-border)] px-2 py-1.5 bg-white dark:bg-stone-900" /></td>
                    ))}
                    <td className="p-2 text-right"><button type="button" onClick={() => remove(i)} className="text-xs font-semibold text-rose-700 dark:text-rose-300 px-2 py-1">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setInvoices(prev => [...prev, { ...blankInvoice(prev.length + 1), extra: Object.fromEntries(customColumns.map(c => [c, ''])) }])}
            className="px-4 py-2 min-h-[40px] rounded-xl border border-[var(--orbit-border)] text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
            Add invoice
          </button>

          <div className="rounded-2xl border border-[var(--orbit-border)] p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Look up a column from another table</p>
              <p className="text-xs text-stone-600 dark:text-stone-300">Like a VLOOKUP: for each invoice, find a matching row in a second CSV and copy one of its columns across.</p>
            </div>
            <ImportPanel
              title="Upload the lookup table"
              templateName="lookup-template.csv"
              templateRows={[['Customer', 'Region', 'Credit Limit'], ['Acme Pvt Ltd', 'South', '500000'], ['Beta Traders', 'North', '200000']]}
              onParsed={handleLookupImport}
            />
            {lookupTable && (
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Match invoices using</span>
                  <select value={lookupConfig.invoiceKey} onChange={e => setLookupConfig(c => ({ ...c, invoiceKey: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-3 py-2 text-sm">
                    {keyOptions.map(k => <option key={k} value={k}>{k === 'customer' ? 'Customer' : k}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Lookup table key column</span>
                  <select value={lookupConfig.lookupKey} onChange={e => setLookupConfig(c => ({ ...c, lookupKey: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-3 py-2 text-sm">
                    {lookupColumns.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Copy this column</span>
                  <select value={lookupConfig.returnCol} onChange={e => setLookupConfig(c => ({ ...c, returnCol: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-3 py-2 text-sm">
                    {lookupColumns.filter(h => h !== lookupConfig.lookupKey).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              </div>
            )}
            {lookupTable && (
              <button type="button" onClick={applyLookupNow}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700">
                Apply lookup
              </button>
            )}
            {lookupNote && (
              <p role="status" className={`text-xs font-medium ${lookupNote.type === 'error' ? 'text-rose-700 dark:text-rose-300' : lookupNote.type === 'info' ? 'text-amber-800 dark:text-amber-300' : 'text-accent-700 dark:text-accent-300'}`}>{lookupNote.text}</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
          {result.error && <p className="text-sm text-rose-700 dark:text-rose-300">{result.error}</p>}
          {r && (
            <>
              <Result label="Total outstanding" value={money(r.outstanding)} highlight />
              <Result label="Overdue" value={`${money(r.overdue)}${r.overduePct === null ? '' : ` (${r.overduePct.toFixed(1)}%)`}`} />
              {AGING_BUCKETS.map(b => (
                <Result key={b.key} label={b.label} value={money(r.buckets[b.key])} />
              ))}
              {groupBy && r.byGroup.length > 0 && (
                <div className="rounded-xl border border-[var(--orbit-border)] p-4">
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 mb-2">By {groupBy}</p>
                  <table className="w-full text-sm">
                    <tbody>
                      {r.byGroup.map(g => (
                        <tr key={g.group} className="border-t border-[var(--orbit-border)] first:border-t-0">
                          <td className="py-1.5">{g.group}</td>
                          <td className="py-1.5 text-right">{money(g.balance)}</td>
                          <td className="py-1.5 text-right text-xs text-rose-700 dark:text-rose-300">{money(g.overdue)} overdue</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {r.byCustomer.length > 0 && (
                <div className="rounded-xl border border-[var(--orbit-border)] p-4">
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 mb-2">Largest balances</p>
                  <ol className="space-y-1 text-sm">
                    {r.byCustomer.slice(0, 5).map(c => (
                      <li key={c.customer} className="flex justify-between gap-3"><span>{c.customer}</span><span className="font-semibold">{money(c.balance)}</span></li>
                    ))}
                  </ol>
                </div>
              )}
              <button type="button" onClick={exportCsv} disabled={r.rows.length === 0}
                className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--orbit-border)] text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50">
                Download outstanding invoices (CSV)
              </button>
              {r.warnings.length > 0 && (
                <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  {r.warnings.map(w => <li key={w}>{w}</li>)}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DecisionMatrix() {
  const [options, setOptions] = useState(['Vendor A', 'Vendor B', 'Vendor C']);
  const [criteria, setCriteria] = useState([
    { name: 'Price', weight: '3', scores: ['8', '6', '7'] },
    { name: 'Support', weight: '2', scores: ['5', '9', '6'] },
    { name: 'Ease of use', weight: '1', scores: ['7', '7', '9'] },
  ]);
  const [importNote, setImportNote] = useState(null);

  const setScore = (c, o, value) => setCriteria(prev => prev.map((crit, ci) => (ci === c
    ? { ...crit, scores: crit.scores.map((s, oi) => (oi === o ? value : s)) } : crit)));

  const handleImport = ({ headers, records }) => {
    const weightCol = headers.findIndex(h => /^weight$/i.test(h.trim()));
    if (weightCol < 1) {
      setImportNote({ type: 'error', text: 'Expected a "Weight" column after the criterion name. Use the template.' });
      return;
    }
    const optionHeaders = headers.slice(weightCol + 1).map(h => h.trim()).filter(Boolean);
    if (optionHeaders.length === 0) {
      setImportNote({ type: 'error', text: 'Add at least one option column after the Weight column.' });
      return;
    }
    const rows = records.map(rec => ({
      name: rec[headers[0]],
      weight: rec[headers[weightCol]],
      scores: optionHeaders.map(oh => rec[oh]),
    }));
    setOptions(optionHeaders);
    setCriteria(rows);
    setImportNote({ type: 'ok', text: `Imported ${rows.length} criteria and ${optionHeaders.length} options.` });
  };

  const result = useMemo(() => computeDecisionMatrix({
    criteria: criteria.map(c => ({ name: c.name, weight: c.weight })),
    options,
    scores: criteria.map(c => c.scores.map(s => (s === '' ? null : Number(s)))),
  }), [criteria, options]);

  const top = result.ranked[0]?.score || 1;

  return (
    <div className="space-y-6">
      <ImportPanel
        title="Import criteria and scores from a CSV"
        templateName="decision-matrix-template.csv"
        templateRows={MATRIX_TEMPLATE}
        onParsed={handleImport}
      />
      {importNote && (
        <p role="status" className={`text-xs font-medium ${importNote.type === 'ok' ? 'text-accent-700 dark:text-accent-300' : 'text-rose-700 dark:text-rose-300'}`}>{importNote.text}</p>
      )}

      <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-7 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[var(--orbit-border)]">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800/50 text-left text-xs text-stone-600 dark:text-stone-300">
                <tr>
                  <th className="px-3 py-2 font-semibold">Criterion</th>
                  <th className="px-3 py-2 font-semibold">Weight</th>
                  {options.map((o, oi) => (
                    <th key={oi} className="px-3 py-2 font-semibold">
                      <input aria-label={`Option ${oi + 1} name`} value={o}
                        onChange={e => setOptions(prev => prev.map((x, i) => (i === oi ? e.target.value : x)))}
                        className="w-full min-w-[100px] rounded-lg border border-[var(--orbit-border)] px-2 py-1 bg-white dark:bg-stone-900 font-semibold" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criteria.map((c, ci) => (
                  <tr key={ci} className="border-t border-[var(--orbit-border)]">
                    <td className="p-2"><input aria-label="Criterion name" value={c.name}
                      onChange={e => setCriteria(prev => prev.map((x, i) => (i === ci ? { ...x, name: e.target.value } : x)))}
                      className="w-full min-w-[120px] rounded-lg border border-[var(--orbit-border)] px-2 py-1.5 bg-white dark:bg-stone-900" /></td>
                    <td className="p-2"><input aria-label="Weight" inputMode="decimal" value={c.weight}
                      onChange={e => setCriteria(prev => prev.map((x, i) => (i === ci ? { ...x, weight: e.target.value } : x)))}
                      className="w-20 rounded-lg border border-[var(--orbit-border)] px-2 py-1.5 bg-white dark:bg-stone-900" /></td>
                    {options.map((_, oi) => (
                      <td key={oi} className="p-2"><input aria-label={`${c.name} score for option ${oi + 1}`} inputMode="decimal" value={c.scores[oi] ?? ''}
                        onChange={e => setScore(ci, oi, e.target.value)}
                        className="w-20 rounded-lg border border-[var(--orbit-border)] px-2 py-1.5 bg-white dark:bg-stone-900" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-300">Scores run from 0 to 10. Higher weights count for more.</p>
        </div>

        <div className="lg:col-span-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-600 dark:text-stone-300">Ranking</p>
          {result.ranked.map(o => (
            <div key={o.name} className="rounded-xl border border-[var(--orbit-border)] p-4">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-stone-900 dark:text-stone-100">{o.rank}. {o.name}</span>
                <span className="font-bold text-accent-700 dark:text-accent-300">{o.score.toFixed(2)} / 10</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-stone-200 dark:bg-stone-700" aria-hidden="true">
                <div className="h-2 rounded-full bg-accent-600" style={{ width: `${(o.score / top) * 100}%` }} />
              </div>
            </div>
          ))}
          {result.warnings.length > 0 && (
            <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
              {result.warnings.map(w => <li key={w}>{w}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
