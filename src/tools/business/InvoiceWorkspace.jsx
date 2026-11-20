import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Plus,
  Trash2,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Upload,
  RefreshCw,
  Search,
  X,
  CreditCard,
  Truck,
  Globe2,
  Receipt,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { DownloadAccountForm } from '../../components/monetization/DownloadAccountForm.jsx';
import { ClassificationInput, GstRateReference } from '../../components/gst/GstReference.jsx';
import { GST_STATE_CODES } from '../../lib/invoices/gstIdentity.js';
import {
  newInvoice,
  TEMPLATES,
  CURRENCIES,
  validateModel,
  RULES,
  invoiceTotals,
} from '../../lib/invoices/model.js';
import { sampleInvoice } from '../../lib/invoices/sample.js';
import { AddressFields } from '../../lib/invoices/AddressFields.jsx';
import { invoiceRequest } from '../../lib/invoices/client.js';
import { generateInvoicePDF } from './gstInvoicePdf.js';
import { directDownloadBlob } from '../../lib/toolFormat.js';
import './InvoiceWorkspace.css';

const KEY = 'orbitboard:invoice-draft-v2';

const sampleTotal = (t) => {
  const sample = sampleInvoice(['commercial', 'shipping'].includes(t.id) ? 'export' : 'b2b');
  return `${sample.currency} ${invoiceTotals(sample).total.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  })}`;
};

function initial() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (
      d?.invoice?.schemaVersion === 2 &&
      d.invoice.seller &&
      d.invoice.buyer &&
      d.invoice.meta &&
      d.invoice.export &&
      d.invoice.shipping &&
      Array.isArray(d.invoice.items)
    ) {
      return d;
    }
  } catch {
    /* local draft is optional */
  }
  const invoice = newInvoice();
  try {
    const saved = JSON.parse(localStorage.getItem('orbitboard:gst-seller'));
    if (saved) invoice.seller = { ...invoice.seller, ...saved, country: 'IN', countryName: 'India' };
  } catch {
    /* legacy seller is optional */
  }
  return { requestId: crypto.randomUUID(), invoice };
}

export function InvoiceWorkspace() {
  const [draft, setDraft] = useState(initial);
  const invoice = draft.invoice;
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState(null);
  const [signIn, setSignIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState('');
  const [finalized, setFinalized] = useState(null);
  const [query, setQuery] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [classification, setClassification] = useState(null);

  const lock = useRef(false);
  const editedTemplate = useRef(false);
  const identity = useRef(null);

  const update = (next) => {
    if (finalized) {
      setMessage('Finalized particulars are immutable. Choose New invoice to edit a new draft.');
      return;
    }
    setDraft((d) => ({
      ...d,
      invoice: typeof next === 'function' ? next(d.invoice) : next,
    }));
  };

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* quota does not affect finalization */
    }
  }, [draft]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function refresh() {
    const owner = identity.current;
    const data = await invoiceRequest();
    if (identity.current === owner) setAccount(data);
    return data;
  }

  useEffect(() => {
    if (!supabase?.auth) return;
    const apply = (s) => {
      const id = s?.user?.id || null;
      if (identity.current !== id) {
        identity.current = id;
        setAccount(null);
        setProfiles([]);
        setFinalized(null);
      }
      setSession(s);
      if (s) {
        queueMicrotask(() => {
          refresh()
            .then((data) => {
              if (identity.current !== id) return;
              if (!editedTemplate.current) {
                const p = data.preferences?.find((p) => p.invoice_type === invoice.type);
                if (p) setDraft((d) => ({ ...d, invoice: { ...d.invoice, template: p.template } }));
              }
            })
            .catch((e) => setMessage(e.message));
          supabase
            .from('business_profiles')
            .select('id,name,gstin,address,state_code,upi_id')
            .then(({ data }) => {
              if (identity.current === id) setProfiles(data || []);
            });
        });
      }
    };
    supabase.auth.getSession().then(({ data }) => apply(data?.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => apply(s));
    return () => data?.subscription?.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (section, key, value) =>
    update((i) => ({ ...i, [section]: { ...i[section], [key]: value } }));

  let validation;
  try {
    validation = validateModel(invoice);
  } catch {
    validation = { errors: ['Restore or start a valid invoice draft.'] };
  }

  const input = (section, key, label, type = 'text') => (
    <label className="block text-xs font-semibold space-y-1">
      <span className="text-stone-700 dark:text-stone-300">{label}</span>
      <input
        aria-label={label}
        type={type}
        className="orbit-control"
        value={invoice[section]?.[key] || ''}
        onChange={(e) => set(section, key, e.target.value)}
      />
    </label>
  );

  const check = (section, key, label) => (
    <label className="invoice-check">
      <input
        type="checkbox"
        checked={Boolean(invoice[section]?.[key])}
        onChange={(e) => set(section, key, e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );

  const select = (section, key, label, choices) => (
    <label className="block text-xs font-semibold space-y-1">
      <span className="text-stone-700 dark:text-stone-300">{label}</span>
      <select
        aria-label={label}
        className="orbit-control"
        value={invoice[section]?.[key] || ''}
        onChange={(e) => set(section, key, e.target.value)}
      >
        <option value="">Choose…</option>
        {choices.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );

  async function run(action) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (e) {
      setMessage(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function showPreview(data = invoice) {
    const blob = await generateInvoicePDF(data, { draft: !finalized });
    setPreview(URL.createObjectURL(blob));
  }

  function changeType(type) {
    const pref = account?.preferences?.find((p) => p.invoice_type === type);
    update((i) => ({
      ...i,
      type,
      template: pref?.template || i.template,
      buyer: { ...i.buyer, ...(type === 'export' ? {} : { country: 'IN', countryName: 'India' }) },
      shipping: {
        ...i.shipping,
        address: {
          ...i.shipping.address,
          ...(type === 'export' ? {} : { country: 'IN', countryName: 'India' }),
        },
      },
      meta: {
        ...i.meta,
        placeOfSupply:
          type === 'export'
            ? 'Outside India'
            : i.meta.placeOfSupply === 'Outside India'
            ? ''
            : i.meta.placeOfSupply,
      },
    }));
  }

  async function uploadImage(event, key, section) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 250000 || !['image/png', 'image/jpeg'].includes(file.type)) {
      setMessage('Use PNG/JPEG images under 250 KB.');
      return;
    }
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    section ? set(section, key, data) : update((i) => ({ ...i, [key]: data }));
  }

  const exportGoods = invoice.type === 'export' && invoice.export.kind === 'goods';
  const totals = validation.totals;

  return (
    <div className="invoice-workspace space-y-6">
      {/* ─── Hero Bar & Context Notice ─── */}
      <div className="rounded-2xl border border-[var(--orbit-border)] bg-gradient-to-r from-violet-50/70 via-stone-50 to-white dark:from-stone-900/60 dark:via-stone-900 dark:to-stone-900 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-violet-600 text-white shrink-0 shadow-xs">
            <Receipt size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                GST Tax Invoice Generator
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                {finalized ? 'Finalized' : 'Free Live Draft'}
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
              Drafts and previews are free. Finalization saves invoice data to your account and includes PDF download. Launch allowance: five lifetime invoices; previously finalized invoices remain available. <a href={RULES.rule46} target="_blank" rel="noreferrer" className="text-violet-600 dark:text-violet-400 underline">Rule references</a> · reviewed {RULES.verifiedOn}.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Top Actions Toolbar ─── */}
      <div className="invoice-toolbar flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 shadow-xs">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
            <span>Invoice type</span>
            <select
              aria-label="Invoice type"
              className="orbit-control min-w-[170px] text-xs font-bold"
              value={invoice.type}
              disabled={Boolean(finalized)}
              onChange={(e) => changeType(e.target.value)}
            >
              <option value="b2b">B2B Tax Invoice</option>
              <option value="b2c">B2C Tax Invoice</option>
              <option value="export">Export Invoice</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => showPreview())}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition inline-flex items-center gap-1.5"
          >
            <Eye size={14} className="text-violet-600 dark:text-violet-400" />
            <span>Preview current draft</span>
          </button>

          <button
            type="button"
            disabled={busy || Boolean(finalized)}
            onClick={() => {
              if (!session) {
                setSignIn(true);
                return;
              }
              run(async () => {
                if (validation.errors.length) throw new Error(validation.errors.join('\n'));
                const row = await invoiceRequest({ action: 'finalize', requestId: draft.requestId, invoice });
                setFinalized(row.id);
                await refresh();
                const blob = await invoiceRequest(null, `?id=${row.id}&download=1`);
                directDownloadBlob(blob, `invoice-${invoice.meta.invoiceNumber}.pdf`);
                setMessage('Finalized and saved. Re-downloads do not use another invoice credit.');
              });
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-xs transition inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download size={14} />
            <span>Finalize and download</span>
          </button>

          {finalized && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const blob = await invoiceRequest(null, `?id=${finalized}&download=1&template=${invoice.template}`);
                  directDownloadBlob(blob, `invoice-${invoice.meta.invoiceNumber}.pdf`);
                })
              }
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition inline-flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Download finalized invoice</span>
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const fresh = newInvoice();
              fresh.seller = { ...invoice.seller };
              const match = /(\d+)$/.exec(invoice.meta.invoiceNumber);
              if (match) {
                const next =
                  invoice.meta.invoiceNumber.slice(0, -match[1].length) +
                  String(Number(match[1]) + 1).padStart(match[1].length, '0');
                if (next.length <= 16) fresh.meta.invoiceNumber = next;
              }
              setDraft({ requestId: crypto.randomUUID(), invoice: fresh });
              setFinalized(null);
              setPreview('');
              editedTemplate.current = false;
              setMessage('New local draft. Previous finalized invoices are preserved.');
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--orbit-border)] hover:bg-stone-50 dark:hover:bg-stone-800 transition inline-flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>New invoice</span>
          </button>

          {!session && (
            <button
              type="button"
              onClick={() => setSignIn((v) => !v)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-900 dark:bg-white text-white dark:text-stone-900 transition"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {signIn && !session && (
        <div className="p-5 rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/50 dark:bg-violet-950/20">
          <DownloadAccountForm onSignedIn={() => setSignIn(false)} />
        </div>
      )}

      {message && (
        <div role="alert" className="invoice-message flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>{message}</span>
        </div>
      )}

      {account && (
        <p role="status" className="text-xs text-stone-600 dark:text-stone-400 px-2">
          {account.tier}: {account.used} finalized in the {account.policy.reset_policy} period
          {account.policy.finalization_limit === null
            ? ' · paid allowance'
            : ` / ${account.policy.finalization_limit}`}
          . Invoice checkout is not active. Contact{' '}
          <a href="mailto:support@orbitboard.in" className="text-violet-600 underline">
            support@orbitboard.in
          </a>{' '}
          for availability.
        </p>
      )}

      {/* ─── Templates Section (Always rendered) ─── */}
      <section className="invoice-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--orbit-border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
              <span>Choose a template</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Templates change presentation only. All include entered mandatory particulars.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!session) {
                setSignIn(true);
                return;
              }
              run(async () => {
                await invoiceRequest({
                  action: 'preference',
                  type: invoice.type,
                  template: invoice.template,
                });
                await refresh();
                setMessage('Default template saved for this account and invoice type.');
              });
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition shadow-xs self-start sm:self-auto"
          >
            Set as default
          </button>
        </div>

        <div className="invoice-templates">
          {TEMPLATES.map((t) => (
            <div
              key={t.id}
              className={`invoice-template ${t.id} ${
                invoice.template === t.id ? 'selected' : ''
              }`}
            >
              <div className="invoice-mini" aria-hidden="true">
                <strong className="text-[11px] font-bold">OrbitBoard Demo Supply</strong>
                <span className="text-[9px] text-stone-500">Invoice: INV-0017</span>
                <span className="text-[9px] text-stone-500">Date: 2026-11-15</span>
                <div className="text-[9px]">Sample goods · 3 × 1,250.55 · 5% off</div>
                <b className="text-[10px] text-violet-700 dark:text-violet-400">{sampleTotal(t)}</b>
              </div>

              <button
                type="button"
                aria-pressed={invoice.template === t.id}
                onClick={() => {
                  editedTemplate.current = true;
                  setDraft((d) => ({
                    ...d,
                    invoice: { ...d.invoice, template: t.id },
                  }));
                }}
                className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                  invoice.template === t.id
                    ? 'bg-violet-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200'
                }`}
              >
                {t.name}
              </button>
              <p className="text-[11px] text-stone-500 leading-tight">{t.description}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(() =>
                    showPreview({
                      ...sampleInvoice(
                        ['commercial', 'shipping'].includes(t.id) ? 'export' : 'b2b'
                      ),
                      template: t.id,
                    })
                  )
                }
                className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline text-left mt-auto pt-1"
              >
                Preview {t.name} sample
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Finalized Invoices History (if signed in) ─── */}
      {session && (
        <section className="invoice-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--orbit-border)] pb-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <FileCheck2 size={16} className="text-violet-600" />
              <span>Finalized invoice history</span>
            </h3>
            <div className="flex items-center gap-2">
              <input
                aria-label="Search invoice history"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search invoice numbers"
                className="orbit-control text-xs py-1.5 min-w-[200px]"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () =>
                    setAccount(await invoiceRequest(null, `?q=${encodeURIComponent(query)}`))
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 transition"
              >
                Search history
              </button>
            </div>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {account?.invoices
              ?.filter((row) => row.invoice_number.toLowerCase().includes(query.toLowerCase()))
              .map((row) => (
                <div key={row.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{row.invoice_number}</span>
                    <span className="text-stone-500 mx-2">·</span>
                    <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-semibold">{row.invoice_type}</span>
                    <span className="text-stone-500 mx-2">·</span>
                    <span className="text-stone-500">{row.created_at.slice(0, 10)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const data = await invoiceRequest(null, `?id=${row.id}`);
                          setDraft({ requestId: crypto.randomUUID(), invoice: data.snapshot });
                          setFinalized(row.id);
                        })
                      }
                      className="px-2.5 py-1 rounded-lg border border-[var(--orbit-border)] hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                    >
                      View saved invoice
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const blob = await invoiceRequest(null, `?id=${row.id}&download=1`);
                          directDownloadBlob(blob, `invoice-${row.invoice_number}.pdf`);
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold transition"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {account?.hasMore && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const data = await invoiceRequest(
                    null,
                    `?offset=${account.invoices.length}&q=${encodeURIComponent(query)}`
                  );
                  setAccount((a) => ({
                    ...a,
                    hasMore: data.hasMore,
                    invoices: [...a.invoices, ...data.invoices],
                  }));
                })
              }
              className="text-xs text-violet-600 hover:underline block pt-2"
            >
              Load more invoices
            </button>
          )}
        </section>
      )}

      {/* ─── TAB 1: Editor Form & Master Layout ─── */}
      <fieldset disabled={Boolean(finalized) || busy} className="space-y-6">
        <legend className="sr-only">
          {finalized ? 'Saved particulars (read only)' : 'Invoice particulars'}
        </legend>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ──── LEFT COLUMN (65% width) ──── */}
          <div className="lg:col-span-8 space-y-6 min-w-0">
            {/* Card 1: Invoice Identifier & Meta */}
            <div className="invoice-card space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--orbit-border)] pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-violet-600 dark:text-violet-400" />
                  <h3 className="text-stone-900 dark:text-stone-100">Document Particulars</h3>
                </div>
                {profiles.length > 0 && (
                  <label className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                    <span>Use profile:</span>
                    <select
                      aria-label="Use saved business profile"
                      className="orbit-control py-1 text-xs"
                      onChange={(e) => {
                        const p = profiles.find((p) => p.id === e.target.value);
                        if (p) {
                          update((i) => ({
                            ...i,
                            seller: {
                              ...i.seller,
                              companyName: p.name,
                              gstin: p.gstin || '',
                              address: p.address || '',
                              upiId: p.upi_id || '',
                            },
                          }));
                        }
                      }}
                    >
                      <option value="">Choose profile…</option>
                      {profiles.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="invoice-grid">
                {input('meta', 'invoiceNumber', 'Invoice number')}
                {input('meta', 'invoiceDate', 'Invoice date', 'date')}
                {input('meta', 'dueDate', 'Due date (optional)', 'date')}
                {input('meta', 'poReference', 'Purchase order reference')}
              </div>

              <div className="pt-2">
                {input('meta', 'placeOfSupply', 'Explicit place of supply (Indian state/UT or Outside India)')}
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Choose place of supply under applicable IGST rules. Intrastate supply applies when place of supply equals seller state (CGST + SGST/UTGST). Special supplies and SEZ are unsupported.
                </p>
              </div>
            </div>

            {/* Card 2: Seller & Buyer Particulars */}
            <div className="invoice-card space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--orbit-border)] pb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-violet-600 dark:text-violet-400" />
                  <h3 className="text-stone-900 dark:text-stone-100">Parties & Addresses</h3>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!session) {
                      setSignIn(true);
                      return;
                    }
                    run(async () => {
                      const { error } = await supabase.rpc('create_business_profile', {
                        p_name: invoice.seller.companyName,
                        p_type: 'other',
                        p_gstin: invoice.seller.gstin || null,
                        p_state_code: GST_STATE_CODES[invoice.seller.state] || null,
                        p_address: invoice.seller.address || null,
                        p_upi_id: invoice.seller.upiId || null,
                      });
                      if (error) throw new Error('Business profile could not be saved. Check the account configuration.');
                      setMessage('Business profile saved with name, GSTIN, address, state code and UPI. Other invoice details remain in this draft.');
                    });
                  }}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-[var(--orbit-border)] hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                >
                  Save seller as business profile
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AddressFields
                  title="Seller"
                  value={invoice.seller}
                  seller
                  onChange={(seller) => update((i) => ({ ...i, seller }))}
                />
                <AddressFields
                  title="Buyer"
                  value={invoice.buyer}
                  foreign={invoice.type === 'export'}
                  onChange={(buyer) => update((i) => ({ ...i, buyer }))}
                />
              </div>

              {/* Seller Additional Statutory Fields */}
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-[var(--orbit-border)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  Seller Compliance & Branding
                </h4>
                <div className="invoice-grid">
                  {input('seller', 'pan', 'Seller PAN')}
                  {input('seller', 'iec', 'Seller IEC')}
                  {select('seller', 'turnoverBand', 'Preceding financial year turnover', [
                    ['upto5cr', 'Up to ₹5 crore'],
                    ['over5cr', 'Above ₹5 crore'],
                  ])}
                  {select(
                    'seller',
                    'einvoiceHistory',
                    'Maximum aggregate turnover in any financial year since 2017–18',
                    [
                      ['upto5cr', 'Not above ₹5 crore'],
                      ['over5cr', 'Above ₹5 crore'],
                    ]
                  )}
                  <label className="block text-xs font-semibold space-y-1">
                    <span className="text-stone-700 dark:text-stone-300">Business logo</span>
                    <input
                      aria-label="Business logo"
                      type="file"
                      accept="image/png,image/jpeg"
                      className="orbit-control file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                      onChange={(e) => run(() => uploadImage(e, 'logo', 'seller'))}
                    />
                  </label>
                </div>
              </div>

              {/* Shipping address toggle */}
              <div className="pt-2">
                <label className="invoice-check">
                  <input
                    type="checkbox"
                    checked={invoice.shipping.sameAsBilling !== false}
                    onChange={(e) => set('shipping', 'sameAsBilling', e.target.checked)}
                  />
                  <span>Same as billing address</span>
                </label>

                {invoice.shipping.sameAsBilling === false && (
                  <div className="mt-3">
                    <AddressFields
                      title="Ship to"
                      value={invoice.shipping.address}
                      foreign={invoice.type === 'export'}
                      onChange={(address) => set('shipping', 'address', address)}
                    />
                  </div>
                )}
              </div>

              {invoice.type === 'b2c' && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  <p>
                    Buyer GSTIN prints as “GSTIN: NA”. A registered buyer requires B2B. Recipient/delivery details are required for taxable supplies of ₹50,000 or more, or when requested.
                  </p>
                  {check('meta', 'recipientRequestsDetails', 'Recipient requests address particulars')}
                </div>
              )}
            </div>

            {/* Card 3: Export Particulars (if export) */}
            {invoice.type === 'export' && (
              <div className="invoice-card space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--orbit-border)] pb-3">
                  <Globe2 size={18} className="text-sky-600" />
                  <h3 className="text-stone-900 dark:text-stone-100">Export particulars</h3>
                </div>

                <div className="invoice-grid">
                  {select('export', 'kind', 'Export supply', [
                    ['goods', 'Goods'],
                    ['services', 'Services'],
                  ])}
                  {select('export', 'treatment', 'Export tax treatment', [
                    ['lut', 'LUT/bond without IGST'],
                    ['igst', 'Payment of IGST — only where legally eligible'],
                  ])}
                  <label className="block text-xs font-semibold space-y-1">
                    <span className="text-stone-700 dark:text-stone-300">Invoice currency</span>
                    <select
                      aria-label="Invoice currency"
                      className="orbit-control"
                      value={invoice.currency}
                      onChange={(e) => update((i) => ({ ...i, currency: e.target.value }))}
                    >
                      {Object.keys(CURRENCIES).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {check(
                  'export',
                  'eligibilityReviewed',
                  'I reviewed the statutory export conditions, including actual movement of goods or the service recipient, place of supply, receipt of consideration and establishment conditions. A foreign address is not enough.'
                )}

                {invoice.export.treatment === 'lut' ? (
                  <div className="invoice-grid">
                    {input('export', 'lutReference', 'LUT / bond reference')}
                    {input('export', 'lutDate', 'LUT / bond date', 'date')}
                    {check('export', 'lutReviewed', 'LUT / bond is valid for this supply and financial year')}
                  </div>
                ) : (
                  <div className="invoice-grid">
                    {input('export', 'notificationReference', 'Reviewed notification permitting IGST export')}
                    {check('export', 'igstEligible', 'I verified exporter/product eligibility and exclusions for export with IGST payment')}
                  </div>
                )}

                {invoice.currency !== 'INR' && (
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-[var(--orbit-border)] space-y-3">
                    <p className="text-xs text-stone-500">
                      Reporting is separate from invoice currency. Rule 34: use Customs-notified exchange rate for goods, GAAP rate for services, for the time-of-supply date. No live conversion is inferred.
                    </p>
                    <div className="invoice-grid">
                      {input('export', 'inrRate', 'INR per invoice currency unit')}
                      {input('export', 'timeOfSupply', 'Time of supply', 'date')}
                      {input('export', 'rateSource', 'Conversion source / notification')}
                    </div>
                    {check('export', 'conversionReviewed', 'I reviewed this conversion basis and time-of-supply date')}
                  </div>
                )}

                {exportGoods && (
                  <div className="space-y-3 pt-2">
                    <div className="invoice-grid">
                      {Object.entries({
                        packages: 'Packages',
                        grossWeight: 'Gross weight with unit',
                        netWeight: 'Net weight with unit',
                        origin: 'Country of origin',
                        incoterms: 'Incoterms and named place',
                        portLoading: 'Port of loading',
                        portDischarge: 'Port of discharge',
                        transport: 'Transport reference',
                        deliveryTerms: 'Delivery terms',
                        freight: 'Freight reference (charges go in the item table)',
                        insurance: 'Insurance reference (charges go in the item table)',
                        iecExemption: 'IEC exemption reason, if applicable',
                      }).map(([key, label]) => (
                        <span key={key}>{input('export', key, label)}</span>
                      ))}
                    </div>
                    {check('export', 'importerDifferent', 'Importer differs from recipient')}
                    {invoice.export.importerDifferent && (
                      <AddressFields
                        title="Importer"
                        value={invoice.export.importer || {}}
                        foreign
                        onChange={(importer) => set('export', 'importer', importer)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Goods delivery details (domestic goods) */}
            {invoice.type !== 'export' && invoice.items.some((item) => item.kind === 'goods') && (
              <div className="invoice-card space-y-3">
                <div className="flex items-center gap-2 border-b border-[var(--orbit-border)] pb-2.5">
                  <Truck size={16} className="text-amber-600" />
                  <h3 className="text-stone-900 dark:text-stone-100">Goods delivery details (optional)</h3>
                </div>
                <div className="invoice-grid">
                  {Object.entries({
                    packages: 'Packages',
                    grossWeight: 'Gross weight with unit',
                    netWeight: 'Net weight with unit',
                    transport: 'Transport reference',
                    deliveryTerms: 'Delivery terms',
                    origin: 'Country of origin',
                  }).map(([key, label]) => (
                    <span key={key}>{input('shipping', key, label)}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Card 4: Items & Taxable Charges */}
            <div className="invoice-card space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--orbit-border)] pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-violet-600 dark:text-violet-400" />
                  <h3 className="text-stone-900 dark:text-stone-100">Items and taxable charges</h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    update((i) => ({
                      ...i,
                      items: [...i.items, { ...newInvoice().items[0], id: crypto.randomUUID() }],
                    }))
                  }
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 dark:hover:bg-violet-900 transition inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add line</span>
                </button>
              </div>

              <div className="invoice-table-wrapper">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      {['Description / HSN or SAC', 'Kind', 'Quantity / unit', 'Rate', 'Discount %', 'GST %', 'Cess %', ''].map(
                        (h, i) => (
                          <th key={i}>{h}</th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => {
                      const edit = (key, value) => {
                        setClassification(null);
                        update((i) => ({
                          ...i,
                          items: i.items.map((v, n) => (n === index ? { ...v, [key]: value } : v)),
                        }));
                      };
                      return (
                        <tr key={item.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                          <td>
                            <div className="space-y-1.5">
                              <textarea
                                aria-label={`Line ${index + 1} description`}
                                value={item.description}
                                placeholder="Item description"
                                rows={2}
                                className="orbit-control resize-y"
                                onChange={(e) => edit('description', e.target.value)}
                              />
                              <ClassificationInput
                                label={`Line ${index + 1} HSN / SAC`}
                                placeholder="HSN / SAC code"
                                value={item.hsn}
                                onChange={(v) => edit('hsn', v)}
                                onSelect={(entry) => {
                                  edit('hsn', entry.code);
                                  setClassification({ itemId: item.id, entry });
                                }}
                              />
                            </div>
                          </td>
                          <td>
                            <div className="space-y-1.5">
                              <select
                                aria-label={`Line ${index + 1} kind`}
                                value={item.kind}
                                className="orbit-control"
                                onChange={(e) => edit('kind', e.target.value)}
                              >
                                {['goods', 'services', 'charge'].map((k) => (
                                  <option key={k}>{k}</option>
                                ))}
                              </select>
                              {item.kind === 'charge' && (
                                <label className="text-[11px] flex items-center gap-1 text-stone-600 dark:text-stone-400">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(item.taxTreatmentReviewed)}
                                    onChange={(e) => edit('taxTreatmentReviewed', e.target.checked)}
                                  />
                                  <span>Tax treatment reviewed</span>
                                </label>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="space-y-1">
                              <input
                                aria-label={`Line ${index + 1} quantity`}
                                value={item.qty}
                                placeholder="Qty"
                                className="orbit-control text-right"
                                onChange={(e) => edit('qty', e.target.value)}
                              />
                              <input
                                aria-label={`Line ${index + 1} unit`}
                                value={item.unit}
                                placeholder="Unit"
                                className="orbit-control"
                                onChange={(e) => edit('unit', e.target.value)}
                              />
                            </div>
                          </td>
                          {['rate', 'discount', 'gstRate', 'cessRate'].map((k) => (
                            <td key={k}>
                              <input
                                aria-label={`Line ${index + 1} ${k}`}
                                value={item[k]}
                                className="orbit-control text-right"
                                onChange={(e) => edit(k, e.target.value)}
                              />
                            </td>
                          ))}
                          <td className="text-center">
                            {invoice.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  update((i) => ({
                                    ...i,
                                    items: i.items.filter((_, n) => n !== index),
                                  }))
                                }
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                                title={`Remove line ${index + 1}`}
                              >
                                <Trash2 size={15} />
                                <span className="sr-only">Remove line {index + 1}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {classification && (
                <div className="p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40">
                  <GstRateReference
                    entry={classification.entry}
                    onApply={(rate) =>
                      update((i) => ({
                        ...i,
                        items: i.items.map((v) =>
                          v.id === classification.itemId ? { ...v, gstRate: String(rate) } : v
                        ),
                      }))
                    }
                  />
                </div>
              )}

              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Cess supports ad valorem percentages only. Specific/unit cess and pure-agent reimbursements are unsupported. Classify freight/insurance and review the applicable tax rate explicitly.
              </p>
            </div>

            {/* Card 5: Bank Details & Terms */}
            <div className="invoice-card space-y-4">
              <h3 className="text-stone-900 dark:text-stone-100 border-b border-[var(--orbit-border)] pb-2.5">
                Bank Particulars & Terms
              </h3>
              <div className="invoice-grid">
                {input('seller', 'bankName', 'Bank name')}
                {input('seller', 'accountNo', 'Account number')}
                {input('seller', 'ifsc', 'IFSC')}
                {input('seller', 'upiId', 'UPI ID')}
                <label className="block text-xs font-semibold space-y-1">
                  <span className="text-stone-700 dark:text-stone-300">Payments received</span>
                  <input
                    aria-label="Payments received"
                    className="orbit-control text-right"
                    value={invoice.paid}
                    onChange={(e) => update((i) => ({ ...i, paid: e.target.value }))}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <label className="block text-xs font-semibold space-y-1">
                  <span className="text-stone-700 dark:text-stone-300">Notes / terms</span>
                  <textarea
                    aria-label="Notes / terms"
                    className="orbit-control resize-y"
                    rows={3}
                    value={invoice.notes}
                    onChange={(e) => update((i) => ({ ...i, notes: e.target.value }))}
                  />
                </label>
                <div className="space-y-3">
                  <label className="block text-xs font-semibold space-y-1">
                    <span className="text-stone-700 dark:text-stone-300">Authorised signatory</span>
                    <input
                      aria-label="Authorised signatory"
                      className="orbit-control"
                      value={invoice.signatory}
                      onChange={(e) => update((i) => ({ ...i, signatory: e.target.value }))}
                    />
                  </label>
                  <label className="block text-xs font-semibold space-y-1">
                    <span className="text-stone-700 dark:text-stone-300">Signature method</span>
                    <select
                      aria-label="Signature method"
                      className="orbit-control"
                      value={invoice.signatureMode}
                      onChange={(e) => update((i) => ({ ...i, signatureMode: e.target.value }))}
                    >
                      <option value="electronic">Electronic issue under IT Act exception</option>
                      <option value="image">Uploaded authorised signature</option>
                    </select>
                  </label>
                  {invoice.signatureMode === 'image' ? (
                    <label className="block text-xs font-semibold space-y-1">
                      <span className="text-stone-700 dark:text-stone-300">Signature PNG / JPEG</span>
                      <input
                        aria-label="Signature image"
                        type="file"
                        accept="image/png,image/jpeg"
                        className="orbit-control"
                        onChange={(e) => run(() => uploadImage(e, 'signatureImage'))}
                      />
                    </label>
                  ) : (
                    check(
                      'meta',
                      'electronicIssueConfirmed',
                      'I confirm electronic issuance in accordance with the Information Technology Act; this is not IRN registration or a digital signing service.'
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Card 6: Statutory Compliance */}
            <div className="invoice-card space-y-3">
              <h3 className="text-stone-900 dark:text-stone-100 border-b border-[var(--orbit-border)] pb-2.5">
                Statutory Compliance
              </h3>
              <div className="invoice-grid">
                {select('meta', 'reverseCharge', 'Reverse charge', [
                  ['no', 'No — ordinary forward charge'],
                  ['yes', 'Yes — unsupported here'],
                ])}
                {invoice.type === 'b2c'
                  ? select('meta', 'dynamicQrStatus', 'B2C statutory dynamic QR applicability', [
                      ['unknown', 'Not reviewed'],
                      ['not-required', 'Not required for this seller/supply'],
                      ['required', 'Required — integration unavailable'],
                    ])
                  : select('meta', 'einvoiceStatus', 'E-invoice / IRN applicability', [
                      ['unknown', 'Not reviewed'],
                      ['not-required', 'Not required'],
                      ['exempt', 'Statutorily exempt supplier/supply'],
                      ['required', 'Required — IRN registration unavailable'],
                    ])}
                {invoice.meta.einvoiceStatus === 'exempt' &&
                  input('meta', 'einvoiceExemption', 'Reviewed statutory e-invoice exemption')}
              </div>

              <p className="invoice-message">
                E-invoicing generally covers notified B2B/export supplies where aggregate turnover exceeded ₹5 crore in any covered financial year since 2017–18, effective 1 August 2023, subject to supplier/supply exemptions. The ₹10 crore-and-above cohort has a 30-day reporting limit from 1 April 2025. <a href={RULES.einvoice} target="_blank" rel="noreferrer" className="underline">Official IRP references</a>. A PDF is not a registered e-invoice. Review the turnover threshold, covered supplies, exemptions and reporting deadlines on the official GST portal. Applicable/uncertain IRN or dynamic QR cases cannot be finalized here. No IRN or statutory QR is fabricated.
              </p>

              {check(
                'meta',
                'complianceReviewed',
                'I reviewed classification, recipient particulars, place of supply, forward charge, export treatment and e-invoice applicability for this invoice.'
              )}
            </div>
          </div>

          {/* ──── RIGHT COLUMN (35% width - Sticky Inspector & Totals) ──── */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            {/* Live Financial Totals Card */}
            <div className="invoice-card space-y-4 border-2 border-violet-100 dark:border-violet-900/60 shadow-md">
              <div className="flex items-center justify-between border-b border-[var(--orbit-border)] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                  Live Calculation
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800">
                  {invoice.currency}
                </span>
              </div>

              {totals ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Taxable Value</span>
                    <span className="font-mono font-medium">
                      {invoice.currency} {totals.taxable.toFixed(2)}
                    </span>
                  </div>

                  {totals.cgst > 0 && (
                    <div className="flex justify-between text-stone-600 dark:text-stone-400">
                      <span>Central Tax (CGST)</span>
                      <span className="font-mono font-medium">
                        {invoice.currency} {totals.cgst.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {totals.sgst > 0 && (
                    <div className="flex justify-between text-stone-600 dark:text-stone-400">
                      <span>{validation.secondTax || 'State Tax (SGST)'}</span>
                      <span className="font-mono font-medium">
                        {invoice.currency} {totals.sgst.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {totals.igst > 0 && (
                    <div className="flex justify-between text-stone-600 dark:text-stone-400">
                      <span>Integrated Tax (IGST)</span>
                      <span className="font-mono font-medium">
                        {invoice.currency} {totals.igst.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {totals.cess > 0 && (
                    <div className="flex justify-between text-stone-600 dark:text-stone-400">
                      <span>Cess</span>
                      <span className="font-mono font-medium">
                        {invoice.currency} {totals.cess.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {totals.roundOff !== 0 && (
                    <div className="flex justify-between text-stone-500">
                      <span>Round Off</span>
                      <span className="font-mono">
                        {invoice.currency} {totals.roundOff > 0 ? `+${totals.roundOff.toFixed(2)}` : totals.roundOff.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[var(--orbit-border)] flex justify-between items-baseline">
                    <span className="text-sm font-bold text-stone-900 dark:text-stone-100">Grand Total</span>
                    <span className="text-xl font-black font-mono text-violet-700 dark:text-violet-400">
                      {invoice.currency} {totals.total.toFixed(2)}
                    </span>
                  </div>

                  {Number(invoice.paid) > 0 && (
                    <>
                      <div className="flex justify-between text-stone-500 pt-1">
                        <span>Amount Paid</span>
                        <span className="font-mono font-medium">
                          {invoice.currency} {totals.paid.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-stone-900 dark:text-stone-100 font-bold pt-1">
                        <span>Balance Due</span>
                        <span className="font-mono text-rose-600 dark:text-rose-400">
                          {invoice.currency} {totals.balance.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  <p className="text-[10px] text-stone-400 pt-1">
                    Decimal half-up line rounding; INR rounds to whole rupees.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-stone-500">Enter line items to see calculation.</p>
              )}
            </div>

            {/* Validation Checklist Card */}
            <section aria-label="Invoice validation" className="invoice-card space-y-3">
              <div className="flex items-center gap-2 border-b border-[var(--orbit-border)] pb-2.5">
                {validation.errors.length === 0 ? (
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Review before finalization
                </h3>
              </div>

              {validation.totals && (
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {invoice.currency} {validation.totals.total.toFixed(2)} total · {invoice.currency}{' '}
                  {validation.totals.balance.toFixed(2)} balance due. Decimal half-up line rounding; INR final invoice rounds to whole rupees, foreign currency to minor units.
                </p>
              )}

              {validation.errors.length ? (
                <div className="rounded-xl p-3 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-300 mb-1.5">
                    Particulars needing attention:
                  </p>
                  <ul className="text-xs text-rose-700 dark:text-rose-400 space-y-1 list-disc pl-4">
                    {validation.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                  <span>Supported checks passed. Local GSTIN/format checks are not government verification.</span>
                </div>
              )}
            </section>
          </div>
        </div>
      </fieldset>

      {/* ─── PDF Preview Modal ─── */}
      {preview && (
        <div className="invoice-modal-backdrop" role="dialog" aria-modal="true" aria-label="Invoice PDF Preview">
          <div className="invoice-preview-container">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-violet-600" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Invoice PDF Preview ({invoice.meta.invoiceNumber})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreview('')}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              >
                <X size={18} />
                <span className="sr-only">Close preview</span>
              </button>
            </div>
            <iframe title="Invoice PDF preview" src={preview} className="invoice-preview" />
          </div>
        </div>
      )}
    </div>
  );
}
