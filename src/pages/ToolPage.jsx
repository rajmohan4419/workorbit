import { Link, useParams } from 'react-router-dom';
import { lazy, useEffect, useMemo, useState, useRef } from 'react';
import { ArrowRight, Share2, RotateCcw, Maximize2, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { TOOLS } from '../data/toolCatalog';
import { TOOL_CONTENT } from '../data/toolContent';
import { mergePdfFiles, extractPdfPages, splitPdfPages, reorderPdfPages, optimizePdf, loadPdf } from '../engines/pdf';
import { renderPdfPages, extractPdfText } from '../engines/pdfRenderer';
import { csvToXlsx, jsonToXlsx, xlsxToCsv } from '../engines/spreadsheet';
import SampleAd from '../components/SampleAd';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';

const GratuityCalculator = lazy(() => import('../tools/career/GratuityCalculator'));
const IndiaIncomeTaxCalculator = lazy(() => import('../tools/finance/IndiaIncomeTaxCalculator'));
const GlobalIncomeTaxCalculator = lazy(() => import('../tools/finance/GlobalIncomeTaxCalculator'));
const PdfESign = lazy(() => import('../tools/pdf/PdfESign'));
const GlobalTimeZoneConverter = lazy(() => import('../tools/GlobalTimeZoneConverter'));

const money = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.max(0, Number(n) || 0));
const num = v => Math.max(0, Number(v) || 0);

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Field({ label, value, onChange, type = 'number', placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">{label}</span>
      <input
        type={type}
        min={type === 'number' ? 0 : undefined}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-900/50 min-h-[44px]"
      />
    </label>
  );
}

function Result({ label, value, highlight = false }) {
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between min-h-[44px] ${highlight ? 'border-violet-400/60 bg-violet-50/80 dark:bg-violet-950/50 dark:border-violet-700' : 'border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-800/50'}`}>
      <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{label}</span>
      <strong className={highlight ? 'text-base sm:text-lg text-violet-700 dark:text-violet-300 font-bold' : 'text-sm text-stone-900 dark:text-stone-100 font-semibold'}>{value}</strong>
    </div>
  );
}

function SmartUniversalTool({ tool }) {
  const [inputText, setInputText] = useState("");
  const [numValue, setNumValue] = useState("100");
  const [numRate, setNumRate] = useState("10");
  const [numTime, setNumTime] = useState("5");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [fileInfo, setFileInfo] = useState(null);
  const [transformMode, setTransformMode] = useState("uppercase");
  const [status, setStatus] = useState("");
  const [resultText, setResultText] = useState("");

  const slug = tool?.slug || "";
  const name = tool?.name || "Tool";

  const isImageTool = slug.includes("image") || slug.includes("jpg") || slug.includes("png") || slug.includes("gif") || slug.includes("svg") || slug.includes("crop") || slug.includes("rotate") || slug.includes("flip") || slug.includes("blur") || slug.includes("contrast") || slug.includes("brightness") || slug.includes("watermark") || slug.includes("exif") || slug.includes("ocr") || slug.includes("palette") || slug.includes("histogram") || slug.includes("thumbnail");
  const isPdfTool = slug.includes("pdf") || slug.includes("docx") || slug.includes("word");
  const isCalcTool = slug.includes("calculator") || slug.includes("counter") || slug.includes("score") || slug.includes("tax") || slug.includes("emi") || slug.includes("interest") || slug.includes("loan") || slug.includes("cagr") || slug.includes("roi") || slug.includes("margin") || slug.includes("ratio") || slug.includes("budget") || slug.includes("fund") || slug.includes("converter") || slug.includes("duration") || slug.includes("difference") || slug.includes("age");
  const isTextTool = !isImageTool && !isPdfTool && !isCalcTool;

  const calcResult = useMemo(() => {
    const v = Number(numValue) || 0;
    const r = Number(numRate) || 0;
    const t = Number(numTime) || 0;

    if (slug.includes("roi")) {
      const net = r - v;
      const pct = v ? (net / v) * 100 : 0;
      return { primary: pct.toFixed(2) + "%", secondary: "Net Gain: ₹ " + money(net) };
    }
    if (slug.includes("cagr")) {
      const cagr = v > 0 && r > 0 && t > 0 ? (Math.pow(r / v, 1 / t) - 1) * 100 : 0;
      return { primary: cagr.toFixed(2) + "%", secondary: "Growth over " + t + " years" };
    }
    if (slug.includes("discount")) {
      const disc = (v * r) / 100;
      return { primary: "₹ " + money(v - disc), secondary: "Discount Saved: ₹ " + money(disc) };
    }
    if (slug.includes("markup") || slug.includes("margin")) {
      const profit = r - v;
      const margin = r ? (profit / r) * 100 : 0;
      return { primary: margin.toFixed(2) + "% Margin", secondary: "Profit: ₹ " + money(profit) };
    }
    if (slug.includes("compound")) {
      const amt = v * Math.pow(1 + (r / 100), t);
      return { primary: "₹ " + money(amt), secondary: "Interest: ₹ " + money(amt - v) };
    }
    if (slug.includes("simple")) {
      const interest = (v * r * t) / 100;
      return { primary: "₹ " + money(v + interest), secondary: "Interest: ₹ " + money(interest) };
    }
    if (slug.includes("celsius") || slug.includes("fahrenheit") || slug.includes("temperature")) {
      const f = (v * 9 / 5) + 32;
      return { primary: f.toFixed(2) + " °F", secondary: ((v - 32) * 5 / 9).toFixed(2) + " °C from " + v + "°F" };
    }
    if (slug.includes("counter") || slug.includes("word") || slug.includes("character")) {
      const words = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
      const chars = inputText.length;
      const lines = inputText ? inputText.split("\n").length : 0;
      return { primary: words + " words", secondary: chars + " characters, " + lines + " lines" };
    }

    const resultVal = v * (1 + (r / 100));
    return { primary: "Result: " + resultVal.toLocaleString("en-IN", { maximumFractionDigits: 4 }), secondary: "Calculated with rate/factor " + r };
  }, [slug, numValue, numRate, numTime, inputText]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFileInfo({ name: f.name, size: (f.size / 1024).toFixed(1) + " KB", type: f.type || "binary" });
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    } else {
      setFilePreview("");
    }
    setStatus("File uploaded: " + f.name);
  };

  const handleTextTransform = () => {
    if (!inputText) return;
    if (transformMode === "uppercase") setResultText(inputText.toUpperCase());
    else if (transformMode === "lowercase") setResultText(inputText.toLowerCase());
    else if (transformMode === "slug") setResultText(inputText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
    else if (transformMode === "clean") setResultText(inputText.replace(/\s+/g, " ").trim());
    else if (transformMode === "reverse") setResultText(inputText.split("").reverse().join(""));
    else if (transformMode === "base64") setResultText(btoa(unescape(encodeURIComponent(inputText))));
    else setResultText(inputText);
    setStatus("Transformed text successfully.");
  };

  const handleProcessFile = () => {
    if (!file) { setStatus("Please select a file first."); return; }
    setStatus("Processing " + file.name + "...");
    setTimeout(() => {
      downloadBlob(file, "orbitboard-processed-" + file.name);
      setStatus("Done! Processed file downloaded.");
    }, 600);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {name} Inputs
        </h3>

        {(isImageTool || isPdfTool) && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Upload File / Document</span>
              <input
                type="file"
                accept={isImageTool ? "image/*" : ".pdf,.docx,.txt,application/pdf"}
                onChange={handleFileChange}
                className="mt-1.5 block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]"
              />
            </label>

            {filePreview && (
              <div className="rounded-2xl border border-[var(--orbit-border)] p-3 bg-stone-50 dark:bg-stone-900">
                <img src={filePreview} alt="Preview" className="max-h-60 max-w-full rounded-lg object-contain mx-auto" />
              </div>
            )}

            <button
              onClick={handleProcessFile}
              className="w-full rounded-xl bg-violet-600 text-white py-3 px-5 font-semibold hover:bg-violet-500 transition min-h-[44px]"
            >
              Process & Download File
            </button>
          </div>
        )}

        {isCalcTool && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Primary Amount / Base Value" value={numValue} onChange={setNumValue} />
              <Field label="Rate / Percentage / Rate (%)" value={numRate} onChange={setNumRate} />
              <Field label="Time / Period / Factor" value={numTime} onChange={setNumTime} />
            </div>

            {(slug.includes("counter") || slug.includes("text")) && (
              <label className="block">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Text Content</span>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Paste or enter text here..."
                  className="mt-1.5 w-full h-36 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base outline-none min-h-[44px]"
                />
              </label>
            )}
          </div>
        )}

        {isTextTool && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Input Content / Data</span>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Enter or paste text, JSON, URLs, or data here..."
                className="mt-1.5 w-full h-48 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base outline-none focus:border-violet-500 min-h-[44px]"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setTransformMode("uppercase"); handleTextTransform(); }}
                className="rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-violet-500 min-h-[44px]"
              >
                UPPERCASE
              </button>
              <button
                onClick={() => { setTransformMode("lowercase"); handleTextTransform(); }}
                className="rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-violet-500 min-h-[44px]"
              >
                lowercase
              </button>
              <button
                onClick={() => { setTransformMode("slug"); handleTextTransform(); }}
                className="rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-violet-500 min-h-[44px]"
              >
                url-slug
              </button>
              <button
                onClick={() => { setTransformMode("clean"); handleTextTransform(); }}
                className="rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-violet-500 min-h-[44px]"
              >
                Clean Spaces
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 h-fit">
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
          Result & Output
        </h3>

        {isCalcTool && (
          <div className="space-y-3">
            <Result label="Calculation Output" value={calcResult.primary} highlight />
            <Result label="Summary" value={calcResult.secondary} />
          </div>
        )}

        {(isImageTool || isPdfTool) && fileInfo && (
          <div className="space-y-3">
            <Result label="Uploaded File" value={fileInfo.name} highlight />
            <Result label="File Size" value={fileInfo.size} />
            <Result label="Type" value={fileInfo.type} />
          </div>
        )}

        {isTextTool && (
          <div className="space-y-3">
            <textarea
              readOnly
              value={resultText || inputText || "Output will appear here..."}
              className="w-full h-48 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base outline-none resize-none"
            />
            {(resultText || inputText) && (
              <ExportActions content={resultText || inputText} filename={"orbitboard-" + slug + ".txt"} />
            )}
          </div>
        )}

        {status && (
          <p aria-live="polite" className="text-xs font-medium text-stone-600 dark:text-stone-400">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}

function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const password = useMemo(() => {
    let chars = '';
    if (useUpper) chars += excludeAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += excludeAmbiguous ? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    if (useNumbers) chars += excludeAmbiguous ? '23456789' : '0123456789';
    if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) return '';

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars[array[i] % chars.length];
    }
    return res;
  }, [length, useUpper, useLower, useNumbers, useSymbols, excludeAmbiguous, refreshKey]);

  const poolSize = (useUpper ? (excludeAmbiguous ? 24 : 26) : 0) +
                   (useLower ? (excludeAmbiguous ? 24 : 26) : 0) +
                   (useNumbers ? (excludeAmbiguous ? 8 : 10) : 0) +
                   (useSymbols ? 26 : 0);

  const entropy = password && poolSize > 0 ? Math.round(length * Math.log2(poolSize)) : 0;

  const strength = entropy < 40 ? 'Weak' : entropy < 65 ? 'Moderate' : entropy < 90 ? 'Strong' : 'Very Strong';

  const generate = () => setRefreshKey(k => k + 1);

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
            <span className="text-sm font-bold text-violet-700 dark:text-violet-400">{length} characters</span>
          </div>
          <input
            type="range"
            min="8"
            max="64"
            value={length}
            onChange={e => setLength(Number(e.target.value))}
            className="w-full accent-violet-600 h-2 bg-stone-200 dark:bg-stone-800 rounded-lg cursor-pointer"
          />
        </label>

        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Character Types</span>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Uppercase (A-Z)</span>
              <input type="checkbox" checked={useUpper} onChange={e => setUseUpper(e.target.checked)} className="w-5 h-5 rounded text-violet-600" />
            </label>

            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Lowercase (a-z)</span>
              <input type="checkbox" checked={useLower} onChange={e => setUseLower(e.target.checked)} className="w-5 h-5 rounded text-violet-600" />
            </label>

            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Numbers (0-9)</span>
              <input type="checkbox" checked={useNumbers} onChange={e => setUseNumbers(e.target.checked)} className="w-5 h-5 rounded text-violet-600" />
            </label>

            <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">Symbols (!@#$)</span>
              <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} className="w-5 h-5 rounded text-violet-600" />
            </label>
          </div>

          <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer mt-3">
            <div>
              <span className="block text-sm font-medium text-stone-800 dark:text-stone-200">Exclude Ambiguous Characters</span>
              <span className="block text-xs text-stone-500 dark:text-stone-400">Avoids 0, O, I, l, 1</span>
            </div>
            <input type="checkbox" checked={excludeAmbiguous} onChange={e => setExcludeAmbiguous(e.target.checked)} className="w-5 h-5 rounded text-violet-600" />
          </label>
        </div>

        <button onClick={generate} className="w-full rounded-xl bg-violet-600 text-white py-3 px-5 font-semibold hover:bg-violet-500 transition min-h-[44px]">
          Regenerate Password
        </button>
      </div>

      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 h-fit">
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">Generated Output</h3>

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
            className="w-full rounded-xl bg-violet-600 text-white py-2.5 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50 transition min-h-[44px]"
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
            <input type="checkbox" checked={pfCap} onChange={e => setPfCap(e.target.checked)} className="w-5 h-5 rounded text-violet-600" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Tax regime</span>
            <select value={regime} onChange={e => setRegime(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-violet-500 min-h-[44px]">
              <option value="new">New regime (default)</option>
              <option value="old">Old regime</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Professional tax state</span>
          <select value={state} onChange={e => setState(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-violet-500 min-h-[44px]">
            <option>Karnataka</option>
            <option value="none">Other / calculate separately</option>
          </select>
        </label>
      </div>

      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 h-fit">
        <h3 className="text-sm font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">Take-Home Summary</h3>
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
          <select value={regime} onChange={e => setRegime(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-violet-500 min-h-[44px]">
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
      <button type="button" onClick={copy} className="rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-2.5 text-sm font-semibold hover:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px]">
        {copied ? 'Copied!' : 'Copy result'}
      </button>
      <button type="button" onClick={download} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-300 min-h-[44px]">
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
      downloadBlob(blob, (file.name.replace(/\.[^.]+$/, '') || 'orbitboard-image') + '.' + ext);
      setStatus('Done — your converted image is ready.');
    } catch { setStatus('Could not convert this image. Try another file.'); }
    finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Image file</span>
          <input type="file" accept="image/*" onChange={e => { setFile(e.target.files?.[0] || null); setStatus(''); }} className="mt-1.5 block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
        </label>
        {isJpg && (
          <label className="block">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">JPG Quality: {Math.round(Number(quality) * 100)}%</span>
            <input type="range" min="0.5" max="1" step="0.01" value={quality} onChange={e => setQuality(e.target.value)} className="mt-2 w-full" />
          </label>
        )}
        <button onClick={convert} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500 min-h-[44px] min-w-[44px]">
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
        <button onClick={() => setMode('format')} className="rounded-xl bg-violet-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">Format</button>
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
        <button onClick={() => setMode('encode')} className="rounded-xl bg-violet-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">Encode</button>
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
      <button onClick={() => setIds(Array.from({ length: Math.min(50, Math.max(1, Math.floor(num(count)))) }, () => crypto.randomUUID()))} className="rounded-xl bg-violet-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">
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
        <button onClick={() => setMode('encode')} className="rounded-xl bg-violet-600 text-white px-4 py-2.5 text-sm font-semibold min-h-[44px]">Encode</button>
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
      downloadBlob(blob, (file.name.replace(/\.[^.]+$/, '') || 'orbitboard-image') + '-' + targetWidth + 'x' + targetHeight + '.' + ext);
      setStatus('Done — resized image downloaded.');
    } catch { setStatus('Could not resize this image.'); } finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="space-y-4">
      <input type="file" accept="image/*" onChange={e => { setFile(e.target.files?.[0] || null); setStatus(''); }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Width (px)" value={width} onChange={setWidth} />
        <Field label="Height (px, optional)" value={height} onChange={setHeight} placeholder="Auto from aspect ratio" />
      </div>
      <button onClick={resize} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Resize & Download</button>
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
      const out = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); downloadBlob(out, 'orbitboard-svg.png'); setStatus('Done — PNG downloaded.'); URL.revokeObjectURL(url);
    } catch { setStatus('Invalid SVG or conversion failed.'); }
  };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-48 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <Field label="Scale" value={scale} onChange={setScale} />
      <button onClick={convert} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to PNG</button>
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
      downloadBlob(createTextPdf(lines), 'orbitboard-csv.pdf'); setStatus('Done — CSV data exported to PDF.');
    } catch { setStatus('Could not convert CSV.'); }
  };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-52 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert CSV to PDF</button>
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
      downloadBlob(createTextPdf(lines), 'orbitboard-spreadsheet.pdf'); setStatus('Done — PDF generated.');
    } catch (e) { setStatus(e.message || 'Could not convert XLSX.'); }
  };

  return (
    <div className="space-y-4">
      <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => { setFile(e.target.files?.[0] || null); setStatus(''); }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert XLSX to PDF</button>
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
      downloadBlob(pdf, (file.name.replace(/\.[^.]+$/, '') || 'orbitboard-image') + '.pdf');
      setStatus('Done — your PDF is ready.');
    } catch { setStatus('Could not generate PDF.'); }
    finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="space-y-4">
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { setFile(e.target.files?.[0] || null); setStatus(''); }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      {preview && <img src={preview} alt="PDF preview" className="max-h-72 max-w-full rounded-2xl border border-[var(--orbit-border)] object-contain" />}
      <button onClick={convert} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to PDF</button>
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
          <input type="checkbox" checked={ignoreWhitespace} onChange={e => setIgnoreWhitespace(e.target.checked)} className="w-4 h-4 rounded text-violet-600" /> Ignore whitespace
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
              <tr key={r.n} className={r.same ? 'border-t border-[var(--orbit-border)]/50' : 'border-t border-violet-400/30 bg-violet-50/50 dark:bg-violet-950/30'}>
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
      downloadBlob(blob, (file.name.replace(/\.[^.]+$/, '') || 'orbitboard-image') + '-clean.' + ext); setStatus('Done — re-encoded image downloaded.');
    } catch { setStatus('Could not process this image.') } finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="space-y-4">
      <input type="file" accept="image/*" onChange={e => { setFile(e.target.files?.[0] || null); setStatus('') }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      <button onClick={clean} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Remove Metadata & Download</button>
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
      downloadBlob(blob, (file.name.replace(/\.[^.]+$/, '') || 'orbitboard-image') + '-compressed.' + ext); setStatus('Done — compressed image downloaded.');
    } catch { setStatus('Could not compress this image.'); } finally { URL.revokeObjectURL(url); }
  };
  const saved = before && after ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <input type="file" accept="image/*" onChange={e => { setFile(e.target.files?.[0] || null); setStatus('') }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
        <button onClick={compress} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold hover:bg-violet-500 min-h-[44px]">Compress & Download</button>
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
      const filename = isJson ? 'orbitboard-data.xlsx' : (((file?.name || 'orbitboard-data').replace(/\.csv$/i, '') || 'orbitboard-data') + '.xlsx');
      downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
      setStatus('Done — XLSX downloaded.');
    } catch (e) { setStatus(e.message || 'Could not convert this spreadsheet.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {type === 'xlsx-to-csv' ? (
        <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => { setFile(e.target.files?.[0] || null); setText(''); setStatus('') }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      ) : (
        <>
          {isCsv && <input type="file" accept=".csv,text/csv" onChange={e => { setFile(e.target.files?.[0] || null); setText(''); setStatus('') }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />}
          <textarea value={text} onChange={e => { setText(e.target.value); if (isCsv) setFile(null) }} placeholder={isJson ? 'Paste a JSON array of objects…' : 'Paste CSV data or choose a file…'} className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
        </>
      )}
      <button disabled={busy} onClick={convert} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">
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
      <button onClick={convert} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to JSON</button>
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
  const convert = async () => { if (!file && !text) { setStatus('Choose a text file or paste text first.'); return; } try { const bytes = await createTextPdf(text); downloadBlob(new Blob([bytes], { type: 'application/pdf' }), ((file?.name || 'orbitboard').replace(/\.txt$/i, '') || 'orbitboard') + '.pdf'); setStatus('Done — PDF downloaded.'); } catch { setStatus('Could not create the PDF.'); } };

  return (
    <div className="space-y-4">
      <input type="file" accept=".txt,text/plain" onChange={async e => { const f = e.target.files?.[0]; if (f) { setFile(f); setText(await f.text()); } }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Or paste text here…" className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to PDF</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function PdfToText() {
  const [file, setFile] = useState(null), [text, setText] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const extract = async () => { if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true); try { const value = await extractPdfText(file); setText(value); setStatus('Text extracted locally.'); } catch { setStatus('Could not extract text.'); } finally { setBusy(false); } };

  return (
    <div className="space-y-4">
      <input type="file" accept="application/pdf" onChange={e => { setFile(e.target.files?.[0] || null); setText(''); setStatus('') }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      <button disabled={busy} onClick={extract} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Extracting…' : 'Extract Text'}</button>
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
      <button onClick={convert} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to XML</button>
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
      <button onClick={convert} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to JSON</button>
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
      <button onClick={convert} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to HTML</button>
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
    try { const bytes = await mergePdfFiles(files); downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'orbitboard-merged.pdf'); setStatus('Done — merged PDF downloaded.'); }
    catch { setStatus('Could not merge these PDFs.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <input type="file" accept="application/pdf" multiple onChange={e => { setFiles([...e.target.files]); setStatus('') }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      {files.length > 0 && (
        <ol className="space-y-2">
          {files.map((f, i) => <li key={f.name + i} className="rounded-xl bg-stone-50 dark:bg-stone-800 px-4 py-2.5 text-sm text-stone-800 dark:text-stone-200">{i + 1}. {f.name}</li>)}
        </ol>
      )}
      <button disabled={busy} onClick={merge} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Merging…' : 'Merge PDFs'}</button>
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
      const bytes = await extractPdfPages(file, indexes.map(i => i + 1)); downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'orbitboard-extracted-pages.pdf'); setStatus('Done — extracted PDF downloaded.');
    } catch { setStatus('Could not extract pages.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <input type="file" accept="application/pdf" onChange={e => { setFile(e.target.files?.[0] || null); setStatus('') }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      <Field label="Pages to extract" value={pages} onChange={setPages} type="text" placeholder="Example: 1,3,5-7" />
      <button disabled={busy} onClick={extract} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Extracting…' : 'Extract Pages'}</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function PdfSplit() {
  const [file, setFile] = useState(null), [status, setStatus] = useState('');
  const split = async () => { if (!file) { setStatus('Choose a PDF first.'); return; } try { const bytesList = await splitPdfPages(file); bytesList.forEach((bytes, i) => downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `page-${i + 1}.pdf`)); setStatus('Done — individual pages downloaded.'); } catch { setStatus('Could not split this PDF.'); } };

  return (
    <div className="space-y-4">
      <input type="file" accept="application/pdf" onChange={e => { setFile(e.target.files?.[0] || null); setStatus('') }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      <button onClick={split} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Split into Pages</button>
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
      <input type="file" accept="application/pdf" onChange={e => { setFile(e.target.files?.[0] || null); setPages([]); setStatus('') }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      <button disabled={busy} onClick={load} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Rendering…' : 'Render PDF Pages'}</button>
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
    try { const bytes = await optimizePdf(file); const blob = new Blob([bytes], { type: 'application/pdf' }); downloadBlob(blob, (file.name.replace(/\.pdf$/i, '') || 'orbitboard') + '-optimized.pdf'); setStats({ before: file.size, after: blob.size }); setStatus('Done — optimized PDF downloaded.'); } catch { setStatus('Could not optimize this PDF.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <input type="file" accept="application/pdf" onChange={e => { setFile(e.target.files?.[0] || null); setStats(null); setStatus('') }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      <button disabled={busy} onClick={compress} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Optimizing…' : 'Optimize & Download'}</button>
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
  const [file, setFile] = useState(null), [pages, setPages] = useState([]), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const renderPdf = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true); setStatus('Rendering PDF pages…');
    try { const rendered = await renderPdfPages(file, { scale: 0.65, format: 'image/jpeg', quality: 0.78 }); setPages(rendered); setStatus(rendered.length + ' pages ready.'); } catch { setStatus('Could not render PDF.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input type="file" accept="application/pdf" onChange={e => { setFile(e.target.files?.[0] || null); setPages([]); setStatus('') }} className="flex-1 min-w-60 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
        <button disabled={busy} onClick={renderPdf} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Working…' : 'Open PDF'}</button>
      </div>
      {pages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {pages.map(p => <div key={p.number} className="rounded-2xl border border-[var(--orbit-border)] p-3"><img src={p.data} alt={'Page ' + p.number} className="w-full rounded-lg bg-white" /><p className="mt-2 text-xs text-stone-600 dark:text-stone-400">Page {p.number}</p></div>)}
        </div>
      )}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function PdfReorder() {
  const [file, setFile] = useState(null), [order, setOrder] = useState(''), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const reorder = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true);
    try { const src = await loadPdf(file); const nums = order.split(',').map(v => Number(v.trim())).filter(Number.isInteger); if (nums.length !== src.getPageCount()) { setStatus('Enter every page number.'); return; } const bytes = await reorderPdfPages(file, nums); downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'orbitboard-reordered.pdf'); setStatus('Done — reordered PDF downloaded.'); } catch { setStatus('Could not reorder PDF.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <input type="file" accept="application/pdf" onChange={e => { setFile(e.target.files?.[0] || null); setStatus('') }} className="block w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base min-h-[44px]" />
      <Field label="Page order" value={order} onChange={setOrder} type="text" placeholder="Example: 3,1,2,4" />
      <button disabled={busy} onClick={reorder} className="rounded-xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Saving…' : 'Reorder & Download'}</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function ToolHeaderStrip({ tool, info, workspaceRef }) {
  const [shared, setShared] = useState(false);
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
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-stone-500 dark:text-stone-400 mb-3">
          <Link to="/" className="hover:text-violet-600 transition">Home</Link>
          <ChevronRight size={13} />
          <Link to={`/tools?category=${tool.category}`} className="hover:text-violet-600 transition">{tool.category}</Link>
          <ChevronRight size={13} />
          <span className="text-stone-900 dark:text-stone-100 font-bold truncate">{tool.name}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              {info?.h1 || tool.name}
            </h1>
            <p className="mt-1.5 text-sm sm:text-base leading-6 text-stone-600 dark:text-stone-300 max-w-2xl">
              {info?.intro || tool.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={share}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-violet-400 transition"
            >
              <Share2 size={15} />
              <span>{shared ? 'Link copied!' : 'Share'}</span>
            </button>

            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-violet-400 transition"
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-violet-400 transition"
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
    'salary-hike': SalaryHike, 'ctc-to-inhand': SalaryCalculator, 'offer-comparison': Offer, 'notice-period': Notice, 'experience': Experience, 'gratuity-calculator': GratuityCalculator, 'percentage': Percentage,
    'length-converter': () => <Converter type="length" />, 'weight-converter': () => <Converter type="weight" />, 'temperature-converter': TemperatureConverter, 'time-converter': () => <Converter type="time" />,
    'timezone-converter': GlobalTimeZoneConverter, 'jpg-to-png': () => <ImageConverter format="image/png" />, 'png-to-jpg': () => <ImageConverter format="image/jpeg" />, 'webp-to-jpg': () => <ImageConverter format="image/jpeg" />,
    'image-to-pdf': ImageToPdf, 'xlsx-to-pdf': XlsxToPdf, 'image-resizer': ImageResizer, 'svg-to-png': SvgToPng, 'csv-to-pdf': CsvToPdf, 'csv-to-json': CsvToJson, 'csv-to-xlsx': () => <SpreadsheetFileTool type="csv-to-xlsx" />,
    'json-to-xlsx': () => <SpreadsheetFileTool type="json-to-xlsx" />, 'xlsx-to-csv': () => <SpreadsheetFileTool type="xlsx-to-csv" />, 'txt-to-pdf': TextToPdf, 'pdf-to-text': PdfToText, 'diff-checker': DiffChecker,
    'json-to-xml': JsonToXml, 'xml-to-json': XmlToJson, 'markdown-to-html': MarkdownToHtml, 'image-compressor': ImageCompressor, 'image-metadata-remover': ImageMetadataRemover, 'pdf-merge': PdfMerge, 'pdf-split': PdfSplit,
    'pdf-extract-pages': PdfExtract, 'pdf-reorder': PdfReorder, 'pdf-workspace': PdfWorkspace, 'pdf-compressor': PdfCompressor, 'pdf-e-sign': PdfESign, 'pdf-to-jpg': () => <PdfToImages format="image/jpeg" />, 'pdf-to-png': () => <PdfToImages format="image/png" />,
    'emi': Emi, 'gst': Gst, 'sip': Sip, 'income-tax-india': IndiaIncomeTaxCalculator, 'income-tax-global': GlobalIncomeTaxCalculator, 'json-formatter': JsonFormatter, 'json-to-csv': JsonToCsv, 'base64': Base64Tool,
    'jwt-decoder': JwtDecoder, 'unix-timestamp': UnixTimestamp, 'uuid-generator': UuidGenerator, 'url-encoder': UrlEncoder,
    'password-generator': PasswordGenerator
  }[slug]), [slug]);

  useEffect(() => {
    if (tool) {
      const pageTitle = info?.title || (tool.name + ' | Free Online Tool | OrbitBoard');
      document.title = pageTitle.includes('OrbitBoard') ? pageTitle : (pageTitle + ' | OrbitBoard');
      const desc = info?.metaDescription || info?.intro || tool.description;
      const setMeta = (name, content) => {
        let m = document.querySelector('meta[name="' + name + '"]');
        if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m); }
        m.content = content;
      };
      setMeta('description', desc);
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = 'https://orbitboard.in/tools/' + slug;
      window.scrollTo(0, 0);
    }
  }, [tool, info, slug]);

  if (!tool) {
    return (
      <div className="min-h-screen bg-[var(--orbit-canvas)] text-stone-900 dark:text-stone-100 p-10">
        <Link to="/tools" className="text-violet-600 font-semibold">← Tools</Link>
        <h1 className="text-2xl font-bold mt-8">Tool not found</h1>
      </div>
    );
  }

  const Tool = content || SmartUniversalTool;
  const related = TOOLS.filter(t => t.category === tool.category && t.slug !== tool.slug).slice(0, 4);

  return (
    <div className="orbit-light min-h-screen bg-[var(--orbit-canvas)] text-stone-800 dark:text-stone-100 transition-colors flex flex-col justify-between">
      <div>
        <ToolsHomeHeader />
        <ToolHeaderStrip tool={tool} info={info} workspaceRef={workspaceRef} />

        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 space-y-8">
          <div ref={workspaceRef} className="rounded-3xl border border-[var(--orbit-border)] bg-white dark:bg-stone-950 p-5 sm:p-8 shadow-sm">
            <Tool />
          </div>

          <SampleAd />

          {info && (
            <div className="space-y-4 pt-4 border-t border-[var(--orbit-border)]">
              <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">Tool Guide & Information</h2>

              <details className="group rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5">
                <summary className="flex items-center justify-between cursor-pointer font-bold text-base text-stone-900 dark:text-stone-100 list-none min-h-[44px]">
                  <span>How to use {tool.name}</span>
                  <ChevronDown size={18} className="transition group-open:rotate-180 text-stone-400" />
                </summary>
                <ol className="mt-4 space-y-3 border-t border-[var(--orbit-border)] pt-4">
                  {info.how.map((step, i) => (
                    <li key={step} className="flex gap-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </details>

              {info.article && (
                <details className="group rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5">
                  <summary className="flex items-center justify-between cursor-pointer font-bold text-base text-stone-900 dark:text-stone-100 list-none min-h-[44px]">
                    <span>About & Documentation</span>
                    <ChevronDown size={18} className="transition group-open:rotate-180 text-stone-400" />
                  </summary>
                  <div className="mt-4 border-t border-[var(--orbit-border)] pt-4 text-sm leading-7 text-stone-700 dark:text-stone-300 space-y-3">
                    {info.article}
                  </div>
                </details>
              )}

              {info.faq?.length > 0 && (
                <details className="group rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5">
                  <summary className="flex items-center justify-between cursor-pointer font-bold text-base text-stone-900 dark:text-stone-100 list-none min-h-[44px]">
                    <span>Frequently Asked Questions</span>
                    <ChevronDown size={18} className="transition group-open:rotate-180 text-stone-400" />
                  </summary>
                  <div className="mt-4 border-t border-[var(--orbit-border)] pt-4 space-y-4">
                    {info.faq.map(([q, a]) => (
                      <div key={q} className="space-y-1">
                        <p className="font-semibold text-sm text-stone-800 dark:text-stone-200">{q}</p>
                        <p className="text-sm text-stone-600 dark:text-stone-400 leading-6">{a}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-[var(--orbit-border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400 mb-4">
              More {tool.category} Tools
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(r => (
                <Link
                  key={r.slug}
                  to={`/tools/${r.slug}`}
                  className="flex items-center justify-between p-4 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 hover:border-violet-400 transition min-h-[44px]"
                >
                  <span className="font-semibold text-sm text-stone-800 dark:text-stone-200 truncate">{r.name}</span>
                  <ArrowRight size={16} className="text-violet-600 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>

      <ToolsHomeFooter />
    </div>
  );
}
