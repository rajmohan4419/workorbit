import { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect, cloneElement } from 'react';
import { Plus, Trash2, Download, Building2, FileText, Save, X, CheckCircle2 } from 'lucide-react';
import { downloadBlob } from '../../lib/toolFormat';
import { generateInvoicePDF } from './gstInvoicePdf.js';
import './GstInvoice.css';
import { amountToWords, calcItem, invoiceEditorTotals, resolveSupply, validateGstin, validateInvoice } from './gstInvoiceEngine';
import { usePlan } from '../../lib/monetization/usePlan';
import { PlanGate } from '../../components/monetization/PlanGate';
import { trackExportClicked } from '../../lib/analytics';
import { ClassificationInput, GstLookup, GstRateReference } from '../../components/gst/GstReference';

// ─── Constants ───────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir',
  'Ladakh', 'Chandigarh', 'Dadra & Nagar Haveli', 'Daman & Diu', 'Lakshadweep',
  'Puducherry', 'Andaman & Nicobar Islands',
];

const UNITS = ['Nos', 'Kg', 'Hr', 'Ltr', 'Mtr', 'Pcs', 'Set', 'Box', 'Day', 'Month'];
const SELLER_KEY = 'orbitboard:gst-seller';
const INVOICE_NUM_KEY = 'orbitboard:gst-invoice-num';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatAmount = value => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextInvoiceNum() {
  const prev = parseInt(localStorage.getItem(INVOICE_NUM_KEY) || '0', 10);
  const next = prev + 1;
  localStorage.setItem(INVOICE_NUM_KEY, String(next));
  return `INV-${String(next).padStart(4, '0')}`;
}

// ─── Default State Factories ──────────────────────────────────────────────────

function defaultSeller() {
  try {
    const saved = JSON.parse(localStorage.getItem(SELLER_KEY) || 'null');
    if (saved) return saved;
  } catch {
    /* ignore localStorage parse error */
  }
  return {
    companyName: '', logo: '', address: '', city: '', state: 'Maharashtra',
    pin: '', gstin: '', pan: '', phone: '', email: '',
    bankName: '', accountNo: '', ifsc: '', upiId: '',
  };
}

function defaultBuyer() {
  return {
    name: '', address: '', city: '', state: 'Maharashtra',
    pin: '', gstin: '', phone: '', email: '',
  };
}

function defaultMeta() {
  const invDate = today();
  return {
    invoiceNumber: nextInvoiceNum(),
    invoiceDate: invDate,
    dueDate: addDays(invDate, 30),
    poReference: '',
    placeOfSupply: 'Maharashtra',
  };
}

function defaultItem(id) {
  return {
    id,
    description: '',
    hsn: '',
    qty: 1,
    unit: 'Nos',
    rate: 0,
    discount: 0,
    gstRate: 18,
  };
}

// ─── Input Components ─────────────────────────────────────────────────────────

function Field({ label, children, error }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      {[Input, Select, Textarea].includes(children?.type) ? cloneElement(children, { 'aria-label': children.props['aria-label'] || label }) : children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`orbit-control border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white ${className}`}
      {...props}
    />
  );
}

function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`orbit-control border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white resize-none ${className}`}
      {...props}
    />
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-w-0">
      <div className="flex items-center gap-2 px-5 py-3 bg-indigo-50 border-b border-indigo-100">
        {Icon && <Icon size={16} className="text-indigo-600" />}
        <h2 className="text-sm font-semibold text-indigo-800">{title}</h2>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

// ─── PDF Generation ───────────────────────────────────────────────────────────


// ─── Live HTML Preview ────────────────────────────────────────────────────────

function InvoicePreview({ seller, buyer, meta, items, totals, notes, signatory, isInterState }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none">
      {/* Header */}
      <div className="bg-indigo-700 px-6 py-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{seller.companyName || 'Your Company'}</h1>
          <p className="text-indigo-200 text-xs mt-0.5">{seller.address}{seller.city ? `, ${seller.city}` : ''}{seller.state ? `, ${seller.state}` : ''}{seller.pin ? ` - ${seller.pin}` : ''}</p>
          <p className="text-indigo-200 text-xs">{seller.gstin ? `GSTIN: ${seller.gstin}` : ''}{seller.pan ? `  |  PAN: ${seller.pan}` : ''}</p>
          <p className="text-indigo-200 text-xs">{seller.phone}{seller.email ? `  |  ${seller.email}` : ''}</p>
        </div>
        <div className="text-right">
          <p className="text-amber-300 font-bold text-lg">TAX INVOICE</p>
          <p className="text-white text-xs">No: {meta.invoiceNumber}</p>
          <p className="text-white text-xs">Date: {meta.invoiceDate}</p>
          {meta.dueDate && <p className="text-indigo-200 text-xs">Due: {meta.dueDate}</p>}
        </div>
      </div>

      {/* Buyer + Meta */}
      <div className="grid grid-cols-2 gap-4 px-6 py-4 bg-indigo-50 border-b border-indigo-100">
        <div>
          <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Bill To</p>
          <p className="font-semibold text-gray-800">{buyer.name || '—'}</p>
          <p className="text-xs text-gray-600">{buyer.address}</p>
          <p className="text-xs text-gray-600">{buyer.city}{buyer.pin ? ` - ${buyer.pin}` : ''}</p>
          <p className="text-xs text-gray-600">{buyer.state}</p>
          {buyer.gstin && <p className="text-xs text-gray-600">GSTIN: {buyer.gstin}</p>}
          {buyer.phone && <p className="text-xs text-gray-600">{buyer.phone}</p>}
        </div>
        <div className="text-right text-xs text-gray-600 space-y-1">
          {meta.poReference && <p><span className="font-medium">PO Ref:</span> {meta.poReference}</p>}
          <p><span className="font-medium">Place of Supply:</span> {meta.placeOfSupply}</p>
          <p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${isInterState ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
              {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
            </span>
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="px-6 py-4 overflow-x-auto">
        <table className="invoice-preview-table w-full text-xs border-collapse">
          <thead>
            <tr className="bg-indigo-700 text-white">
              <th className="py-2 px-2 text-left rounded-tl-lg w-6">#</th>
              <th className="py-2 px-2 text-left">Description</th>
              <th className="py-2 px-2 text-left">HSN/SAC</th>
              <th className="py-2 px-2 text-right">Qty</th>
              <th className="py-2 px-2 text-right">Rate (₹)</th>
              <th className="py-2 px-2 text-right">Disc %</th>
              <th className="py-2 px-2 text-right">Taxable</th>
              <th className="py-2 px-2 text-right">GST%</th>
              {isInterState
                ? <th className="py-2 px-2 text-right">IGST</th>
                : <><th className="py-2 px-2 text-right">CGST</th><th className="py-2 px-2 text-right">SGST</th></>
              }
              <th className="py-2 px-2 text-right rounded-tr-lg">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const calc = calcItem(item, isInterState);
              return (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50/30'}>
                  <td className="py-1.5 px-2 text-gray-500">{idx + 1}</td>
                  <td className="py-1.5 px-2 font-medium text-gray-800">{item.description || '—'}</td>
                  <td className="py-1.5 px-2 text-gray-500">{item.hsn || '—'}</td>
                  <td className="py-1.5 px-2 text-right">{item.qty} {item.unit}</td>
                  <td className="py-1.5 px-2 text-right">{formatAmount(item.rate)}</td>
                  <td className="py-1.5 px-2 text-right">{item.discount}%</td>
                  <td className="py-1.5 px-2 text-right">{formatAmount(calc.taxable)}</td>
                  <td className="py-1.5 px-2 text-right">{item.gstRate}%</td>
                  {isInterState
                    ? <td className="py-1.5 px-2 text-right">{formatAmount(calc.igst)}</td>
                    : <><td className="py-1.5 px-2 text-right">{formatAmount(calc.cgst)}</td><td className="py-1.5 px-2 text-right">{formatAmount(calc.sgst)}</td></>
                  }
                  <td className="py-1.5 px-2 text-right font-semibold">{formatAmount(calc.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="px-6 pb-4 flex justify-end">
        <div className="w-72 space-y-1 text-sm">
          {[
            ['Subtotal', formatAmount(totals.subtotal)],
            ['Total Discount', `- ₹${formatAmount(totals.totalDiscount)}`],
            ['Taxable Amount', formatAmount(totals.taxableAmount)],
            ...(isInterState
              ? [['IGST', formatAmount(totals.igst)]]
              : [['CGST', formatAmount(totals.cgst)], ['SGST', formatAmount(totals.sgst)]]),
            ['Round Off', (totals.roundOff >= 0 ? '+' : '') + formatAmount(totals.roundOff)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-gray-600 text-xs">
              <span>{k}</span><span className="font-medium">{v}</span>
            </div>
          ))}
          <div className="flex justify-between items-center bg-indigo-700 text-white rounded-lg px-3 py-2 mt-2">
            <span className="font-bold">GRAND TOTAL</span>
            <span className="font-bold text-amber-300 text-base">₹{formatAmount(totals.grandTotal)}</span>
          </div>
          <p className="text-xs text-gray-500 italic mt-1">{amountToWords(totals.grandTotal)}</p>
        </div>
      </div>

      {/* Notes + Bank + Signatory */}
      <div className="grid grid-cols-2 gap-4 px-6 pb-4 border-t border-gray-100 pt-4">
        <div className="space-y-3">
          {notes && (
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Notes / Terms</p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{notes}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Bank Details</p>
            <p className="text-xs text-gray-600">Bank: {seller.bankName || '—'}</p>
            <p className="text-xs text-gray-600">A/C: {seller.accountNo || '—'}</p>
            <p className="text-xs text-gray-600">IFSC: {seller.ifsc || '—'}</p>
            {seller.upiId && <p className="text-xs text-gray-600">UPI: {seller.upiId}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end justify-end">
          <div className="text-center">
            <div className="border-b border-gray-400 w-40 mb-1 mt-8" />
            <p className="text-xs text-gray-600">{signatory || 'Authorised Signatory'}</p>
          </div>
          <p className="text-xs text-gray-400 mt-4">This is a computer generated invoice.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GstInvoice() {
  const [seller, setSeller] = useState(defaultSeller);
  const [buyer, setBuyer] = useState(defaultBuyer);
  const [meta, setMeta] = useState(defaultMeta);
  const [items, setItems] = useState([defaultItem(1)]);
  const [notes, setNotes] = useState('Payment due within 30 days.\nGoods once sold will not be taken back.');
  const [signatory, setSignatory] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sellerErrors, setSellerErrors] = useState({});
  const [buyerErrors, setBuyerErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const itemIdRef = useRef(2);
  const { hasFeature } = usePlan();
  const [gateFeature, setGateFeature] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [classification, setClassification] = useState(null);
  const [lookupRow, setLookupRow] = useState('1');
  const [rateMessage, setRateMessage] = useState('');

  // Persist seller to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(SELLER_KEY, JSON.stringify(seller));
    } catch {
      /* ignore storage write error */
    }
  }, [seller]);

  const supply = useMemo(() => resolveSupply(seller, buyer, meta), [seller, buyer, meta]);
  const isInterState = seller.state !== meta.placeOfSupply;
  const warnings = supply.warnings;
  const totals = useMemo(() => invoiceEditorTotals(items, isInterState), [items, isInterState]);
  const [exportErrors, setExportErrors] = useState([]);
  const [exportAttempts, setExportAttempts] = useState(0);
  const exportErrorRef = useRef(null);
  const validationErrors = exportAttempts > 0 ? validateInvoice({ seller, buyer, meta, items }).errors : [];
  const visibleErrors = [...validationErrors, ...exportErrors];
  useLayoutEffect(() => {
    if (exportAttempts > 0 && exportErrorRef.current) {
      exportErrorRef.current.focus();
      exportErrorRef.current.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    }
  }, [exportAttempts, exportErrors]);

  // Seller field helpers
  const setSF = useCallback((key, val) => {
    setSeller(s => ({ ...s, [key]: val }));
    if (key === 'gstin') {
      setSellerErrors(e => ({ ...e, gstin: val ? validateGstin(val) : '' }));
    }
  }, []);

  const setBF = useCallback((key, val) => {
    setBuyer(b => ({ ...b, [key]: val }));
    if (key === 'gstin') {
      setBuyerErrors(e => ({ ...e, gstin: val ? validateGstin(val) : '' }));
    }
  }, []);

  // Logo upload
  const handleLogoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setSeller(s => ({ ...s, logo: ev.target.result }));
    reader.readAsDataURL(file);
  }, []);

  // Item management
  const addItem = useCallback(() => {
    const id = itemIdRef.current++;
    setItems(prev => [...prev, defaultItem(id)]);
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);
  }, []);

  const updateItem = useCallback((id, key, val) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: val } : i));
    if (key === 'hsn' || key === 'description') setClassification(null);
    setRateMessage('');
  }, []);

  const selectClassification = (id, entry) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, hsn: entry.code, description: item.description || entry.description } : item));
    setClassification({ itemId: id, entry });
    setRateMessage('');
  };

  const applyReferenceRate = (id, rate) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, gstRate: rate } : item));
    setRateMessage(`Reference ${rate}% applied to the selected row. Check applicability before issuing the invoice.`);
  };

  const handleDownloadPDF = useCallback(async () => {
    const validation = validateInvoice({ seller, buyer, meta, items });
    setExportAttempts(count => count + 1);
    setExportErrors([]);
    if (validation.errors.length) return;
    setGenerating(true);
    try {
      const blob = await generateInvoicePDF({ seller, buyer, meta, items, totals, notes, signatory, isInterState });
      if (!downloadBlob(blob, 'orbitboard-gst-invoice.pdf')) throw new Error('The download dialog could not open. Refresh this tab and try again.');
      trackExportClicked('pdf');
    } catch (err) {
      setExportErrors([err.message || 'Could not generate PDF. Review the invoice inputs.']);
    } finally {
      setGenerating(false);
    }
  }, [seller, buyer, meta, items, totals, notes, signatory, isInterState]);

  const handleSaveWorkspace = useCallback(() => {
    if (!hasFeature('saved_workspaces')) {
      setGateFeature('saved_workspaces');
      return;
    }
    try {
      const workspace = { seller, buyer, meta, items, notes, signatory };
      localStorage.setItem('orbitboard:saved-workspace-invoice', JSON.stringify(workspace));
      setSaveMessage('Invoice workspace saved in this browser!');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch {
      setExportErrors(['Could not save locally. Check browser storage availability.']);
    }
  }, [hasFeature, seller, buyer, meta, items, notes, signatory]);

  return (
    <div className="gst-invoice min-w-0 max-w-6xl mx-auto px-2 sm:px-4 py-5 space-y-4">
      {/* Page Title */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-3.5 rounded-2xl border border-[var(--orbit-border)] bg-stone-50/60 dark:bg-stone-900/60 shadow-xs mb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span>GST Invoice Generator</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPreview(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <FileText size={15} />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          <button
            onClick={handleSaveWorkspace}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
          >
            <Save size={15} />
            Save Workspace
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            <Download size={15} />
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      <p className="text-sm">Supported workflow: ordinary domestic supply. Tax split uses seller state and explicit place of supply. GSTIN format/checksum validation is local only, never government verification. PDF text supports Latin/WinAnsi; other scripts can be printed from the browser preview using a suitable local font.</p>
      {warnings.map(w => <p key={w} role="status" className="text-sm text-amber-800">{w}</p>)}
      {visibleErrors.length > 0 && <div ref={exportErrorRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 focus:outline-2 focus:outline-red-600"><h3 className="mb-2 font-semibold">Download needs attention</h3>{visibleErrors.map((error, i) => <p key={i}>{error}</p>)}</div>}
      {/* ── Seller Details ── */}
      <SectionCard icon={Building2} title="Your Company / Seller Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Company Name">
            <Input value={seller.companyName} onChange={e => setSF('companyName', e.target.value)} placeholder="Acme Pvt Ltd" />
          </Field>
          <Field label="Logo (optional)">
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-xs" />
              {seller.logo && <img src={seller.logo} alt="logo" className="h-8 w-8 object-contain rounded" />}
            </div>
          </Field>
          <Field label="GSTIN" error={sellerErrors.gstin}>
            <Input value={seller.gstin} onChange={e => setSF('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} className={sellerErrors.gstin ? 'border-red-400' : ''} />
          </Field>
          <Field label="PAN">
            <Input value={seller.pan} onChange={e => setSF('pan', e.target.value.toUpperCase())} placeholder="AAAAA0000A" maxLength={10} />
          </Field>
          <Field label="Address">
            <Textarea value={seller.address} onChange={e => setSF('address', e.target.value)} rows={2} placeholder="123, Main Street" />
          </Field>
          <Field label="City">
            <Input value={seller.city} onChange={e => setSF('city', e.target.value)} placeholder="Mumbai" />
          </Field>
          <Field label="State">
            <Select value={seller.state} onChange={e => setSF('state', e.target.value)}>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="PIN Code">
            <Input value={seller.pin} onChange={e => setSF('pin', e.target.value)} placeholder="400001" maxLength={6} />
          </Field>
          <Field label="Phone">
            <Input value={seller.phone} onChange={e => setSF('phone', e.target.value)} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Email">
            <Input type="email" value={seller.email} onChange={e => setSF('email', e.target.value)} placeholder="info@acme.com" />
          </Field>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Bank Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Bank Name">
              <Input value={seller.bankName} onChange={e => setSF('bankName', e.target.value)} placeholder="HDFC Bank" />
            </Field>
            <Field label="Account No">
              <Input value={seller.accountNo} onChange={e => setSF('accountNo', e.target.value)} placeholder="123456789012" />
            </Field>
            <Field label="IFSC Code">
              <Input value={seller.ifsc} onChange={e => setSF('ifsc', e.target.value.toUpperCase())} placeholder="HDFC0001234" />
            </Field>
            <Field label="UPI ID">
              <Input value={seller.upiId} onChange={e => setSF('upiId', e.target.value)} placeholder="acme@upi" />
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* ── Buyer + Invoice Meta ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={Building2} title="Bill To / Buyer Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Buyer Name">
              <Input value={buyer.name} onChange={e => setBF('name', e.target.value)} placeholder="XYZ Corp Pvt Ltd" />
            </Field>
            <Field label="GSTIN (optional)" error={buyerErrors.gstin}>
              <Input value={buyer.gstin} onChange={e => setBF('gstin', e.target.value.toUpperCase())} placeholder="27AAAAA0000A1Z5" maxLength={15} className={buyerErrors.gstin ? 'border-red-400' : ''} />
            </Field>
            <Field label="Address">
              <Textarea value={buyer.address} onChange={e => setBF('address', e.target.value)} rows={2} placeholder="456, Park Avenue" />
            </Field>
            <Field label="City">
              <Input value={buyer.city} onChange={e => setBF('city', e.target.value)} placeholder="Pune" />
            </Field>
            <Field label="State">
              <Select value={buyer.state} onChange={e => setBF('state', e.target.value)}>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="PIN Code">
              <Input value={buyer.pin} onChange={e => setBF('pin', e.target.value)} placeholder="411001" maxLength={6} />
            </Field>
            <Field label="Phone">
              <Input value={buyer.phone} onChange={e => setBF('phone', e.target.value)} placeholder="+91 99887 76655" />
            </Field>
            <Field label="Email">
              <Input type="email" value={buyer.email} onChange={e => setBF('email', e.target.value)} placeholder="buyer@xyz.com" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={FileText} title="Invoice Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Invoice Number">
              <Input value={meta.invoiceNumber} onChange={e => setMeta(m => ({ ...m, invoiceNumber: e.target.value }))} />
            </Field>
            <Field label="Invoice Date">
              <Input type="date" value={meta.invoiceDate} onChange={e => setMeta(m => ({ ...m, invoiceDate: e.target.value }))} />
            </Field>
            <Field label="Due Date">
              <Input type="date" value={meta.dueDate} onChange={e => setMeta(m => ({ ...m, dueDate: e.target.value }))} />
            </Field>
            <Field label="PO Reference">
              <Input value={meta.poReference} onChange={e => setMeta(m => ({ ...m, poReference: e.target.value }))} placeholder="PO-2024-001" />
            </Field>
            <Field label="Place of Supply">
              <Select value={meta.placeOfSupply} onChange={e => setMeta(m => ({ ...m, placeOfSupply: e.target.value }))}>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Supply Type">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isInterState ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                {isInterState ? '⚡ Inter-State — IGST' : '✓ Intra-State — CGST + SGST'}
              </div>
            </Field>
          </div>
        </SectionCard>
      </div>

      {/* ── Line Items ── */}
      <SectionCard icon={FileText} title="Line Items">
        <div className="mb-3">
          <label className="text-sm">Apply lookup rate to row{' '}
            <select aria-label="Invoice row for GST lookup" className="orbit-control max-w-full w-full min-w-0" value={items.some(item => String(item.id) === lookupRow) ? lookupRow : String(items[0].id)} onChange={event => setLookupRow(event.target.value)}>
              {items.map((item, index) => <option key={item.id} value={item.id}>{index + 1} — {(item.description || 'New item').slice(0, 65)}{item.description?.length > 65 ? '…' : ''}</option>)}
            </select>
          </label>
          <GstLookup key={`${lookupRow}-${meta.invoiceDate}`} onApply={rate => applyReferenceRate(Number(items.some(item => String(item.id) === lookupRow) ? lookupRow : items[0].id), rate)} />
          {classification && items.some(item => item.id === classification.itemId) && <GstRateReference key={`${classification.itemId}-${classification.entry.code}-${meta.invoiceDate}`} entry={classification.entry}
            context={`Selected invoice row ${items.findIndex(item => item.id === classification.itemId) + 1}:`}
            onApply={rate => applyReferenceRate(classification.itemId, rate)} />}
          {rateMessage && <p role="status" className="text-sm text-indigo-700">{rateMessage}</p>}
          <p className="text-xs text-gray-600">Type a product, service or code in either line-item field for suggestions. Selecting a classification preserves your description and current GST rate. Rate references appear above the table.</p>
        </div>
        <div className="invoice-items-scroll" role="region" aria-label="Invoice line items, scroll horizontally for all columns" tabIndex={0}>
          <table className="invoice-items">
            <caption className="sr-only">Invoice line items with quantities, discounts and GST</caption>
            <colgroup>
              <col className="invoice-col-number" /><col className="invoice-col-description" />
              <col className="invoice-col-hsn" /><col className="invoice-col-qty" />
              <col className="invoice-col-unit" /><col className="invoice-col-rate" />
              <col className="invoice-col-discount" /><col className="invoice-col-money" />
              <col className="invoice-col-gst" />
              {isInterState ? <col className="invoice-col-money" /> : <><col className="invoice-col-tax" /><col className="invoice-col-tax" /></>}
              <col className="invoice-col-amount" /><col className="invoice-col-action" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="py-2 px-2 text-left font-semibold">#</th>
                <th className="py-2 px-2 text-left font-semibold">Description</th>
                <th className="py-2 px-2 text-left font-semibold">HSN/SAC</th>
                <th className="py-2 px-2 text-right font-semibold">Qty</th>
                <th className="py-2 px-2 text-left font-semibold">Unit</th>
                <th className="py-2 px-2 text-right font-semibold">Rate (₹)</th>
                <th className="py-2 px-2 text-right font-semibold">Disc%</th>
                <th className="py-2 px-2 text-right font-semibold">Taxable</th>
                <th className="py-2 px-2 text-right font-semibold">GST%</th>
                {isInterState
                  ? <th className="py-2 px-2 text-right font-semibold">IGST</th>
                  : <><th className="py-2 px-2 text-right font-semibold">CGST</th><th className="py-2 px-2 text-right font-semibold">SGST</th></>
                }
                <th className="py-2 px-2 text-right font-semibold">Amount</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const calc = calcItem(item, isInterState);
                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-1 px-2 text-gray-400">{idx + 1}</td>
                    <td className="py-1 px-2">
                      <ClassificationInput multiline label={`Description, row ${idx + 1}`} value={item.description} onChange={value => updateItem(item.id, 'description', value)} onSelect={entry => selectClassification(item.id, entry)} placeholder="Service / Product description" />
                    </td>
                    <td className="py-1 px-2">
                      <ClassificationInput label={`HSN/SAC, row ${idx + 1}`} value={item.hsn} onChange={value => updateItem(item.id, 'hsn', value)} onSelect={entry => selectClassification(item.id, entry)} placeholder="Code / search" />
                    </td>
                    <td className="py-1 px-2">
                      <Input type="number" min="0" aria-label={`Quantity, row ${idx + 1}`} value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} className="orbit-control--dense w-full text-right" />
                    </td>
                    <td className="py-1 px-2">
                      <Select aria-label={`Unit, row ${idx + 1}`} value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} className="orbit-control--dense w-full">
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </Select>
                    </td>
                    <td className="py-1 px-2">
                      <Input type="number" min="0" aria-label={`Rate, row ${idx + 1}`} value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)} className="orbit-control--dense w-full text-right" />
                    </td>
                    <td className="py-1 px-2">
                      <Input type="number" min="0" max="100" aria-label={`Discount percentage, row ${idx + 1}`} value={item.discount} onChange={e => updateItem(item.id, 'discount', e.target.value)} className="orbit-control--dense w-full text-right" />
                    </td>
                    <td className="py-1 px-2 text-right font-medium text-gray-700">{formatAmount(calc.taxable)}</td>
                    <td className="py-1 px-2">
                      <Input type="number" min="0" max="100" step="0.01" aria-label={`GST percentage, row ${idx + 1}`} value={item.gstRate} onChange={e => updateItem(item.id, 'gstRate', e.target.value)} className="orbit-control--dense w-full" />
                    </td>
                    {isInterState
                      ? <td className="py-1 px-2 text-right text-gray-600">{formatAmount(calc.igst)}</td>
                      : <><td className="py-1 px-2 text-right text-gray-600">{formatAmount(calc.cgst)}</td><td className="py-1 px-2 text-right text-gray-600">{formatAmount(calc.sgst)}</td></>
                    }
                    <td className="py-1 px-2 text-right font-semibold text-indigo-700">₹{formatAmount(calc.total)}</td>
                    <td className="py-1 px-2">
                      <button type="button" aria-label={`Remove item ${idx + 1}`} onClick={() => removeItem(item.id)} className="invoice-row-action text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button onClick={addItem} className="mt-1 min-h-11 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
          <Plus size={15} /> Add Item
        </button>

        {/* Totals Summary */}
        <div className="mt-2 flex justify-end">
          <div className="invoice-totals space-y-1 text-sm">
            {[
              ['Subtotal', `₹${formatAmount(totals.subtotal)}`],
              ['Total Discount', `- ₹${formatAmount(totals.totalDiscount)}`],
              ['Taxable Amount', `₹${formatAmount(totals.taxableAmount)}`],
              ...(isInterState
                ? [['IGST', `₹${formatAmount(totals.igst)}`]]
                : [['CGST', `₹${formatAmount(totals.cgst)}`], ['SGST', `₹${formatAmount(totals.sgst)}`]]),
              ['Round Off', (totals.roundOff >= 0 ? '+' : '') + `₹${formatAmount(totals.roundOff)}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 text-gray-600 text-sm border-b border-gray-50 pb-1">
                <span>{k}</span><span className="font-medium text-right tabular-nums">{v}</span>
              </div>
            ))}
            <div className="flex justify-between items-center bg-indigo-700 text-white rounded-xl px-4 py-2.5 mt-2">
              <span className="font-bold">GRAND TOTAL</span>
              <span className="font-bold text-amber-300 text-lg">₹{formatAmount(totals.grandTotal)}</span>
            </div>
            <p className="text-xs text-gray-500 italic">{amountToWords(totals.grandTotal)}</p>
          </div>
        </div>
      </SectionCard>

      {/* ── Notes + Signatory ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SectionCard icon={FileText} title="Notes / Terms & Conditions">
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            className="w-full"
            placeholder="Payment terms, return policy, etc."
          />
        </SectionCard>
        <SectionCard icon={Building2} title="Authorised Signatory">
          <Field label="Signatory Name">
            <Input value={signatory} onChange={e => setSignatory(e.target.value)} placeholder="John Doe, Director" />
          </Field>
          <p className="text-xs text-gray-400 mt-3">Name appears on the invoice below the signature line.</p>
        </SectionCard>
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-3 flex-wrap">
        <button
          onClick={() => setShowPreview(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          <FileText size={15} />
          {showPreview ? 'Hide Preview' : 'Show Live Preview'}
        </button>
        <button
          onClick={handleSaveWorkspace}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
        >
          <Save size={15} />
          Save Workspace
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          <Download size={15} />
          {generating ? 'Generating PDF…' : 'Download PDF'}
        </button>
      </div>

      {/* ── Live HTML Preview ── */}
      {showPreview && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Live Invoice Preview</h2>
          <InvoicePreview
            seller={seller}
            buyer={buyer}
            meta={meta}
            items={items}
            totals={totals}
            notes={notes}
            signatory={signatory}
            isInterState={isInterState}
          />
        </div>
      )}

      {/* ── Upgrade Prompt Modal ── */}
      {gateFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg">
            <button
              type="button"
              onClick={() => setGateFeature(null)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition"
              aria-label="Close upgrade prompt"
            >
              <X size={16} />
            </button>
            <PlanGate feature={gateFeature} />
          </div>
        </div>
      )}
    </div>
  );
}
