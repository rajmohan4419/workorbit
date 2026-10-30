import { Link, useParams } from 'react-router-dom';
import { lazy, useEffect, useMemo, useState, useRef } from 'react';
import { 
  ArrowRight, ArrowLeft, Share2, RotateCcw, RotateCw, Trash2, Download,
  CheckSquare, Square, Maximize2, Star, ChevronRight, 
  ChevronDown, Coins, BriefcaseBusiness, Code2, Calculator, TrendingUp 
} from 'lucide-react';
import { TOOLS, LISTED_TOOLS } from '../data/toolCatalog';
import { TOOL_CONTENT } from '../data/toolContent';
import { mergePdfFiles, extractPdfPages, splitPdfPages, reorderPdfPages, optimizePdf, loadPdf, createEditedPdf } from '../engines/pdf';
import { renderPdfPages, extractPdfText } from '../engines/pdfRenderer';
import { csvToXlsx, jsonToXlsx, xlsxToCsv } from '../engines/spreadsheet';
import { Field, Result, ComingSoon } from '../components/tools/ToolFields';
import { money, num, downloadBlob } from '../lib/toolFormat';
import { CompoundInterest, FdMaturity, RdMaturity, LoanAmortization, HraExemption } from '../tools/finance/FinanceCalculators';
import { SaasRetention, SalesPipelineForecaster, SaasPricing } from '../tools/business/BusinessCalculators';
import { InvoiceAging, DecisionMatrix } from '../tools/business/BusinessWorkflows';
import { GstInvoice } from '../tools/business/GstInvoice';
import { GifMaker } from '../tools/everyday/GifMaker';
import { ImageToGif, VideoToGif } from '../tools/media/GifTools';
import { FileUploadWithDrive } from '../components/tools/FileUploadWithDrive';
import SampleAd from '../components/SampleAd';
import { isAdEligible, loadAdSense } from '../lib/adsense';
import AdSenseUnit from '../components/AdSenseUnit';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';
import { QuickAccessLeftSidebar } from '../components/layout/QuickAccessLeftSidebar';

const GratuityCalculator = lazy(() => import('../tools/career/GratuityCalculator'));
const IndiaIncomeTaxCalculator = lazy(() => import('../tools/finance/IndiaIncomeTaxCalculator'));
const GlobalIncomeTaxCalculator = lazy(() => import('../tools/finance/GlobalIncomeTaxCalculator'));
const PdfESign = lazy(() => import('../tools/pdf/PdfESign'));
const GlobalTimeZoneConverter = lazy(() => import('../tools/GlobalTimeZoneConverter'));

function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');

  // Password will be generated on demand via generate()


  const poolSize = (useUpper ? (excludeAmbiguous ? 24 : 26) : 0) +
                   (useLower ? (excludeAmbiguous ? 24 : 26) : 0) +
                   (useNumbers ? (excludeAmbiguous ? 8 : 10) : 0) +
                   (useSymbols ? 26 : 0);

  const entropy = password && poolSize > 0 ? Math.round(length * Math.log2(poolSize)) : 0;

  const strength = entropy < 40 ? 'Weak' : entropy < 65 ? 'Moderate' : entropy < 90 ? 'Strong' : 'Very Strong';

  const generate = () => {
    let chars = '';
    if (useUpper) chars += excludeAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += excludeAmbiguous ? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    if (useNumbers) chars += excludeAmbiguous ? '23456789' : '0123456789';
    if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!chars) { setPassword(''); return; }
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars[array[i] % chars.length];
    }
    setPassword(res);
  };

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { void 0; }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-5">
        <label className="block space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-stone-700 dark:text-stone-300">
            <span>Password Length</span>
            <span className="text-sm font-bold text-accent-700 dark:text-accent-400">{length} characters</span>
          </div>
          <input
            type="range"
            min="8"
            max="64"
            value={length}
            onChange={e => setLength(Number(e.target.value))}
            className="w-full accent-accent-600 h-2 bg-stone-200 dark:bg-stone-800 rounded-lg cursor-pointer"
          />
        </label>

        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Character Types</span>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Uppercase (A-Z)</span>
              <input type="checkbox" checked={useUpper} onChange={e => setUseUpper(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
            </label>

            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Lowercase (a-z)</span>
              <input type="checkbox" checked={useLower} onChange={e => setUseLower(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
            </label>

            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Numbers (0-9)</span>
              <input type="checkbox" checked={useNumbers} onChange={e => setUseNumbers(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
            </label>

            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Symbols (!@#$)</span>
              <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
            </label>
          </div>

          <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer mt-3">
            <div>
              <span className="block text-sm font-medium text-stone-800 dark:text-stone-200">Exclude Ambiguous Characters</span>
              <span className="block text-xs text-stone-500 dark:text-stone-400">Avoids 0, O, I, l, 1</span>
            </div>
            <input type="checkbox" checked={excludeAmbiguous} onChange={e => setExcludeAmbiguous(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
          </label>
        </div>

        <button onClick={generate} className="w-full rounded-xl bg-accent-600 text-white py-3 px-5 font-semibold hover:bg-accent-500 transition min-h-[44px]">
          Regenerate Password
        </button>
      </div>

      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 h-fit">
        <h3 className="text-sm font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">Generated Output</h3>

        <div className="rounded-2xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 space-y-3">
          <textarea
            readOnly
            value={password || 'Please select at least one character type.'}
            rows={3}
            className="w-full font-mono text-base sm:text-lg break-all text-stone-900 dark:text-stone-100 bg-transparent outline-none resize-none"
          />

          <button
            onClick={copyToClipboard}
            disabled={!password}
            className="w-full rounded-xl bg-accent-600 text-white py-2.5 text-sm font-semibold hover:bg-accent-500 disabled:opacity-50 transition min-h-[44px]"
          >
            {copied ? 'Copied to Clipboard!' : 'Copy Password'}
          </button>
        </div>

        <div className="space-y-3">
          <Result label="Entropy Score" value={`${entropy} bits`} highlight />
          <Result label="Password Strength" value={strength} highlight={strength === 'Very Strong' || strength === 'Strong'} />
        </div>
      </div>
    </div>
  );
}

function createTextPdf(lines) {
  const encoder = new TextEncoder();
  const pageChunks = [];
  for (let i = 0; i < (lines.length ? lines.length : 1); i += 48) pageChunks.push((lines.length ? lines : [['OrbitBoard']]).slice(i, i + 48));
  const objects = [null];
  const addObj = s => { objects.push(s); return objects.length - 1; };
  const pagesId = 2;
  addObj('<< /Type /Pages /Kids [PAGE_KIDS] /Count PAGE_COUNT >>');
  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];
  const escape = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');
  pageChunks.forEach(page => {
    let stream = 'BT\n/F1 9 Tf\n40 800 Td\n';
    page.forEach((line, idx) => { if (idx) stream += '0 -15 Td\n'; stream += '(' + escape(line) + ') Tj\n'; });
    stream += 'ET\n';
    const contentId = addObj('<< /Length ' + encoder.encode(stream).length + ' >>\nstream\n' + stream + 'endstream');
    const pageId = addObj('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' + fontId + ' 0 R >> >> /Contents ' + contentId + ' 0 R >>');
    pageIds.push(pageId);
  });
  objects[pagesId] = '<< /Type /Pages /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] /Count ' + pageIds.length + ' >>';
  objects[1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
  const header = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 255, 255, 255, 255, 10]);
  const parts = [header], offsets = [0]; let pos = header.length;
  for (let i = 1; i < objects.length; i++) {
    const b = encoder.encode(i + ' 0 obj\n'), body = encoder.encode(objects[i]), e = encoder.encode('\nendobj\n');
    offsets[i] = pos; parts.push(b, body, e); pos += b.length + body.length + e.length;
  }
  const xrefStart = pos; let xref = 'xref\n0 ' + objects.length + '\n0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i++) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  xref += 'trailer << /Size ' + objects.length + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF';
  parts.push(encoder.encode(xref));
  return new Blob(parts, { type: 'application/pdf' });
}

function calculateNewTax(taxable) {
  const slabs = [[400000, 0], [400000, .05], [400000, .10], [400000, .15], [400000, .20], [400000, .25], [Infinity, .30]];
  let remaining = taxable, tax = 0;
  for (const [limit, rate] of slabs) { const amount = Math.min(remaining, limit); if (amount <= 0) break; tax += amount * rate; remaining -= amount; }
  if (taxable <= 1200000) tax = Math.max(0, tax - 60000);
  return tax * 1.04;
}

function calculateOldTax(taxable) {
  const slabs = [[250000, 0], [250000, .05], [500000, .20], [Infinity, .30]];
  let remaining = taxable, tax = 0;
  for (const [limit, rate] of slabs) { const amount = Math.min(remaining, limit); if (amount <= 0) break; tax += amount * rate; remaining -= amount; }
  if (taxable <= 500000) tax = Math.max(0, tax - 12500);
  return tax * 1.04;
}

function SalaryCalculator() {
  const [ctc, setCtc] = useState('1000000');
  const [basicPct, setBasicPct] = useState('40');
  const [variable, setVariable] = useState('0');
  const [gratuity, setGratuity] = useState('0');
  const [pfCap, setPfCap] = useState(true);
  const [regime, setRegime] = useState('new');
  const [state, setState] = useState('Karnataka');

  const result = useMemo(() => {
    const annualCtc = num(ctc), basic = annualCtc * num(basicPct) / 100;
    const monthlyBasic = basic / 12;
    const employeePf = pfCap ? Math.min(monthlyBasic, 15000) * .12 * 12 : basic * .12;
    const employerPf = employeePf;
    const annualGratuity = num(gratuity);
    const annualVariable = num(variable);
    const grossCash = Math.max(0, annualCtc - employerPf - annualGratuity);
    const fixedGross = Math.max(0, grossCash - annualVariable);
    const standardDeduction = regime === 'new' ? 75000 : 50000;
    const taxable = Math.max(0, fixedGross - standardDeduction);
    const incomeTax = regime === 'new' ? calculateNewTax(taxable) : calculateOldTax(taxable);
    const pt = state === 'Karnataka' && fixedGross / 12 >= 25000 ? 2500 : 0;
    const annualTakeHome = Math.max(0, fixedGross - employeePf - incomeTax - pt);
    return { annualCtc, basic, employeePf, employerPf, annualGratuity, annualVariable, fixedGross, taxable, incomeTax, pt, annualTakeHome, monthlyTakeHome: annualTakeHome / 12 };
  }, [ctc, basicPct, variable, gratuity, pfCap, regime, state]);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Salary & Deduction Inputs</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Annual CTC (₹)" value={ctc} onChange={setCtc} />
          <Field label="Basic salary as % of CTC" value={basicPct} onChange={setBasicPct} />
          <Field label="Annual variable pay included (₹)" value={variable} onChange={setVariable} />
          <Field label="Annual gratuity included (₹)" value={gratuity} onChange={setGratuity} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
            <span>
              <span className="block text-xs font-semibold text-stone-800 dark:text-stone-200">EPF calculation</span>
              <span className="block text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Cap employee PF at ₹1,800/month</span>
            </span>
            <input type="checkbox" checked={pfCap} onChange={e => setPfCap(e.target.checked)} className="w-5 h-5 rounded text-accent-600" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Tax regime</span>
            <select value={regime} onChange={e => setRegime(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500 min-h-[44px]">
              <option value="new">New regime (default)</option>
              <option value="old">Old regime</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Professional tax state</span>
          <select value={state} onChange={e => setState(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500 min-h-[44px]">
            <option>Karnataka</option>
            <option value="none">Other / calculate separately</option>
          </select>
        </label>
      </div>

      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 h-fit">
        <h3 className="text-sm font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">Take-Home Summary</h3>
        <div className="space-y-3">
          <Result label="Estimated monthly take-home" value={`₹ ${money(result.monthlyTakeHome)}`} highlight />
          <Result label="Estimated annual take-home" value={`₹ ${money(result.annualTakeHome)}`} highlight />
          <Result label="Annual income tax + cess" value={`₹ ${money(result.incomeTax)}`} />
          <Result label="Employee EPF" value={`₹ ${money(result.employeePf)}`} />
          <Result label="Employer EPF included in CTC" value={`₹ ${money(result.employerPf)}`} />
          <Result label="Professional tax" value={`₹ ${money(result.pt)}`} />
        </div>
        <div className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 text-xs text-stone-600 dark:text-stone-400 space-y-2">
          <div className="flex justify-between"><span>Gross cash salary before deductions</span><span className="font-semibold text-stone-900 dark:text-stone-100">₹ {money(result.fixedGross)}</span></div>
          <div className="flex justify-between"><span>Standard deduction</span><span className="font-semibold text-stone-900 dark:text-stone-100">₹ {money(regime === 'new' ? 75000 : 50000)}</span></div>
          <div className="flex justify-between"><span>Taxable salary used</span><span className="font-semibold text-stone-900 dark:text-stone-100">₹ {money(result.taxable)}</span></div>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">Estimate only. Actual payslips can differ based on PF structure, tax declarations, and employer policy.</p>
      </div>
    </div>
  );
}

function SalaryHike() {
  const [old, setOld] = useState('1000000');
  const [next, setNext] = useState('1200000');
  const o = num(old), n = num(next), h = o ? ((n - o) / o) * 100 : 0;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Current annual salary (₹)" value={old} onChange={setOld} />
        <Field label="New annual salary (₹)" value={next} onChange={setNext} />
      </div>
      <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-20 h-fit">
        <Result label="Percentage Hike" value={`${h.toFixed(2)}%`} highlight />
        <Result label="Absolute Increase" value={`₹ ${money(n - o)} / year`} />
        <Result label="Monthly Increase" value={`₹ ${money((n - o) / 12)} / month`} />
      </div>
    </div>
  );
}

function Offer() {
  const [a, setA] = useState('1000000');
  const [b, setB] = useState('1300000');
  const [basicPct, setBasicPct] = useState('40');
  const [variableA, setVariableA] = useState('0');
  const [variableB, setVariableB] = useState('0');
  const [regime, setRegime] = useState('new');

  const calculateTakeHome = (ctc, variable) => {
    const annual = num(ctc), basic = annual * num(basicPct) / 100, monthlyBasic = basic / 12;
    const employeePf = Math.min(monthlyBasic, 15000) * .12 * 12;
    const employerPf = employeePf, fixedGross = Math.max(0, annual - employerPf - num(variable));
    const standardDeduction = regime === 'new' ? 75000 : 50000;
    const taxable = Math.max(0, fixedGross - standardDeduction);
    const tax = regime === 'new' ? calculateNewTax(taxable) : calculateOldTax(taxable);
    const pt = fixedGross / 12 >= 25000 ? 2500 : 0;
    const annualTakeHome = Math.max(0, fixedGross - employeePf - tax - pt);
    return { annualTakeHome, monthlyTakeHome: annualTakeHome / 12 };
  };

  const first = calculateTakeHome(a, variableA), second = calculateTakeHome(b, variableB);
  const ctcDiff = num(b) - num(a), takeHomeDiff = second.annualTakeHome - first.annualTakeHome;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 space-y-3">
            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">Offer A</p>
            <Field label="Annual CTC (₹)" value={a} onChange={setA} />
            <Field label="Variable pay (₹)" value={variableA} onChange={setVariableA} />
          </div>
          <div className="rounded-2xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 space-y-3">
            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">Offer B</p>
            <Field label="Annual CTC (₹)" value={b} onChange={setB} />
            <Field label="Variable pay (₹)" value={variableB} onChange={setVariableB} />
          </div>
        </div>
        <Field label="Basic salary as % of CTC" value={basicPct} onChange={setBasicPct} />
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Tax regime</span>
          <select value={regime} onChange={e => setRegime(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500 min-h-[44px]">
            <option value="new">New regime</option>
            <option value="old">Old regime</option>
          </select>
        </label>
      </div>

      <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-20 h-fit">
        <Result label="Offer A monthly take-home" value={`₹ ${money(first.monthlyTakeHome)}`} highlight />
        <Result label="Offer B monthly take-home" value={`₹ ${money(second.monthlyTakeHome)}`} highlight />
        <Result label="CTC difference" value={`₹ ${money(ctcDiff)} / year`} />
        <Result label="Take-home difference / month" value={`₹ ${money(takeHomeDiff / 12)}`} highlight />
      </div>
    </div>
  );
}

function Notice() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState('60');
  const d = new Date(date);
  const valid = !Number.isNaN(d.getTime());
  if (valid) d.setDate(d.getDate() + num(days));

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Resignation date" value={date} onChange={setDate} type="date" />
        <Field label="Notice period (days)" value={days} onChange={setDays} />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        {valid ? (
          <Result label="Calculated last working date" value={d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} highlight />
        ) : (
          <p className="text-sm text-red-400">Enter a valid resignation date.</p>
        )}
      </div>
    </div>
  );
}

function Experience() {
  const [from, setFrom] = useState('2012-01-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const start = new Date(from), end = new Date(to);
  const valid = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;
  const d = valid ? (end - start) / 86400000 : 0;
  const years = Math.floor(d / 365.2425), months = Math.floor((d - years * 365.2425) / 30.44);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Start date" value={from} onChange={setFrom} type="date" />
        <Field label="End date" value={to} onChange={setTo} type="date" />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        {valid ? (
          <Result label="Total Experience" value={`${years} years ${months} months`} highlight />
        ) : (
          <p className="text-sm text-red-400">Choose an end date on or after the start date.</p>
        )}
      </div>
    </div>
  );
}

function ExportActions({ content, filename = 'orbitboard-result.txt' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { void 0; } };
  const download = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <button type="button" onClick={copy} className="rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-2.5 text-sm font-semibold hover:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500 min-h-[44px]">
        {copied ? 'Copied!' : 'Copy result'}
      </button>
      <button type="button" onClick={download} className="rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-300 min-h-[44px]">
        Export .txt
      </button>
    </div>
  );
}

function Converter({ type }) {
  const configs = {
    length: { units: { mm: 1, cm: 10, m: 1000, km: 1000000, in: 25.4, ft: 304.8, mi: 1609344 }, labels: { mm: 'Millimetres', cm: 'Centimetres', m: 'Metres', km: 'Kilometres', in: 'Inches', ft: 'Feet', mi: 'Miles' } },
    weight: { units: { g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237, t: 1000000 }, labels: { g: 'Grams', kg: 'Kilograms', oz: 'Ounces', lb: 'Pounds', t: 'Tonnes' } },
    time: { units: { s: 1, min: 60, h: 3600, d: 86400 }, labels: { s: 'Seconds', min: 'Minutes', h: 'Hours', d: 'Days' } }
  };
  const cfg = configs[type]; const keys = Object.keys(cfg.units);
  const [value, setValue] = useState('1'); const [from, setFrom] = useState(keys[0]); const [to, setTo] = useState(keys[1] || keys[0]);
  const result = num(value) * cfg.units[from] / cfg.units[to];
  const text = `${value} ${cfg.labels[from]} = ${Number.isFinite(result) ? result.toLocaleString('en-IN', { maximumFractionDigits: 8 }) : 'Invalid'} ${cfg.labels[to]}`;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Value" value={value} onChange={setValue} />
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">From</span>
            <select value={from} onChange={e => setFrom(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
              {keys.map(k => <option key={k} value={k}>{cfg.labels[k]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">To</span>
            <select value={to} onChange={e => setTo(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
              {keys.map(k => <option key={k} value={k}>{cfg.labels[k]}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-4">
        <Result label="Converted value" value={text} highlight />
        <ExportActions content={text} filename={`orbitboard-${type}-conversion.txt`} />
      </div>
    </div>
  );
}

function TemperatureConverter() {
  const [value, setValue] = useState('25'); const [from, setFrom] = useState('C'); const [to, setTo] = useState('F');
  const toC = v => from === 'C' ? v : from === 'F' ? (v - 32) * 5 / 9 : v - 273.15;
  const c = toC(num(value)); const result = to === 'C' ? c : to === 'F' ? c * 9 / 5 + 32 : c + 273.15;
  const text = `${value} ${from} = ${Number.isFinite(result) ? result.toFixed(6) : 'Invalid'} ${to}`;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Temperature" value={value} onChange={setValue} />
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className="text-xs font-semibold text-stone-700 dark:text-stone-300">From</span>
            <select value={from} onChange={e => setFrom(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
              <option value="C">Celsius</option><option value="F">Fahrenheit</option><option value="K">Kelvin</option>
            </select>
          </label>
          <label className="block"><span className="text-xs font-semibold text-stone-700 dark:text-stone-300">To</span>
            <select value={to} onChange={e => setTo(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
              <option value="C">Celsius</option><option value="F">Fahrenheit</option><option value="K">Kelvin</option>
            </select>
          </label>
        </div>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-4">
        <Result label="Converted value" value={text} highlight />
        <ExportActions content={text} filename="orbitboard-temperature-conversion.txt" />
      </div>
    </div>
  );
}

function ImageConverter({ format }) {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState('0.92');
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState('');
  const isJpg = format === 'image/jpeg'; const ext = isJpg ? 'jpg' : 'png';

  const convert = async () => {
    if (!file) { setStatus('Choose an image first.'); return; }
    setStatus('Converting...');
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url;
      });
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (isJpg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(image, 0, 0);
      setPreview(canvas.toDataURL('image/' + (isJpg ? 'jpeg' : 'png'), isJpg ? Number(quality) : undefined));
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/' + (isJpg ? 'jpeg' : 'png'), isJpg ? Number(quality) : undefined));
      if (!blob) throw new Error('Could not create output image');
      const toolSlug = isJpg ? 'png-to-jpg' : 'jpg-to-png';
      downloadBlob(blob, `orbitboard-${toolSlug}.${ext}`, toolSlug);
      setStatus('Done — your converted image is ready.');
    } catch { setStatus('Could not convert this image. Try another file.'); }
    finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <FileUploadWithDrive
          label="Image file"
          accept="image/*"
          file={file}
          onFileSelect={f => { setFile(f); setStatus(''); }}
          onClear={() => { setFile(null); setStatus(''); }}
        />
        {isJpg && (
          <label className="block">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">JPG Quality: {Math.round(Number(quality) * 100)}%</span>
            <input type="range" min="0.5" max="1" step="0.01" value={quality} onChange={e => setQuality(e.target.value)} className="mt-2 w-full" />
          </label>
        )}
        <button onClick={convert} className="rounded-xl bg-accent-600 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-500 min-h-[44px] min-w-[44px]">
          Convert to {ext.toUpperCase()}
        </button>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        {preview && <img src={preview} alt="Converted preview" className="max-h-72 max-w-full rounded-2xl border border-[var(--orbit-border)] object-contain" />}
        {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
      </div>
    </div>
  );
}

function Percentage() {
  const [value, setValue] = useState('100'), [pct, setPct] = useState('20');
  const amount = num(value) * num(pct) / 100;
  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Base value" value={value} onChange={setValue} />
        <Field label="Percentage (%)" value={pct} onChange={setPct} />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Percentage amount" value={`₹ ${money(amount)}`} highlight />
        <Result label="Value after increase" value={`₹ ${money(num(value) + amount)}`} />
      </div>
    </div>
  );
}

function Emi() {
  const [principal, setPrincipal] = useState('1000000'), [rate, setRate] = useState('9'), [years, setYears] = useState('5');
  const p = num(principal), r = num(rate) / 1200, n = Math.max(1, Math.round(num(years) * 12));
  const emi = r ? p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : p / n;
  const total = emi * n;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Loan amount (₹)" value={principal} onChange={setPrincipal} />
        <Field label="Annual interest rate (%)" value={rate} onChange={setRate} />
        <Field label="Tenure (years)" value={years} onChange={setYears} />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Monthly EMI" value={`₹ ${money(emi)}`} highlight />
        <Result label="Total interest" value={`₹ ${money(total - p)}`} />
        <Result label="Total repayment" value={`₹ ${money(total)}`} />
      </div>
    </div>
  );
}

function Gst() {
  const [amount, setAmount] = useState('100000'), [rate, setRate] = useState('18'), [mode, setMode] = useState('exclusive');
  const base = num(amount), gst = mode === 'exclusive' ? base * num(rate) / 100 : base * num(rate) / (100 + num(rate));
  const total = mode === 'exclusive' ? base + gst : base;
  const preGst = mode === 'exclusive' ? base : base - gst;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label={mode === 'exclusive' ? 'Pre-GST amount (₹)' : 'GST-inclusive amount (₹)'} value={amount} onChange={setAmount} />
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">GST rate</span>
          <select value={rate} onChange={e => setRate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
            <option value="0">0% (Nil / Exempt)</option><option value="5">5% (Merit Rate)</option><option value="18">18% (Standard Rate)</option><option value="40">40% (Luxury Rate)</option><option value="3">3% (Special Rate)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Calculation mode</span>
          <select value={mode} onChange={e => setMode(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
            <option value="exclusive">Add GST to price</option><option value="inclusive">Extract GST from inclusive price</option>
          </select>
        </label>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Pre-GST value" value={`₹ ${money(preGst)}`} highlight />
        <Result label="GST amount" value={`₹ ${money(gst)}`} highlight />
        <Result label="Final price" value={`₹ ${money(total)}`} />
      </div>
    </div>
  );
}

function JsonFormatter() {
  const [input, setInput] = useState('{"name":"OrbitBoard","tools":["JSON","JWT"]}'); const [mode, setMode] = useState('format');
  let output = '', error = '';
  try { const parsed = JSON.parse(input); output = mode === 'minify' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2); } catch (e) { error = e.message; }

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base text-stone-900 dark:text-stone-100 min-h-[44px]" />
      <div className="flex gap-2">
        <button onClick={() => setMode('format')} className="rounded-xl bg-accent-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">Format</button>
        <button onClick={() => setMode('minify')} className="rounded-xl border border-[var(--orbit-border)] px-4 py-2.5 text-sm font-semibold min-h-[44px]">Minify</button>
      </div>
      {error ? <p className="text-sm text-red-400">Invalid JSON: {error}</p> : (
        <div className="overflow-x-auto no-scrollbar">
          <textarea readOnly value={output} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base text-stone-900 dark:text-stone-100" />
          <ExportActions content={output} filename="orbitboard-json.txt" />
        </div>
      )}
    </div>
  );
}

function JsonToCsv() {
  const [input, setInput] = useState('[{"name":"John Doe","role":"Developer"},{"name":"Mitra","role":"Assistant"}]'); let csv = '', error = '';
  try { const rows = JSON.parse(input); if (!Array.isArray(rows)) throw new Error('JSON must be an array of objects'); const keys = [...new Set(rows.flatMap(r => Object.keys(r)))]; const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; csv = [keys.map(esc).join(','), ...rows.map(r => keys.map(k => esc(typeof r[k] === 'object' ? JSON.stringify(r[k]) : r[k])).join(','))].join('\n'); } catch (e) { error = e.message; }

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      {error ? <p className="text-sm text-red-400">{error}</p> : (
        <div className="overflow-x-auto no-scrollbar space-y-3">
          <textarea readOnly value={csv} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={csv} filename="orbitboard-data.csv" />
        </div>
      )}
    </div>
  );
}

function Base64Tool() {
  const [input, setInput] = useState('Hello OrbitBoard'); const [mode, setMode] = useState('encode'); let output = '', error = '';
  try { output = mode === 'encode' ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input))); } catch { error = 'Invalid Base64 input'; }

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-40 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <div className="flex gap-2">
        <button onClick={() => setMode('encode')} className="rounded-xl bg-accent-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">Encode</button>
        <button onClick={() => setMode('decode')} className="rounded-xl border border-[var(--orbit-border)] px-4 py-2.5 text-sm font-semibold min-h-[44px]">Decode</button>
      </div>
      <textarea readOnly value={error || output} className="w-full h-40 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
      <ExportActions content={error || output} filename="orbitboard-base64.txt" />
    </div>
  );
}

function JwtDecoder() {
  const [token, setToken] = useState(''); let header = '', payload = '', error = '';
  try { if (token.trim()) { const p = token.split('.'); if (p.length !== 3) throw new Error('A JWT must contain three parts'); const dec = s => { const normalized = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='); return JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(normalized)))), null, 2); }; header = dec(p[0]); payload = dec(p[1]); } } catch (e) { error = 'Invalid JWT: ' + e.message; }

  return (
    <div className="space-y-4">
      <textarea value={token} onChange={e => setToken(e.target.value)} placeholder="Paste JWT here" className="w-full h-32 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        <textarea readOnly value={header} placeholder="Header" className="w-full h-52 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
        <textarea readOnly value={payload} placeholder="Payload" className="w-full h-52 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
      </div>
    </div>
  );
}

function UnixTimestamp() {
  const [ts, setTs] = useState(() => String(Math.floor(Date.now() / 1000))); const [date, setDate] = useState('');
  const parsed = Number(ts); const dateValue = new Date(parsed * 1000); const readable = Number.isFinite(parsed) && !Number.isNaN(dateValue.getTime()) ? dateValue.toISOString() : 'Invalid timestamp'; const fromDate = date ? Math.floor(new Date(date).getTime() / 1000) : '';

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Unix timestamp (seconds)" value={ts} onChange={setTs} />
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Date/time to convert</span>
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
        </label>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="UTC Date" value={readable} highlight />
        {date && <Result label="Calculated Timestamp" value={String(fromDate)} />}
      </div>
    </div>
  );
}

function UuidGenerator() {
  const [count, setCount] = useState('5'); const [ids, setIds] = useState(() => Array.from({ length: 5 }, () => crypto.randomUUID()));
  return (
    <div className="space-y-4">
      <Field label="Number of UUIDs" value={count} onChange={setCount} />
      <button onClick={() => setIds(Array.from({ length: Math.min(50, Math.max(1, Math.floor(num(count)))) }, () => crypto.randomUUID()))} className="rounded-xl bg-accent-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">
        Generate UUIDs
      </button>
      <textarea readOnly value={ids.join('\n')} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
      <ExportActions content={ids.join('\n')} filename="orbitboard-uuids.txt" />
    </div>
  );
}

function UrlEncoder() {
  const [input, setInput] = useState('https://orbitboard.in/tools?name=John%20Doe'); const [mode, setMode] = useState('encode'); let output;
  try { output = mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input); } catch { output = 'Invalid encoded URL component'; }

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-40 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <div className="flex gap-2">
        <button onClick={() => setMode('encode')} className="rounded-xl bg-accent-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">Encode</button>
        <button onClick={() => setMode('decode')} className="rounded-xl border border-[var(--orbit-border)] px-4 py-2.5 text-sm font-semibold min-h-[44px]">Decode</button>
      </div>
      <textarea readOnly value={output} className="w-full h-40 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
    </div>
  );
}

function Sip() {
  const [monthly, setMonthly] = useState('10000'), [rate, setRate] = useState('12'), [years, setYears] = useState('10');
  const p = num(monthly), r = num(rate) / 1200, n = num(years) * 12;
  const maturity = r > 0 ? p * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : p * n;
  const invested = p * n, returns = Math.max(0, maturity - invested);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Monthly SIP (₹)" value={monthly} onChange={setMonthly} />
        <Field label="Expected annual return (%)" value={rate} onChange={setRate} />
        <Field label="Investment period (years)" value={years} onChange={setYears} />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Estimated maturity value" value={`₹ ${money(maturity)}`} highlight />
        <Result label="Total amount invested" value={`₹ ${money(invested)}`} />
        <Result label="Estimated returns" value={`₹ ${money(returns)}`} />
      </div>
    </div>
  );
}

function ImageResizer() {
  const [file, setFile] = useState(null), [width, setWidth] = useState('1200'), [height, setHeight] = useState(''), [quality] = useState('0.9'), [format] = useState('image/jpeg'), [preview, setPreview] = useState(''), [status, setStatus] = useState('');
  const resize = async () => {
    if (!file) { setStatus('Choose an image first.'); return; }
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const targetWidth = Math.max(1, Math.round(Number(width) || image.naturalWidth));
      const targetHeight = height ? Math.max(1, Math.round(Number(height))) : Math.max(1, Math.round(image.naturalHeight * targetWidth / image.naturalWidth));
      const canvas = document.createElement('canvas'); canvas.width = targetWidth; canvas.height = targetHeight;
      const ctx = canvas.getContext('2d'); if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, targetWidth, targetHeight); } ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
      const data = canvas.toDataURL(format, Number(quality)); setPreview(data);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, format, Number(quality)));
      const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
      downloadBlob(blob, 'orbitboard-image-resizer.' + ext, 'image-resizer');
      setStatus('Done — resized image downloaded.');
    } catch { setStatus('Could not resize this image.'); } finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Upload Image"
        accept="image/*"
        file={file}
        onFileSelect={f => { setFile(f); setStatus(''); }}
        onClear={() => { setFile(null); setStatus(''); }}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Width (px)" value={width} onChange={setWidth} />
        <Field label="Height (px, optional)" value={height} onChange={setHeight} placeholder="Auto from aspect ratio" />
      </div>
      <button onClick={resize} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Resize & Download</button>
      {preview && <img src={preview} alt="Resized preview" className="max-h-72 max-w-full rounded-2xl border border-[var(--orbit-border)] object-contain" />}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function SvgToPng() {
  const [input, setInput] = useState('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#111827"/><text x="400" y="235" text-anchor="middle" font-family="Arial" font-size="42" fill="white">OrbitBoard</text></svg>');
  const [scale, setScale] = useState('1'), [preview, setPreview] = useState(''), [status, setStatus] = useState('');
  const convert = async () => {
    try {
      const blob = new Blob([input], { type: 'image/svg+xml' }), url = URL.createObjectURL(blob);
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * Number(scale))); canvas.height = Math.max(1, Math.round(image.naturalHeight * Number(scale)));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/png'); setPreview(data);
      const out = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); downloadBlob(out, 'orbitboard-svg-to-png.png', 'svg-to-png'); setStatus('Done — PNG downloaded.'); URL.revokeObjectURL(url);
    } catch { setStatus('Invalid SVG or conversion failed.'); }
  };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-48 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <Field label="Scale" value={scale} onChange={setScale} />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to PNG</button>
      {preview && <img src={preview} alt="Converted PNG" className="max-h-72 max-w-full rounded-2xl border border-[var(--orbit-border)] object-contain" />}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function CsvToPdf() {
  const [input, setInput] = useState('Name,Role,Status\nJohn Doe,Developer,Active\nMitra,Assistant,Active'), [status, setStatus] = useState('');
  const parseCsv = text => text.split(/\r?\n/).filter(Boolean).map(line => {
    const out = []; let cell = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { quoted = !quoted; continue; }
      if (ch === ',' && !quoted) { out.push(cell); cell = ''; } else cell += ch;
    }
    out.push(cell); return out;
  });

  const convert = () => {
    try {
      const rows = parseCsv(input); const lines = rows.map(r => r.map(v => v.trim()).join(' | '));
      downloadBlob(createTextPdf(lines), 'orbitboard-csv-to-pdf.pdf', 'csv-to-pdf'); setStatus('Done — CSV data exported to PDF.');
    } catch { setStatus('Could not convert CSV.'); }
  };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-52 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert CSV to PDF</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function XlsxToPdf() {
  const [file, setFile] = useState(null), [status, setStatus] = useState('');
  const convert = async () => {
    if (!file) { setStatus('Choose an XLSX file first.'); return; }
    setStatus('Reading workbook...');
    try {
      const bytes = await file.arrayBuffer();
      const lines = ['XLSX Export', 'File: ' + file.name];
      if (bytes.byteLength === 0) throw new Error('File is empty');
      downloadBlob(createTextPdf(lines), 'orbitboard-xlsx-to-pdf.pdf', 'xlsx-to-pdf'); setStatus('Done — PDF generated.');
    } catch (e) { setStatus(e.message || 'Could not convert XLSX.'); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Excel Spreadsheet (.xlsx, .xls)"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        file={file}
        onFileSelect={f => { setFile(f); setStatus(''); }}
        onClear={() => { setFile(null); setStatus(''); }}
      />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert XLSX to PDF</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function createPdfFromJpeg(jpegBytes, width, height) {
  const encoder = new TextEncoder();
  const header = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 255, 255, 255, 255, 10]);
  const parts = [header]; const offsets = [0]; let position = header.length;
  const add = (bytes) => { offsets.push(position); parts.push(bytes); position += bytes.length; };
  const text = s => encoder.encode(s);
  add(text('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n'));
  add(text('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n'));
  add(text('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + width + ' ' + height + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >> endobj\n'));
  add(text('4 0 obj << /Type /XObject /Subtype /Image /Width ' + width + ' /Height ' + height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpegBytes.length + ' >> stream\n'));
  parts.push(jpegBytes); position += jpegBytes.length; parts.push(text('\nendstream\nendobj\n')); position += text('\nendstream\nendobj\n').length;
  const stream = text('q\n' + width + ' 0 0 ' + height + ' 0 0 cm\n/Im0 Do\nQ\n');
  add(text('5 0 obj << /Length ' + stream.length + ' >> stream\n')); parts.push(stream); position += stream.length; parts.push(text('endstream\nendobj\n')); position += text('endstream\nendobj\n').length;
  const xrefStart = position;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  xref += 'trailer << /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF';
  parts.push(text(xref));
  return new Blob(parts, { type: 'application/pdf' });
}

function ImageToPdf() {
  const [file, setFile] = useState(null), [preview, setPreview] = useState(''), [status, setStatus] = useState('');
  const convert = async () => {
    if (!file) { setStatus('Choose an image first.'); return; }
    setStatus('Generating PDF...');
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0);
      setPreview(canvas.toDataURL('image/jpeg', 0.92));
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const pdf = createPdfFromJpeg(bytes, image.naturalWidth, image.naturalHeight);
      downloadBlob(pdf, 'orbitboard-image-to-pdf.pdf', 'image-to-pdf');
      setStatus('Done — your PDF is ready.');
    } catch { setStatus('Could not generate PDF.'); }
    finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select Image"
        accept="image/jpeg,image/png,image/webp"
        file={file}
        onFileSelect={f => { setFile(f); setStatus(''); }}
        onClear={() => { setFile(null); setStatus(''); }}
      />
      {preview && <img src={preview} alt="PDF preview" className="max-h-72 max-w-full rounded-2xl border border-[var(--orbit-border)] object-contain" />}
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to PDF</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function DiffChecker() {
  const [left, setLeft] = useState(''), [right, setRight] = useState(''), [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const leftLines = left.split(/\r?\n/), rightLines = right.split(/\r?\n/);
  const max = Math.max(leftLines.length, rightLines.length);
  const normalize = s => ignoreWhitespace ? s.replace(/\s+/g, ' ').trim() : s;
  const rows = Array.from({ length: max }, (_, i) => ({ n: i + 1, left: leftLines[i] ?? '', right: rightLines[i] ?? '', same: normalize(leftLines[i] ?? '') === normalize(rightLines[i] ?? '') }));
  const changed = rows.filter(r => !r.same).length;

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-4">
        <label className="block"><span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Original Text</span>
          <textarea value={left} onChange={e => setLeft(e.target.value)} placeholder="Paste original text…" className="mt-1.5 w-full h-72 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
        </label>
        <label className="block"><span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Modified Text</span>
          <textarea value={right} onChange={e => setRight(e.target.value)} placeholder="Paste modified text…" className="mt-1.5 w-full h-72 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer min-h-[44px]">
          <input type="checkbox" checked={ignoreWhitespace} onChange={e => setIgnoreWhitespace(e.target.checked)} className="w-4 h-4 rounded text-accent-600" /> Ignore whitespace
        </label>
        <Result label="Changed lines" value={String(changed)} highlight />
      </div>

      <div className="overflow-x-auto no-scrollbar rounded-2xl border border-[var(--orbit-border)]">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead className="bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-b border-[var(--orbit-border)]">
            <tr><th className="p-3 w-16">Line</th><th className="p-3">Original</th><th className="p-3">Modified</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.n} className={r.same ? 'border-t border-[var(--orbit-border)]/50' : 'border-t border-accent-400/30 bg-accent-50/50 dark:bg-accent-950/30'}>
                <td className="p-3 text-stone-400 font-mono">{r.n}</td>
                <td className="p-3 font-mono whitespace-pre-wrap break-all text-stone-800 dark:text-stone-200">{r.left}</td>
                <td className="p-3 font-mono whitespace-pre-wrap break-all text-stone-800 dark:text-stone-200">{r.right}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImageMetadataRemover() {
  const [file, setFile] = useState(null), [format] = useState('image/jpeg'), [status, setStatus] = useState('');
  const clean = async () => {
    if (!file) { setStatus('Choose an image first.'); return; }
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(image, 0, 0); const blob = await new Promise(resolve => canvas.toBlob(resolve, format, 0.95));
      const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
      downloadBlob(blob, 'orbitboard-image-metadata-remover.' + ext, 'image-metadata-remover'); setStatus('Done — re-encoded image downloaded.');
    } catch { setStatus('Could not process this image.') } finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select Image"
        accept="image/*"
        file={file}
        onFileSelect={f => { setFile(f); setStatus('') }}
        onClear={() => { setFile(null); setStatus('') }}
      />
      <button onClick={clean} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Remove Metadata & Download</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function ImageCompressor() {
  const [file, setFile] = useState(null), [quality] = useState('0.72'), [format] = useState('image/jpeg'), [status, setStatus] = useState(''), [before, setBefore] = useState(0), [after, setAfter] = useState(0);
  const compress = async () => {
    if (!file) { setStatus('Choose an image first.'); return; }
    setBefore(file.size);
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } ctx.drawImage(image, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, format, Number(quality))); setAfter(blob.size);
      const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
      downloadBlob(blob, 'orbitboard-image-compressor.' + ext, 'image-compressor'); setStatus('Done — compressed image downloaded.');
    } catch { setStatus('Could not compress this image.'); } finally { URL.revokeObjectURL(url); }
  };
  const saved = before && after ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <FileUploadWithDrive
          label="Select Image to Compress"
          accept="image/*"
          file={file}
          onFileSelect={f => { setFile(f); setStatus('') }}
          onClear={() => { setFile(null); setStatus('') }}
        />
        <button onClick={compress} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold hover:bg-accent-500 min-h-[44px]">Compress & Download</button>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        {after > 0 && (
          <div className="space-y-3">
            <Result label="Original Size" value={(before / 1024).toFixed(1) + ' KB'} />
            <Result label="Compressed Size" value={(after / 1024).toFixed(1) + ' KB'} />
            <Result label="Saved" value={saved + '%'} highlight />
          </div>
        )}
        {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
      </div>
    </div>
  );
}

function SpreadsheetFileTool({ type }) {
  const [file, setFile] = useState(null), [text, setText] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const isJson = type === 'json-to-xlsx', isCsv = type === 'csv-to-xlsx';

  const convert = async () => {
    if (!file && !text.trim()) { setStatus(isJson ? 'Paste a JSON array first.' : 'Paste CSV or choose a file first.'); return; }
    setBusy(true); setStatus('Converting locally…');
    try {
      if (type === 'xlsx-to-csv') {
        const csv = await xlsxToCsv(file); setText(csv); setStatus('CSV generated locally.'); return;
      }
      const input = isCsv && file ? await file.text() : text;
      const bytes = isJson ? jsonToXlsx(text) : csvToXlsx(input);
      const finalSlug = isCsv ? 'csv-to-excel' : 'json-to-excel';
      const filename = `orbitboard-${finalSlug}.xlsx`;
      downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename, finalSlug);
      setStatus('Done — XLSX downloaded.');
    } catch (e) { setStatus(e.message || 'Could not convert this spreadsheet.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {type === 'xlsx-to-csv' ? (
        <FileUploadWithDrive
          label="Excel Spreadsheet (.xlsx, .xls)"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          file={file}
          onFileSelect={f => { setFile(f); setText(''); setStatus('') }}
          onClear={() => { setFile(null); setText(''); setStatus('') }}
        />
      ) : (
        <>
          {isCsv && (
            <FileUploadWithDrive
              label="CSV File"
              accept=".csv,text/csv"
              file={file}
              onFileSelect={f => { setFile(f); setText(''); setStatus('') }}
              onClear={() => { setFile(null); setText(''); setStatus('') }}
            />
          )}
          <textarea value={text} onChange={e => { setText(e.target.value); if (isCsv) setFile(null) }} placeholder={isJson ? 'Paste a JSON array of objects…' : 'Paste CSV data or choose a file…'} className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
        </>
      )}
      <button disabled={busy} onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">
        {busy ? 'Converting…' : type === 'xlsx-to-csv' ? 'Convert to CSV' : 'Convert to XLSX'}
      </button>
      {type === 'xlsx-to-csv' && text && (
        <div className="overflow-x-auto no-scrollbar">
          <textarea readOnly value={text} className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={text} filename="orbitboard-data.csv" />
        </div>
      )}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function CsvToJson() {
  const [input, setInput] = useState('name,role\nJohn Doe,Customer Success\nAlex Smith,Developer'), [output, setOutput] = useState(''), [error, setError] = useState('');
  const convert = () => { try { const rows = input.trim().split(/\r?\n/).filter(Boolean).map(row => row.split(',').map(v => v.trim())); if (rows.length < 2) throw new Error('Add a header row and data rows.'); const headers = rows[0]; setOutput(JSON.stringify(rows.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))), null, 2)); setError(''); } catch (e) { setError(e.message); setOutput(''); } };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-52 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to JSON</button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {output && (
        <div className="overflow-x-auto no-scrollbar space-y-3">
          <textarea readOnly value={output} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={output} filename="orbitboard-data.json" />
        </div>
      )}
    </div>
  );
}

function TextToPdf() {
  const [file, setFile] = useState(null), [text, setText] = useState(''), [status, setStatus] = useState('');
  const convert = async () => {
    if (!file && !text) { setStatus('Choose a text file or paste text first.'); return; }
    try {
      const bytes = await createTextPdf(text);
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'orbitboard-text-to-pdf.pdf', 'text-to-pdf');
      setStatus('Done — PDF downloaded.');
    } catch {
      setStatus('Could not create the PDF.');
    }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select Text File (.txt)"
        accept=".txt,text/plain"
        file={file}
        onFileSelect={async f => {
          if (f) {
            setFile(f);
            setText(await f.text());
            setStatus('');
          }
        }}
        onClear={() => { setFile(null); setText(''); }}
      />
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Or paste text here…" className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to PDF</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function PdfToText() {
  const [file, setFile] = useState(null), [text, setText] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const extract = async () => { if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true); try { const value = await extractPdfText(file); setText(value); setStatus('Text extracted locally.'); } catch { setStatus('Could not extract text.'); } finally { setBusy(false); } };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF File"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setText(''); setStatus('') }}
        onClear={() => { setFile(null); setText(''); setStatus('') }}
      />
      <button disabled={busy} onClick={extract} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Extracting…' : 'Extract Text'}</button>
      <textarea readOnly value={text} placeholder="Extracted text will appear here…" className="w-full h-72 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
      {text && <ExportActions content={text} filename="orbitboard-extracted.txt" />}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function JsonToXml() {
  const [input, setInput] = useState('{"name":"John Doe","role":"Developer"}'), [output, setOutput] = useState(''), [error, setError] = useState('');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const build = (value, key = 'root', depth = 0) => { const pad = '  '.repeat(depth); if (Array.isArray(value)) return value.map(v => build(v, key, depth)).join('\n'); if (value && typeof value === 'object') return `<${key}>\n${Object.entries(value).map(([k, v]) => build(v, k, depth + 1)).join('\n')}\n${pad}</${key}>`; return `<${key}>${esc(value ?? '')}</${key}>`; };
  const convert = () => { try { setOutput('<?xml version="1.0" encoding="UTF-8"?>\n' + build(JSON.parse(input))); setError(''); } catch (e) { setError('Invalid JSON: ' + e.message); setOutput(''); } };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-48 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to XML</button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {output && (
        <div className="overflow-x-auto no-scrollbar space-y-3">
          <textarea readOnly value={output} className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={output} filename="orbitboard.xml" />
        </div>
      )}
    </div>
  );
}

function XmlToJson() {
  const [input, setInput] = useState('<root><name>John Doe</name><role>Developer</role></root>'), [output, setOutput] = useState(''), [error, setError] = useState('');
  const parseNode = node => { if (!node.children.length) return node.textContent ?? ''; const obj = {}; Array.from(node.children).forEach(child => { const value = parseNode(child); obj[child.tagName] === undefined ? obj[child.tagName] = value : obj[child.tagName] = [].concat(obj[child.tagName], value); }); return obj; };
  const convert = () => { try { const doc = new DOMParser().parseFromString(input, 'application/xml'); if (doc.querySelector('parsererror')) throw new Error('Invalid XML'); setOutput(JSON.stringify({ [doc.documentElement.tagName]: parseNode(doc.documentElement) }, null, 2)); setError(''); } catch (e) { setError(e.message); setOutput(''); } };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-48 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to JSON</button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {output && (
        <div className="overflow-x-auto no-scrollbar space-y-3">
          <textarea readOnly value={output} className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={output} filename="orbitboard.json" />
        </div>
      )}
    </div>
  );
}

function MarkdownToHtml() {
  const [input, setInput] = useState('# Hello OrbitBoard\n\nThis is **bold** and *italic*.'), [output, setOutput] = useState('');
  const inline = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>');
  const convert = () => {
    const lines = input.split(/\r?\n/), html = []; let list = false;
    for (const line of lines) {
      if (line.startsWith('- ')) { if (!list) { html.push('<ul>'); list = true; } html.push('<li>' + inline(line.slice(2)) + '</li>'); continue; }
      if (list) { html.push('</ul>'); list = false; }
      if (line.startsWith('# ')) html.push('<h1>' + inline(line.slice(2)) + '</h1>');
      else if (line.startsWith('## ')) html.push('<h2>' + inline(line.slice(3)) + '</h2>');
      else if (line.trim()) html.push('<p>' + inline(line) + '</p>');
    }
    if (list) html.push('</ul>'); setOutput(html.join('\n'));
  };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to HTML</button>
      {output && (
        <div className="overflow-x-auto no-scrollbar space-y-3">
          <textarea readOnly value={output} className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={output} filename="orbitboard.html" />
        </div>
      )}
    </div>
  );
}

function PdfMerge() {
  const [files, setFiles] = useState([]), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const merge = async () => {
    if (files.length < 2) { setStatus('Choose at least two PDFs.'); return; } setBusy(true); setStatus('Merging PDFs locally…');
    try {
      const bytes = await mergePdfFiles(files);
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'orbitboard-pdf-merge.pdf', 'pdf-merge');
      setStatus('Done — merged PDF downloaded.');
    } catch {
      setStatus('Could not merge these PDFs.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Add PDF files to merge"
        accept="application/pdf"
        onFileSelect={f => {
          if (f) {
            setFiles(prev => [...prev, f]);
            setStatus('');
          }
        }}
        onClear={() => setFiles([])}
      />
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
            <span>{files.length} PDF files queued</span>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-red-500 hover:text-red-600 dark:text-red-400"
            >
              Clear all
            </button>
          </div>
          <ol className="space-y-1.5">
            {files.map((f, i) => (
              <li key={f.name + i} className="flex items-center justify-between rounded-xl bg-stone-50 dark:bg-stone-800 px-4 py-2.5 text-sm text-stone-800 dark:text-stone-200">
                <span className="truncate">{i + 1}. {f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                  className="text-stone-400 hover:text-red-500 ml-2"
                  title="Remove file"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <button disabled={busy || files.length < 2} onClick={merge} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Merging…' : 'Merge PDFs'}</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function PdfExtract() {
  const [file, setFile] = useState(null), [pages, setPages] = useState(''), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const extract = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true);
    try {
      const src = await loadPdf(file); const max = src.getPageCount();
      const indexes = pages.split(',').flatMap(part => { const [a, b] = part.trim().split('-').map(Number); if (Number.isFinite(a) && Number.isFinite(b)) { const s = Math.min(a, b), e = Math.max(a, b); return Array.from({ length: e - s + 1 }, (_, i) => s + i - 1); } if (Number.isFinite(a)) return [a - 1]; return []; }).filter(i => i >= 0 && i < max);
      if (!indexes.length) { setStatus('Enter page numbers such as 1,3,5-7.'); return; }
      const bytes = await extractPdfPages(file, indexes.map(i => i + 1));
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'orbitboard-pdf-extract.pdf', 'pdf-extract');
      setStatus('Done — extracted PDF downloaded.');
    } catch { setStatus('Could not extract pages.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF File"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setStatus('') }}
        onClear={() => { setFile(null); setStatus('') }}
      />
      <Field label="Pages to extract" value={pages} onChange={setPages} type="text" placeholder="Example: 1,3,5-7" />
      <button disabled={busy} onClick={extract} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Extracting…' : 'Extract Pages'}</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function PdfSplit() {
  const [file, setFile] = useState(null), [status, setStatus] = useState('');
  const split = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; }
    try {
      const bytesList = await splitPdfPages(file);
      bytesList.forEach((bytes, i) => downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `orbitboard-pdf-split-page-${i + 1}.pdf`, 'pdf-split'));
      setStatus('Done — individual pages downloaded.');
    } catch { setStatus('Could not split this PDF.'); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF File"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setStatus('') }}
        onClear={() => { setFile(null); setStatus('') }}
      />
      <button onClick={split} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Split into Pages</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function PdfToImages({ format = 'image/png' }) {
  const [file, setFile] = useState(null), [pages, setPages] = useState([]), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const load = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true); setStatus('Rendering pages…');
    try { const rendered = await renderPdfPages(file, { scale: 1.25, format, quality: 0.92 }); setPages(rendered); setStatus(rendered.length + ' page(s) rendered.'); } catch { setStatus('Could not render PDF.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF File"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setPages([]); setStatus('') }}
        onClear={() => { setFile(null); setPages([]); setStatus('') }}
      />
      <button disabled={busy} onClick={load} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Rendering…' : 'Render PDF Pages'}</button>
      {pages.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map(p => <div key={p.number} className="rounded-2xl border border-[var(--orbit-border)] p-3"><img src={p.data} alt={'Page ' + p.number} className="w-full rounded-lg bg-white" /><p className="mt-2 text-xs text-stone-600 dark:text-stone-400">Page {p.number}</p></div>)}
        </div>
      )}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function PdfCompressor() {
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [stats, setStats] = useState(null);
  const compress = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true); setStatus('Optimizing PDF structure…');
    try {
      const bytes = await optimizePdf(file);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, 'orbitboard-pdf-compressor.pdf', 'pdf-compressor');
      setStats({ before: file.size, after: blob.size });
      setStatus('Done — optimized PDF downloaded.');
    } catch { setStatus('Could not optimize this PDF.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF to Compress"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setStats(null); setStatus('') }}
        onClear={() => { setFile(null); setStats(null); setStatus('') }}
      />
      <button disabled={busy} onClick={compress} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Optimizing…' : 'Optimize & Download'}</button>
      {stats && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Result label="Original Size" value={(stats.before / 1024).toFixed(1) + ' KB'} />
          <Result label="Optimized Size" value={(stats.after / 1024).toFixed(1) + ' KB'} highlight />
        </div>
      )}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function PdfWorkspace() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [originalPages, setOriginalPages] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState('');

  const loadAndRenderPdf = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setPages([]);
    setOriginalPages([]);
    setSelectedIds(new Set());
    setBusy(true);
    setStatus('Loading and rendering PDF pages…');
    setProgress('');

    try {
      const rendered = await renderPdfPages(selectedFile, {
        scale: 0.65,
        format: 'image/jpeg',
        quality: 0.8,
        onProgress: (current, total) => {
          setProgress(`Rendering page ${current} of ${total}…`);
        }
      });
      const mapped = rendered.map((p, index) => ({
        id: `page-${p.number}-${index}`,
        number: p.number,
        rotation: 0,
        data: p.data
      }));
      setPages(mapped);
      setOriginalPages(mapped);
      setStatus(`${mapped.length} page${mapped.length > 1 ? 's' : ''} loaded. You can now reorder, rotate, delete, and export.`);
      setProgress('');
    } catch (err) {
      console.error(err);
      setStatus('Could not read or render PDF file. Please ensure it is a valid PDF.');
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPages([]);
    setOriginalPages([]);
    setSelectedIds(new Set());
    setStatus('');
    setProgress('');
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map(p => p.id)));
    }
  };

  const rotatePage = (id, delta) => {
    setPages(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, rotation: (p.rotation + delta + 360) % 360 };
    }));
  };

  const rotateAll = (delta = 90) => {
    setPages(prev => prev.map(p => ({
      ...p,
      rotation: (p.rotation + delta + 360) % 360
    })));
  };

  const movePage = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    setPages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const deletePage = (id) => {
    setPages(prev => prev.filter(p => p.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    setPages(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setStatus('Selected pages deleted.');
  };

  const resetPages = () => {
    setPages(originalPages.map(p => ({ ...p, rotation: 0 })));
    setSelectedIds(new Set());
    setStatus('Reset to original PDF page order.');
  };

  const exportPdf = async (onlySelected = false) => {
    const pagesToExport = onlySelected
      ? pages.filter(p => selectedIds.has(p.id))
      : pages;

    if (pagesToExport.length === 0) {
      setStatus('At least 1 page must be present to export.');
      return;
    }

    setBusy(true);
    setStatus('Generating your edited PDF…');
    try {
      const bytes = await createEditedPdf(file, pagesToExport);
      const filename = onlySelected
        ? `orbitboard-extracted-${pagesToExport.length}-pages.pdf`
        : 'orbitboard-edited-workspace.pdf';
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename, 'pdf-workspace');
      setStatus(`Successfully exported ${pagesToExport.length} page${pagesToExport.length > 1 ? 's' : ''}. Download started.`);
    } catch (err) {
      console.error(err);
      setStatus('Could not export PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <FileUploadWithDrive
        label="Select PDF File to Edit"
        accept="application/pdf"
        file={file}
        onFileSelect={loadAndRenderPdf}
        onClear={handleClear}
      />

      {busy && progress && (
        <div className="rounded-2xl border border-accent-200 dark:border-accent-800 bg-accent-50/60 dark:bg-accent-950/40 p-4 text-center">
          <p className="text-sm font-semibold text-accent-700 dark:text-accent-300 animate-pulse">{progress}</p>
        </div>
      )}

      {pages.length > 0 && (
        <div className="space-y-4">
          {/* Global Workspace Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900/60 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200">
                {pages.length} Pages {selectedIds.size > 0 && <span className="text-accent-600 dark:text-accent-400">({selectedIds.size} selected)</span>}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 transition"
              >
                {selectedIds.size === pages.length ? <CheckSquare size={14} className="text-accent-600" /> : <Square size={14} />}
                <span>{selectedIds.size === pages.length ? 'Deselect All' : 'Select All'}</span>
              </button>

              <button
                type="button"
                onClick={() => rotateAll(90)}
                title="Rotate all pages 90° clockwise"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 transition"
              >
                <RotateCw size={14} />
                <span>Rotate All 90°</span>
              </button>

              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
                >
                  <Trash2 size={14} />
                  <span>Delete Selected ({selectedIds.size})</span>
                </button>
              )}

              <button
                type="button"
                onClick={resetPages}
                title="Reset to original PDF page order"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750 transition"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>

              {selectedIds.size > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => exportPdf(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>Export Selected ({selectedIds.size})</span>
                </button>
              )}

              <button
                type="button"
                disabled={busy || pages.length === 0}
                onClick={() => exportPdf(false)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                <Download size={14} />
                <span>Save & Download PDF</span>
              </button>
            </div>
          </div>

          {/* Interactive Page Thumbnails Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {pages.map((p, idx) => {
              const isSelected = selectedIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-2.5 sm:p-3 transition-all duration-200 bg-white dark:bg-stone-900 shadow-2xs ${
                    isSelected
                      ? 'border-accent-500 ring-2 ring-accent-400/40 bg-accent-50/20 dark:bg-accent-950/20'
                      : 'border-[var(--orbit-border)] hover:border-accent-300 dark:hover:border-accent-600'
                  }`}
                >
                  {/* Top Bar: Selection Checkbox, Page Label & Delete Button */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <button
                      type="button"
                      onClick={() => toggleSelect(p.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300"
                    >
                      <span className={`flex items-center justify-center h-5 w-5 rounded-md border transition ${
                        isSelected
                          ? 'border-accent-600 bg-accent-600 text-white'
                          : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800'
                      }`}>
                        {isSelected ? '✓' : ''}
                      </span>
                      <span>Page {idx + 1}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deletePage(p.id)}
                      title={`Delete page ${idx + 1}`}
                      className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Thumbnail Image with Rotation */}
                  <div
                    onClick={() => toggleSelect(p.id)}
                    className="cursor-pointer aspect-[1/1.35] w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-850 flex items-center justify-center p-2 relative"
                  >
                    <img
                      src={p.data}
                      alt={`Page ${idx + 1}`}
                      style={{
                        transform: `rotate(${p.rotation}deg)`,
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      className="max-h-full max-w-full object-contain rounded shadow-xs pointer-events-none select-none"
                    />
                    {p.rotation !== 0 && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-stone-900/80 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                        {p.rotation}°
                      </span>
                    )}
                  </div>

                  {/* Bottom Actions Bar: Move Left, Rotate CCW, Rotate CW, Move Right */}
                  <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-[var(--orbit-border)]">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => movePage(idx, -1)}
                      title="Move page left"
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-25 transition"
                    >
                      <ArrowLeft size={13} />
                    </button>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => rotatePage(p.id, -90)}
                        title="Rotate -90°"
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => rotatePage(p.id, 90)}
                        title="Rotate +90°"
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                      >
                        <RotateCw size={13} />
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={idx === pages.length - 1}
                      onClick={() => movePage(idx, 1)}
                      title="Move page right"
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-25 transition"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {status && (
        <div className="p-3.5 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900">
          <p aria-live="polite" className="text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300">
            {status}
          </p>
        </div>
      )}
    </div>
  );
}

function PdfReorder() {
  const [file, setFile] = useState(null), [order, setOrder] = useState(''), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const reorder = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true);
    try {
      const src = await loadPdf(file);
      const nums = order.split(',').map(v => Number(v.trim())).filter(Number.isInteger);
      if (nums.length !== src.getPageCount()) { setStatus('Enter every page number.'); return; }
      const bytes = await reorderPdfPages(file, nums);
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'orbitboard-pdf-workspace.pdf', 'pdf-workspace');
      setStatus('Done — reordered PDF downloaded.');
    } catch { setStatus('Could not reorder PDF.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF File"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setStatus('') }}
        onClear={() => { setFile(null); setStatus('') }}
      />
      <Field label="Page order" value={order} onChange={setOrder} type="text" placeholder="Example: 3,1,2,4" />
      <button disabled={busy} onClick={reorder} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Saving…' : 'Reorder & Download'}</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function ToolHeaderStrip({ tool, info, workspaceRef }) {
  const [shared, setShared] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  const categoryOptions = [
    { name: 'Finance', label: 'Finance & Money', icon: Coins, count: 11 },
    { name: 'Career', label: 'Career & Salary', icon: BriefcaseBusiness, count: 6 },
    { name: 'Developer', label: 'Developer Tools', icon: Code2, count: 15 },
    { name: 'Everyday', label: 'Everyday Utilities', icon: Calculator, count: 27 },
    { name: 'Business', label: 'Business & SaaS', icon: TrendingUp, count: 5 },
  ];

  useEffect(() => {
    const handleOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const [bookmarked, setBookmarked] = useState(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('orbitboard:favorites') || '[]');
      return favs.includes(tool.slug);
    } catch {
      return false;
    }
  });

  const toggleBookmark = () => {
    try {
      const favs = JSON.parse(localStorage.getItem('orbitboard:favorites') || '[]');
      const next = favs.includes(tool.slug) ? favs.filter(s => s !== tool.slug) : [tool.slug, ...favs];
      localStorage.setItem('orbitboard:favorites', JSON.stringify(next));
      setBookmarked(!bookmarked);
    } catch { void 0; }
  };

  const share = async () => {
    const data = { title: tool.name, text: 'Try ' + tool.name + ' on OrbitBoard', url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
        setTimeout(() => setShared(false), 1600);
      }
    } catch { void 0; }
  };

  const toggleFullscreen = () => {
    if (!workspaceRef?.current) return;
    if (!document.fullscreenElement) {
      workspaceRef.current.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  const reset = () => window.location.reload();

  return (
    <div className="border-b border-[var(--orbit-border)] bg-[var(--orbit-canvas)] py-6 sm:py-8 transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400">
            <Link to="/" className="hover:text-accent-600 transition">Home</Link>
            <ChevronRight size={13} />
            <Link to={`/tools?category=${tool.category}`} className="hover:text-accent-600 transition">{tool.category}</Link>
            <ChevronRight size={13} />
            <span className="text-stone-900 dark:text-stone-100 font-bold truncate max-w-[200px] sm:max-w-none">{tool.name}</span>
          </nav>

          {/* Tools Category Dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => setCategoryDropdownOpen(prev => !prev)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-accent-400 hover:text-accent-700 dark:hover:text-accent-400 transition shadow-2xs"
              aria-expanded={categoryDropdownOpen}
              aria-haspopup="true"
            >
              <span className="text-stone-400 dark:text-stone-500 font-normal">Category:</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">{tool.category}</span>
              <ChevronDown size={13} className={`transition-transform duration-200 text-stone-400 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {categoryDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-2 shadow-2xl ring-1 ring-black/5 z-40 animate-in fade-in duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-[var(--orbit-border)] mb-1">
                  Browse by Category
                </div>
                <div className="space-y-0.5">
                  {categoryOptions.map(cat => {
                    const isCurrent = cat.name === tool.category;
                    const Icon = cat.icon;
                    return (
                      <Link
                        key={cat.name}
                        to={`/tools?category=${cat.name}`}
                        onClick={() => setCategoryDropdownOpen(false)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                          isCurrent
                            ? 'bg-accent-50 dark:bg-accent-950/60 text-accent-700 dark:text-accent-300 font-bold'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon size={15} className={isCurrent ? 'text-accent-600' : 'text-stone-400'} />
                          <span>{cat.label}</span>
                        </span>
                        <span className="text-[10px] text-stone-400">{cat.count} tools</span>
                      </Link>
                    );
                  })}
                  <div className="pt-1 mt-1 border-t border-[var(--orbit-border)]">
                    <Link
                      to="/tools"
                      onClick={() => setCategoryDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-accent-700 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/40 transition"
                    >
                      <span>Browse All {LISTED_TOOLS.length} Tools</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {info?.h1 || (tool.slug === 'image-compressor' ? `${tool.name} - online compressor | size compressor | online mb reducer` : tool.name)}
            </h1>
            {/* AdSense block */}
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9160921653901381" crossorigin="anonymous"></script>
            <ins className="adsbygoogle" style={{display: 'block'}} data-ad-client="ca-pub-9160921653901381" data-ad-slot="3055679722" data-ad-format="auto" data-full-width-responsive="true"></ins>
            <script>{'(adsbygoogle = window.adsbygoogle || []).push({});'}</script>
            <p className="mt-1 text-xs sm:text-sm leading-5 text-stone-600 dark:text-stone-300 max-w-2xl">
              {info?.intro || tool.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={share}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-accent-400 transition"
            >
              <Share2 size={15} />
              <span>{shared ? 'Link copied!' : 'Share'}</span>
            </button>

            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-accent-400 transition"
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-accent-400 transition"
            >
              <Maximize2 size={15} />
              <span>Fullscreen</span>
            </button>

            <button
              onClick={toggleBookmark}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border transition text-xs font-semibold ${bookmarked ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' : 'border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:border-amber-400'}`}
            >
              <Star size={15} fill={bookmarked ? 'currentColor' : 'none'} />
              <span>{bookmarked ? 'Saved' : 'Bookmark'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ToolPage() {
  const { slug } = useParams();
  const tool = TOOLS.find(t => t.slug === slug);
  const info = TOOL_CONTENT[slug];
  const workspaceRef = useRef(null);

  const content = useMemo(() => ({
    'gif-maker': GifMaker,
    'salary-hike': SalaryHike, 'ctc-to-inhand': SalaryCalculator, 'offer-comparison': Offer, 'notice-period': Notice, 'experience': Experience, 'gratuity-calculator': GratuityCalculator, 'percentage': Percentage,
    'length-converter': () => <Converter type="length" />, 'weight-converter': () => <Converter type="weight" />, 'temperature-converter': TemperatureConverter, 'time-converter': () => <Converter type="time" />,
    'timezone-converter': GlobalTimeZoneConverter, 'jpg-to-png': () => <ImageConverter format="image/png" />, 'png-to-jpg': () => <ImageConverter format="image/jpeg" />, 'webp-to-jpg': () => <ImageConverter format="image/jpeg" />,
    'image-to-pdf': ImageToPdf, 'xlsx-to-pdf': XlsxToPdf, 'image-resizer': ImageResizer, 'svg-to-png': SvgToPng, 'csv-to-pdf': CsvToPdf, 'csv-to-json': CsvToJson, 'csv-to-xlsx': () => <SpreadsheetFileTool type="csv-to-xlsx" />,
    'json-to-xlsx': () => <SpreadsheetFileTool type="json-to-xlsx" />, 'xlsx-to-csv': () => <SpreadsheetFileTool type="xlsx-to-csv" />, 'txt-to-pdf': TextToPdf, 'pdf-to-text': PdfToText, 'diff-checker': DiffChecker,
    'json-to-xml': JsonToXml, 'xml-to-json': XmlToJson, 'markdown-to-html': MarkdownToHtml, 'image-compressor': ImageCompressor, 'image-to-gif': ImageToGif, 'video-to-gif': VideoToGif, 'image-metadata-remover': ImageMetadataRemover, 'pdf-merge': PdfMerge, 'pdf-split': PdfSplit,
    'pdf-extract-pages': PdfExtract, 'pdf-reorder': PdfReorder, 'pdf-workspace': PdfWorkspace, 'pdf-compressor': PdfCompressor, 'pdf-e-sign': PdfESign, 'pdf-to-jpg': () => <PdfToImages format="image/jpeg" />, 'pdf-to-png': () => <PdfToImages format="image/png" />,
    'compound-interest-calculator': CompoundInterest, 'fd-maturity-calculator': FdMaturity, 'rd-maturity-calculator': RdMaturity, 'loan-amortization-calculator': LoanAmortization, 'hra-exemption-calculator-india': HraExemption, 'saas-retention-calculator': SaasRetention, 'sales-pipeline-forecaster': SalesPipelineForecaster, 'saas-pricing-calculator': SaasPricing, 'invoice-aging-report': InvoiceAging, 'weighted-decision-matrix': DecisionMatrix, 'gst-invoice-generator': GstInvoice, 'emi': Emi, 'gst': Gst, 'sip': Sip, 'income-tax-india': IndiaIncomeTaxCalculator, 'income-tax-global': GlobalIncomeTaxCalculator, 'json-formatter': JsonFormatter, 'json-to-csv': JsonToCsv, 'base64': Base64Tool,
    'jwt-decoder': JwtDecoder, 'unix-timestamp': UnixTimestamp, 'uuid-generator': UuidGenerator, 'url-encoder': UrlEncoder,
    'password-generator': PasswordGenerator
  }[slug]), [slug]);

  const adEligible = isAdEligible({ tool, info, hasTool: Boolean(content) });

  useEffect(() => {
    if (adEligible) loadAdSense();
  }, [adEligible]);

  useEffect(() => {
    if (tool) {
      const pageTitle = info?.title || (tool.slug === 'image-compressor' ? `${tool.name} - online compressor | size compressor | online mb reducer | Free Online Tool | OrbitBoard` : `${tool.name} | Free Online Tool | OrbitBoard`);
      document.title = pageTitle.includes('OrbitBoard') ? pageTitle : (pageTitle + ' | OrbitBoard');
      const desc = info?.metaDescription || info?.intro || tool.description;
      const setMeta = (name, content) => {
        let m = document.querySelector('meta[name="' + name + '"]');
        if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m); }
        m.content = content;
      };
      setMeta('description', desc);
      setMeta('robots', tool.status === 'live' ? 'index, follow' : 'noindex, follow');
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = 'https://orbitboard.in/tools/' + slug;
      window.scrollTo(0, 0);
    }
  }, [tool, info, slug]);

  if (!tool) {
    return (
      <div className="min-h-screen bg-[var(--orbit-canvas)] text-stone-900 dark:text-stone-100 p-10">
        <Link to="/tools" className="text-accent-600 font-semibold">← Tools</Link>
        <h1 className="text-2xl font-bold mt-8">Tool not found</h1>
      </div>
    );
  }

  const Tool = content;
  const related = LISTED_TOOLS.filter(t => t.category === tool.category && t.slug !== tool.slug).slice(0, 4);

  return (
    <div className="orbit-light orbit-tool min-h-screen bg-[var(--orbit-canvas)] text-stone-800 dark:text-stone-100 transition-colors flex">
      <QuickAccessLeftSidebar />
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <a href="#tool-workspace" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-accent-600 focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold">Skip to tool</a>
        <div>
          <ToolsHomeHeader />
          <ToolHeaderStrip tool={tool} info={info} workspaceRef={workspaceRef} />

          <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
          <div id="tool-workspace" ref={workspaceRef} className="relative rounded-3xl border border-[var(--orbit-border)] bg-[var(--orbit-surface)] shadow-md overflow-hidden ring-1 ring-accent-500/10 dark:ring-accent-400/10">
            <div className="h-1.5 w-full bg-gradient-to-r from-accent-600 via-indigo-500 to-accent-400 opacity-80" />
            <div className="p-5 sm:p-8">
              {Tool ? <Tool /> : <ComingSoon tool={tool} />}
            </div>
          </div>

          {adEligible && <SampleAd category={tool?.category} />}

          <AdSenseUnit slot="" />

          <div className="space-y-6 pt-8 border-t border-[var(--orbit-border)]">
            <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">Tool Guide & Publisher Information</h2>

            <section className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-6 space-y-4">
              <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">How to use {tool.name}</h3>
              <ol className="space-y-3 border-t border-[var(--orbit-border)] pt-4">
                {(info?.how || [
                  `Enter your input parameters into the ${tool.name} workspace above.`,
                  'Review the calculated or transformed results displayed instantly on screen.',
                  'Copy, export, or download your results securely from your browser.'
                ]).map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            {info?.article && (
              <section className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-6 space-y-4">
                <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">About & Detailed Guide</h3>
                <div className="border-t border-[var(--orbit-border)] pt-4 text-sm leading-7 text-stone-700 dark:text-stone-300 space-y-3">
                  {info.article}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-6 space-y-4">
              <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">Frequently Asked Questions</h3>
              <div className="border-t border-[var(--orbit-border)] pt-4 space-y-4">
                {(info?.faq || [
                  [`Is ${tool.name} free to use?`, `Yes, ${tool.name} is 100% free with no sign-up or registration required.`],
                  [`Is my data safe when using ${tool.name}?`, `Yes. All calculations and file transformations occur client-side in your browser. Your data is not stored or shared on external servers.`]
                ]).map(([q, a]) => (
                  <div key={q} className="space-y-1">
                    <p className="font-semibold text-sm text-stone-800 dark:text-stone-200">{q}</p>
                    <p className="text-sm text-stone-600 dark:text-stone-400 leading-6">{a}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="pt-8 border-t border-[var(--orbit-border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400 mb-4">
              More {tool.category} Tools
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(r => (
                <Link
                  key={r.slug}
                  to={`/tools/${r.slug}`}
                  className="group flex flex-col justify-between p-4 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 hover:border-accent-400.5 hover:shadow-md transition-all duration-200 min-h-[104px]"
                >
                  <div className="flex items-start gap-3">
                    {r.icon && (
                      <span className="shrink-0 w-8 h-8 rounded-xl bg-accent-100 dark:bg-accent-950 text-accent-700 dark:text-accent-300 font-bold text-xs flex items-center justify-center border border-accent-200/60 dark:border-accent-800/60 group-hover:scale-105 transition-transform">
                        {r.icon}
                      </span>
                    )}
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-stone-800 dark:text-stone-200 group-hover:text-accent-700 dark:group-hover:text-accent-400 block truncate">{r.name}</span>
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-5">{r.description}</p>
                    </div>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-600 dark:text-accent-400 group-hover:translate-x-1 transition-transform">
                    Open tool <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>

      <ToolsHomeFooter />
      </div>
    </div>
  );
}
