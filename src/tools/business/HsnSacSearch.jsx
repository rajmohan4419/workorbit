import { useEffect, useMemo, useState, useDeferredValue } from 'react';
import { loadGstReference, searchClassifications } from '../../lib/gst/reference.js';
import { GstRateReference } from '../../components/gst/GstReference.jsx';
import '../../components/gst/GstReference.css';

export function HsnSacSearch() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [selected, setSelected] = useState(null);
  const [limit, setLimit] = useState(10);
  const [copied, setCopied] = useState('');
  const deferredQuery = useDeferredValue(query);
  useEffect(() => {
    let active = true;
    loadGstReference().then(value => { if (active) setData(value); }).catch(() => { if (active) setError('The catalogue could not load. Please refresh to retry.'); });
    return () => { active = false; };
  }, []);
  const results = useMemo(() => data ? searchClassifications(data.codes, deferredQuery, kind, limit + 1) : [], [data, deferredQuery, kind, limit]);
  async function copy(entry) {
    try { await navigator.clipboard.writeText(`${entry.code} — ${entry.description}`); setCopied(entry.code); }
    catch { setCopied('Copy unavailable. Select the code and description to copy manually.'); }
  }
  return <section className="gst-lookup hsn-search" aria-label="HSN and SAC search">
    <p>Search goods and services by code or description. Free to use, with no sign-up. Searches run locally after the catalogue loads.</p>
    <label htmlFor="classification-search">HSN / SAC code or description</label>
    <input id="classification-search" type="search" value={query} placeholder="Try 6901, ceramic, software or consulting" onChange={event => { setQuery(event.target.value); setLimit(10); setSelected(null); }} />
    <label htmlFor="classification-kind">Classification type</label>
    <select id="classification-kind" value={kind} onChange={event => { setKind(event.target.value); setLimit(10); setSelected(null); }}><option value="all">Goods and services</option><option value="goods">Goods — HSN</option><option value="services">Services — SAC</option></select>
    {!data && !error && <p role="status">Loading local catalogue…</p>}
    {error && <p role="alert">{error}</p>}
    {data && query.trim().length < 2 && <p>Enter at least two characters. Exact codes appear before broader matches.</p>}
    {data && query.trim().length >= 2 && <>
      <p role="status">{results.length ? `Showing ${Math.min(results.length,limit)} matches${results.length > limit ? ' — more available' : ''}` : 'No matching codes. Try a broader description or fewer digits.'}</p>
      <ul style={{listStyle:'none',padding:0}}>{results.slice(0,limit).map(entry => <li key={`${entry.kind}-${entry.code}`} style={{border:'1px solid #cbd5e1',padding:12,marginBottom:8,borderRadius:8}}>
        <button type="button" onClick={() => setSelected(entry)} aria-expanded={selected?.code === entry.code && selected?.kind === entry.kind}><strong>{entry.kind === 'goods' ? 'HSN' : 'SAC'} {entry.code}</strong> — {entry.description}</button>
        <button type="button" onClick={() => copy(entry)} aria-label={`Copy ${entry.code}`}>Copy code & description</button>
      </li>)}</ul>
      {results.length > limit && limit < 100 && <button type="button" onClick={() => setLimit(value => value + 10)}>Show more matches</button>}
      {limit >= 100 && results.length > limit && <p>Narrow your search to see more specific matches.</p>}
    </>}
    <p role="status">{copied && (copied.startsWith('Copy unavailable') ? copied : `Copied ${copied}`)}</p>
    {selected && <div><h2>{selected.kind === 'goods' ? 'HSN' : 'SAC'} {selected.code}</h2><p>{selected.description}</p><GstRateReference key={`${selected.kind}-${selected.code}`} entry={selected} /></div>}
    <p>Codes describe classifications; they do not establish a tax rate. Reference rates may have conditions or amendments. Check the applicable notification and invoice date.</p>
    <a href="/tools/gst-invoice-generator">Create a GST invoice →</a>
  </section>;
}
