import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { applicableNumericRate, findRateReferences, ICEGATE_SOURCE, loadGstReference, RATE_SOURCE, searchClassifications } from '../../lib/gst/reference';
import './GstReference.css';

export function ClassificationInput({ value, onChange, onSelect, label, placeholder, multiline = false }) {
  const id = useId();
  const input = useRef(null);
  const [reference, setReference] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({});
  const results = useMemo(() => searchClassifications(reference?.codes || [], value), [reference, value]);
  const show = async () => {
    const rect = input.current.getBoundingClientRect();
    const width = Math.min(520, window.innerWidth - 24);
    const below = window.innerHeight - rect.bottom;
    setPosition({ position: 'fixed', width, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      ...(below > 220 ? { top: rect.bottom + 4, maxHeight: Math.min(340, below - 16) } : { bottom: window.innerHeight - rect.top + 4, maxHeight: Math.max(120, rect.top - 16) }) });
    setOpen(true);
    setError('');
    try { setReference(await loadGstReference()); } catch (err) { setError(err.message); }
  };
  useEffect(() => {
    if (!open) return;
    const close = event => { if (event.target !== input.current && !event.target.closest?.('[data-gst-options]')) setOpen(false); };
    const scroll = event => { if (!event.target.closest?.('[data-gst-options]')) setOpen(false); };
    document.addEventListener('pointerdown', close);
    window.addEventListener('resize', close);
    document.addEventListener('scroll', scroll, { capture: true, passive: true });
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('resize', close); document.removeEventListener('scroll', scroll, true); };
  }, [open]);
  const choose = row => { onSelect(row); setOpen(false); input.current.focus(); };
  const Tag = multiline ? 'textarea' : 'input';
  return <>
    <Tag ref={input} rows={multiline ? 2 : undefined} value={value} placeholder={placeholder}
      aria-label={label} role="combobox" aria-autocomplete="list" aria-expanded={open && value.trim().length >= 2}
      aria-controls={open ? id : undefined} aria-activedescendant={open && results[active] ? `${id}-${active}` : undefined}
      className="orbit-control orbit-control--dense gst-classification-input" autoComplete="off"
      onFocus={show} onBlur={() => setOpen(false)}
      onChange={event => { onChange(event.target.value); setActive(0); if (!open) show(); }}
      onKeyDown={event => {
        if (event.key === 'Escape') { setOpen(false); return; }
        if (!open) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setActive(index => Math.max(0, Math.min(results.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
        }
        if (event.key === 'Enter' && results[active]) { event.preventDefault(); choose(results[active]); }
      }} />
    {open && value.trim().length >= 2 && createPortal(<div data-gst-options className="gst-options" style={position}>
      <div className="gst-options-heading">HSN goods & SAC services · select a classification</div>
      <div role="listbox" id={id} aria-label={`${label} suggestions`}>
        {results.map((row, index) => <div role="option" aria-selected={index === active} id={`${id}-${index}`} key={`${row.kind}-${row.code}`}
          className={`gst-option ${index === active ? 'gst-option-active' : ''}`}
          onPointerDown={event => { event.preventDefault(); choose(row); }}>
          <strong>{row.code}</strong> <span>{row.kind === 'goods' ? 'HSN · Goods' : 'SAC · Services'}</span>
          <p>{row.description}</p>
        </div>)}
      </div>
      <p role="status" className="gst-lookup-hint">{error || (!reference ? 'Loading local reference…' : !results.length ? 'No matching code. Manual entry is available.' : 'Top results shown. Type more to narrow your search. Rates require a separate review.')}</p>
    </div>, document.body)}
  </>;
}

export function GstRateReference({ entry, onApply, context = '' }) {
  const [reference, setReference] = useState(null);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let live = true;
    loadGstReference().then(data => { if (live) setReference(data); }).catch(err => { if (live) setError(err.message); });
    return () => { live = false; };
  }, []);
  const candidates = useMemo(() => findRateReferences(reference?.rates || [], entry), [reference, entry]);
  const hasCessReference = candidates.some(row => row.kind === 'goods' && row.condition.trim());
  if (!entry) return null;
  const visible = expanded ? candidates : candidates.slice(0, 8);
  return <section className="gst-rate-reference" aria-label="GST rate references">
    <h3>{context} {entry.kind === 'goods' ? 'HSN' : 'SAC'} {entry.code} — {entry.description}</h3>
    <p className="gst-reference-warning">Reference rates only · captured {reference?.manifest.capturedOn || '…'}. Effective dates and subsequent amendments are not verified. Match the full description and conditions to your invoice date; selecting a code does not select a tax rate.</p>
    <p><a href={RATE_SOURCE} target="_blank" rel="noreferrer">CBIC goods & services rates ↗</a> · <a href={ICEGATE_SOURCE} target="_blank" rel="noreferrer">ICEGATE customs codes / UQC ↗</a></p>
    <label className="gst-rate-ack"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> I have checked the current notification, description and conditions for this invoice date.</label>
    {error && <p role="alert">{error}</p>}
    {!reference && !error && <p role="status">Loading reference rates…</p>}
    {reference && !candidates.length && <p>No mapped rate reference. Enter the rate manually after checking the official source. A missing rate is not a zero rate.</p>}
    {hasCessReference && <p className="gst-reference-warning">Cess is listed under a related heading. This invoice engine does not calculate cess; rate application is disabled. Review the full treatment before using this tool for the supply.</p>}
    {visible.map(row => {
      const rate = applicableNumericRate(row);
      return <article key={row.id} className="gst-rate-card">
        <strong>{row.heading} · Reference IGST: {row.igst || 'Not specified'}{row.igst && !row.igst.includes('%') && /^\d/.test(row.igst) ? '%' : ''}</strong>
        <p>CGST: {row.cgst || 'Not specified'} · SGST/UTGST: {row.sgst || 'Not specified'} · {row.kind === 'goods' ? `Cess: ${row.condition || 'Not listed'}` : 'Services'}</p>
        <details><summary>Description, conditions & source entry {row.schedule} / {row.serial}</summary><p>{row.description}</p>{row.condition && <p>{row.kind === 'goods' ? 'Compensation cess' : 'Condition'}: {row.condition}</p>}<p>Effective date: not verified. Broad headings and exclusions require classification review.</p></details>
        {rate !== null && onApply && !hasCessReference ? <button type="button" disabled={!acknowledged} onClick={() => onApply(rate, row)}>Use reference {rate}%</button> : <p className="gst-lookup-hint">Review only: conditional, cess, non-numeric or special treatment is not supported for automatic application.</p>}
      </article>;
    })}
    {candidates.length > 8 && <button type="button" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer' : `Show all ${candidates.length} reference entries`}</button>}
  </section>;
}

export function GstLookup({ onApply }) {
  const [query, setQuery] = useState('');
  const [entry, setEntry] = useState(null);
  return <div className="gst-lookup">
    <label><span>Find HSN / SAC and reference GST rates</span>
      <ClassificationInput label="Search HSN or SAC by code or description" value={query}
        placeholder="Try 6901, bricks, software or accounting"
        onChange={value => { setQuery(value); setEntry(null); }} onSelect={row => { setQuery(`${row.code} — ${row.description}`); setEntry(row); }} />
    </label>
    <p className="gst-lookup-hint">Search goods and services locally. Codes come from the supplied HSN/SAC workbook; rates are a separate CBIC reference snapshot.</p>
    {entry && <GstRateReference key={`${entry.kind}-${entry.code}`} entry={entry} onApply={onApply} />}
  </div>;
}
