import { Link, useParams } from 'react-router-dom';
import { lazy, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { 
  ArrowRight, Share2, RotateCcw, Maximize2, Star, ChevronRight, 
  ChevronDown, Coins, BriefcaseBusiness, Code2, Calculator, TrendingUp 
} from 'lucide-react';
import { TOOLS, LISTED_TOOLS } from '../data/toolCatalog';
import { TOOL_CONTENT } from '../data/toolContent';
import toolVariants from '../data/toolVariants.json';
import { ComingSoon, Field, Result } from '../components/tools/ToolFields';
import { money, num } from '../lib/toolFormat';
import NotFound from './NotFound';
import { CompoundInterest, FdMaturity, RdMaturity, LoanAmortization, HraExemption } from '../tools/finance/FinanceCalculators';
import { SaasRetention, SalesPipelineForecaster, SaasPricing } from '../tools/business/BusinessCalculators';
import { InvoiceAging, DecisionMatrix } from '../tools/business/BusinessWorkflows';
import { GstInvoice } from '../tools/business/GstInvoice';
import { GifMaker } from '../tools/everyday/GifMaker';
import { ImageToGif, VideoToGif } from '../tools/media/GifTools';
import SampleAd from '../components/SampleAd';
import { isAdEligible, loadAdSense } from '../lib/adsense';
import AdSenseUnit from '../components/AdSenseUnit';
import SEO from '../components/layout/SEO';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';
import { QuickAccessLeftSidebar } from '../components/layout/QuickAccessLeftSidebar';
import { trackToolUsed } from '../lib/analytics';
import { ToolShareContext, useToolShareContext } from '../lib/shareResults';
import { ShareResultModal } from '../components/tools/ShareResultModal';

// Extracted Modular Tool Packages
import { SalaryCalculator, SalaryHike, Offer, Notice, Experience } from '../tools/career/CareerTools';
import { Emi, Gst, Sip } from '../tools/finance/FinanceTools';
import {
  PasswordGenerator, JsonFormatter, JsonToCsv, Base64Tool, JwtDecoder,
  UnixTimestamp, UuidGenerator, UrlEncoder, DiffChecker, JsonToXml,
  XmlToJson, MarkdownToHtml
} from '../tools/developer/DeveloperTools';
import { HtmlViewer } from '../tools/developer/HtmlViewer';
import {
  Converter, TemperatureConverter, ImageConverter, Percentage,
  ImageResizer, SvgToPng, ImageMetadataRemover, ImageCompressor,
  SpreadsheetFileTool, CsvToJson
} from '../tools/everyday/EverydayTools';
import {
  CsvToPdf, XlsxToPdf, ImageToPdf, TextToPdf, PdfToText,
  PdfMerge, PdfExtract, PdfSplit, PdfToImages, PdfCompressor,
  PdfWorkspace, PdfReorder
} from '../tools/pdf/PdfTools';
import BankReconciliation from '../tools/business/BankReconciliation';
import ExcelEngineWorkspace from '../tools/spreadsheet/ExcelEngineWorkspace';

import { PayslipGenerator } from '../tools/finance/PayslipGenerator';
import { GstrReconciliation } from '../tools/finance/GstrReconciliation';
import { TdsCalculator } from '../tools/finance/TdsCalculator';
import { PfEsiCalculator } from '../tools/finance/PfEsiCalculator';
import { SalarySheet } from '../tools/finance/SalarySheet';

const GratuityCalculator = lazy(() => import('../tools/career/GratuityCalculator'));
const IndiaIncomeTaxCalculator = lazy(() => import('../tools/finance/IndiaIncomeTaxCalculator'));
const GlobalIncomeTaxCalculator = lazy(() => import('../tools/finance/GlobalIncomeTaxCalculator'));
const PdfESign = lazy(() => import('../tools/pdf/PdfESign'));
const GlobalTimeZoneConverter = lazy(() => import('../tools/GlobalTimeZoneConverter'));

function ToolHeaderStrip({ tool, info, workspaceRef, onOpenShareModal }) {
  const [shared, setShared] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  const categoryCounts = useMemo(() => {
    const counts = {};
    LISTED_TOOLS.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, []);

  const categoryOptions = useMemo(() => [
    { name: 'Business', label: 'Business & SaaS', icon: TrendingUp, count: categoryCounts['Business'] || 0 },
    { name: 'Finance', label: 'Finance & Money', icon: Coins, count: categoryCounts['Finance'] || 0 },
    { name: 'Developer', label: 'Developer Tools', icon: Code2, count: categoryCounts['Developer'] || 0 },
    { name: 'Everyday', label: 'Everyday Utilities', icon: Calculator, count: categoryCounts['Everyday'] || 0 },
    { name: 'Career', label: 'Career & Salary', icon: BriefcaseBusiness, count: categoryCounts['Career'] || 0 },
  ], [categoryCounts]);

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
    if (onOpenShareModal) {
      onOpenShareModal();
      return;
    }
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
                        onMouseEnter={() => window.dispatchEvent(new CustomEvent('orbitboard:category-theme', { detail: cat.name.toLowerCase() }))}
                        onMouseLeave={() => window.dispatchEvent(new CustomEvent('orbitboard:category-theme', { detail: tool.category.toLowerCase() }))}
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

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {info?.h1 || (tool.slug === 'image-compressor' ? `${tool.name} - online compressor | size compressor | online mb reducer` : tool.name)}
            </h1>
            {/* AdSense block */}
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9160921653901381" crossOrigin="anonymous"></script>
            <ins className="adsbygoogle" style={{display: 'block'}} data-ad-client="ca-pub-9160921653901381" data-ad-slot="3055679722" data-ad-format="auto" data-full-width-responsive="true"></ins>
            <script>{'(adsbygoogle = window.adsbygoogle || []).push({});'}</script>
            <p className="mt-1 text-xs sm:text-sm leading-5 text-stone-600 dark:text-stone-300 max-w-2xl">
              {info?.intro || tool.description}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
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

function VariantEmi({ params }) {
  const { updateSharePayload, openShareModal } = useToolShareContext();
  const [principal, setPrincipal] = useState(String(params?.principal ?? '1000000'));
  const [rate, setRate] = useState(String(params?.interestRate ?? '8.5'));
  const [years, setYears] = useState(String(params?.tenureYears ?? '20'));
  const p = num(principal), r = num(rate) / 1200, n = Math.max(1, Math.round(num(years) * 12));
  const emi = r ? (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : p / n;
  const total = emi * n;

  useEffect(() => {
    updateSharePayload({
      headlineMetric: `₹ ${money(emi)} Monthly EMI`,
      subMetrics: [
        { label: 'Loan Amount', value: `₹ ${money(p)}` },
        { label: 'Total Interest', value: `₹ ${money(total - p)}` },
        { label: 'Tenure', value: `${years} Years` },
      ],
      summaryText: `Calculated monthly EMI of ₹ ${money(emi)} on a ₹ ${money(p)} loan at ${rate}% for ${years} years`,
      queryParams: { principal, interestRate: rate, tenureYears: years },
    });
  }, [emi, p, total, rate, years, principal, updateSharePayload]);

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
        <button
          type="button"
          onClick={() => openShareModal()}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-850 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-accent-600 dark:hover:text-accent-400 transition shadow-2xs cursor-pointer active:scale-[0.98]"
        >
          <Share2 size={14} className="text-stone-400" />
          <span>Share Result Scorecard</span>
        </button>
      </div>
    </div>
  );
}

function calculateNewTax(taxable) {
  const slabs = [
    [400000, 0],
    [400000, 0.05],
    [400000, 0.10],
    [400000, 0.15],
    [400000, 0.20],
    [400000, 0.25],
    [Infinity, 0.30],
  ];
  let remaining = taxable, tax = 0;
  for (const [limit, rate] of slabs) {
    const amount = Math.min(remaining, limit);
    if (amount <= 0) break;
    tax += amount * rate;
    remaining -= amount;
  }
  if (taxable <= 1200000) tax = Math.max(0, tax - 60000);
  return tax * 1.04;
}

function calculateOldTax(taxable) {
  const slabs = [
    [250000, 0],
    [250000, 0.05],
    [500000, 0.20],
    [Infinity, 0.30],
  ];
  let remaining = taxable, tax = 0;
  for (const [limit, rate] of slabs) {
    const amount = Math.min(remaining, limit);
    if (amount <= 0) break;
    tax += amount * rate;
    remaining -= amount;
  }
  if (taxable <= 500000) tax = Math.max(0, tax - 12500);
  return tax * 1.04;
}

function VariantSalaryCalculator({ params }) {
  const { updateSharePayload, openShareModal } = useToolShareContext();
  const [ctc, setCtc] = useState(String(params?.ctcAnnual ?? '1200000'));
  const [basicPct, setBasicPct] = useState(String(params?.basicPct ?? '40'));
  const [variable, setVariable] = useState('0');
  const [gratuity, setGratuity] = useState('0');
  const [pfCap, setPfCap] = useState(true);
  const [regime, setRegime] = useState(params?.regime ?? 'new');
  const [state, setState] = useState('Karnataka');

  const result = useMemo(() => {
    const annualCtc = num(ctc), basic = (annualCtc * num(basicPct)) / 100;
    const monthlyBasic = basic / 12;
    const employeePf = pfCap ? Math.min(monthlyBasic, 15000) * 0.12 * 12 : basic * 0.12;
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
    return {
      annualCtc,
      basic,
      employeePf,
      employerPf,
      annualGratuity,
      annualVariable,
      fixedGross,
      taxable,
      incomeTax,
      pt,
      annualTakeHome,
      monthlyTakeHome: annualTakeHome / 12,
    };
  }, [ctc, basicPct, variable, gratuity, pfCap, regime, state]);

  useEffect(() => {
    updateSharePayload({
      headlineMetric: `₹ ${money(result.monthlyTakeHome)} Monthly In-Hand`,
      subMetrics: [
        { label: 'Annual CTC', value: `₹ ${money(result.annualCtc)}` },
        { label: 'Annual Tax', value: `₹ ${money(result.incomeTax)}` },
        { label: 'Regime', value: regime === 'new' ? 'New (115BAC)' : 'Old Regime' },
      ],
      summaryText: `Estimated take-home of ₹ ${money(result.monthlyTakeHome)}/mo on a ₹ ${money(result.annualCtc)} CTC under ${regime} tax regime`,
      queryParams: { ctcAnnual: ctc, basicPct, regime },
    });
  }, [result, ctc, basicPct, regime, updateSharePayload]);

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Salary &amp; Deduction Inputs
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Annual CTC (₹)" value={ctc} onChange={setCtc} />
          <Field label="Basic salary as % of CTC" value={basicPct} onChange={setBasicPct} />
          <Field label="Annual variable pay included (₹)" value={variable} onChange={setVariable} />
          <Field label="Annual gratuity included (₹)" value={gratuity} onChange={setGratuity} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-center justify-between min-h-[44px] cursor-pointer">
            <span>
              <span className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
                EPF calculation
              </span>
              <span className="block text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                Cap employee PF at ₹1,800/month
              </span>
            </span>
            <input
              type="checkbox"
              checked={pfCap}
              onChange={(e) => setPfCap(e.target.checked)}
              className="w-5 h-5 rounded text-accent-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Tax regime
            </span>
            <select
              value={regime}
              onChange={(e) => setRegime(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500 min-h-[44px]"
            >
              <option value="new">New regime (default)</option>
              <option value="old">Old regime</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Professional tax state
          </span>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 outline-none focus:border-accent-500 min-h-[44px]"
          >
            <option>Karnataka</option>
            <option value="none">Other / calculate separately</option>
          </select>
        </label>
      </div>

      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 h-fit">
        <h3 className="text-sm font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">
          Take-Home Summary
        </h3>
        <div className="space-y-3">
          <Result
            label="Estimated monthly take-home"
            value={`₹ ${money(result.monthlyTakeHome)}`}
            highlight
          />
          <Result
            label="Estimated annual take-home"
            value={`₹ ${money(result.annualTakeHome)}`}
            highlight
          />
          <Result label="Annual income tax + cess" value={`₹ ${money(result.incomeTax)}`} />
          <Result label="Employee EPF" value={`₹ ${money(result.employeePf)}`} />
          <Result label="Employer EPF included in CTC" value={`₹ ${money(result.employerPf)}`} />
          <Result label="Professional tax" value={`₹ ${money(result.pt)}`} />
          <button
            type="button"
            onClick={() => openShareModal()}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-850 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-accent-600 dark:hover:text-accent-400 transition shadow-2xs cursor-pointer active:scale-[0.98]"
          >
            <Share2 size={14} className="text-stone-400" />
            <span>Share Result Scorecard</span>
          </button>
        </div>
        <div className="rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 text-xs text-stone-600 dark:text-stone-400 space-y-2">
          <div className="flex justify-between">
            <span>Gross cash salary before deductions</span>
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              ₹ {money(result.fixedGross)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Standard deduction</span>
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              ₹ {money(regime === 'new' ? 75000 : 50000)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Taxable salary used</span>
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              ₹ {money(result.taxable)}
            </span>
          </div>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Estimate only. Actual payslips can differ based on PF structure, tax declarations, and employer policy.
        </p>
      </div>
    </div>
  );
}

const SCHEMA_CATEGORY = {
  Finance: 'FinanceApplication',
  Business: 'BusinessApplication',
  Developer: 'DeveloperApplication',
  Everyday: 'UtilitiesApplication',
  Career: 'BusinessApplication',
};

const CATEGORY_LABEL = {
  Finance: 'Finance & Money',
  Business: 'Business & SaaS',
  Developer: 'Developer Tools',
  Everyday: 'Everyday Utilities',
  Career: 'Career & Salary',
};

export default function ToolPage() {
  const { slug } = useParams();
  const [shareData, setShareData] = useState({ slug: null, payload: null });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const slugRef = useRef(slug);

  useEffect(() => {
    slugRef.current = slug;
  }, [slug]);

  const sharePayload = shareData.slug === slug ? shareData.payload : null;

  const updateSharePayload = useCallback((payload) => {
    setShareData((prev) => {
      if (prev.slug === slugRef.current && prev.payload?.headlineMetric === payload?.headlineMetric) {
        return prev;
      }
      return { slug: slugRef.current, payload };
    });
  }, []);

  const openShareModal = useCallback((customPayload) => {
    if (customPayload) {
      setShareData({ slug: slugRef.current, payload: customPayload });
    }
    setIsShareModalOpen(true);
  }, []);

  const shareContextValue = useMemo(() => ({
    sharePayload,
    updateSharePayload,
    openShareModal,
    isShareModalOpen,
    setIsShareModalOpen,
  }), [sharePayload, updateSharePayload, openShareModal, isShareModalOpen]);

  const variant = useMemo(() => toolVariants.find((v) => v.slug === slug), [slug]);
  const baseTool = useMemo(
    () => (variant ? TOOLS.find((t) => t.slug === variant.baseToolSlug) : null),
    [variant]
  );
  const tool = useMemo(() => {
    if (variant) {
      return {
        ...baseTool,
        slug: variant.slug,
        name: variant.name,
        description: variant.description,
        category: variant.category || baseTool?.category || 'Finance',
        status: 'live',
        isVariant: true,
        canonicalUrl: variant.canonicalUrl,
      };
    }
    return TOOLS.find((t) => t.slug === slug);
  }, [variant, baseTool, slug]);

  const info = useMemo(() => {
    if (variant) {
      const baseInfo = TOOL_CONTENT[variant.baseToolSlug] || {};
      return {
        ...baseInfo,
        title: variant.name,
        metaDescription: variant.description,
        intro: variant.intro,
        h1: variant.name,
        faq: variant.faq,
        canonicalUrl: variant.canonicalUrl,
      };
    }
    return TOOL_CONTENT[slug];
  }, [variant, slug]);

  const workspaceRef = useRef(null);

  const content = useMemo(() => ({
    'gif-maker': GifMaker,
    'salary-hike': SalaryHike,
    'ctc-to-inhand': SalaryCalculator,
    'offer-comparison': Offer,
    'notice-period': Notice,
    'experience': Experience,
    'gratuity-calculator': GratuityCalculator,
    'percentage': Percentage,
    'length-converter': () => <Converter type="length" />,
    'weight-converter': () => <Converter type="weight" />,
    'temperature-converter': TemperatureConverter,
    'time-converter': () => <Converter type="time" />,
    'timezone-converter': GlobalTimeZoneConverter,
    'jpg-to-png': () => <ImageConverter format="image/png" />,
    'png-to-jpg': () => <ImageConverter format="image/jpeg" />,
    'webp-to-jpg': () => <ImageConverter format="image/jpeg" />,
    'image-to-pdf': ImageToPdf,
    'xlsx-to-pdf': XlsxToPdf,
    'image-resizer': ImageResizer,
    'svg-to-png': SvgToPng,
    'csv-to-pdf': CsvToPdf,
    'csv-to-json': CsvToJson,
    'csv-to-xlsx': () => <SpreadsheetFileTool type="csv-to-xlsx" />,
    'json-to-xlsx': () => <SpreadsheetFileTool type="json-to-xlsx" />,
    'xlsx-to-csv': () => <SpreadsheetFileTool type="xlsx-to-csv" />,
    'txt-to-pdf': TextToPdf,
    'pdf-to-text': PdfToText,
    'diff-checker': DiffChecker,
    'json-to-xml': JsonToXml,
    'xml-to-json': XmlToJson,
    'markdown-to-html': MarkdownToHtml,
    'html-viewer': HtmlViewer,
    'image-compressor': ImageCompressor,
    'image-to-gif': ImageToGif,
    'video-to-gif': VideoToGif,
    'image-metadata-remover': ImageMetadataRemover,
    'pdf-merge': PdfMerge,
    'pdf-split': PdfSplit,
    'pdf-extract-pages': PdfExtract,
    'pdf-reorder': PdfReorder,
    'pdf-workspace': PdfWorkspace,
    'pdf-compressor': PdfCompressor,
    'pdf-e-sign': PdfESign,
    'pdf-to-jpg': () => <PdfToImages format="image/jpeg" />,
    'pdf-to-png': () => <PdfToImages format="image/png" />,
    'compound-interest-calculator': CompoundInterest,
    'fd-maturity-calculator': FdMaturity,
    'rd-maturity-calculator': RdMaturity,
    'loan-amortization-calculator': LoanAmortization,
    'hra-exemption-calculator-india': HraExemption,
    'saas-retention-calculator': SaasRetention,
    'sales-pipeline-forecaster': SalesPipelineForecaster,
    'saas-pricing-calculator': SaasPricing,
    'invoice-aging-report': InvoiceAging,
    'weighted-decision-matrix': DecisionMatrix,
    'gst-invoice-generator': GstInvoice,
    'bank-reconciliation': BankReconciliation,
    'excel-engine': ExcelEngineWorkspace,
    'emi': Emi,
    'gst': Gst,
    'sip': Sip,
    'income-tax-india': IndiaIncomeTaxCalculator,
    'income-tax-global': GlobalIncomeTaxCalculator,
    'json-formatter': JsonFormatter,
    'json-to-csv': JsonToCsv,
    'base64': Base64Tool,
    'jwt-decoder': JwtDecoder,
    'unix-timestamp': UnixTimestamp,
    'uuid-generator': UuidGenerator,
    'url-encoder': UrlEncoder,
    'password-generator': PasswordGenerator,
    'payslip-generator': PayslipGenerator,
    'gstr-2b-reconciliation': GstrReconciliation,
    'tds-calculator-india': TdsCalculator,
    'pf-and-esi-calculator': PfEsiCalculator,
    'salary-sheet-excel': SalarySheet,
  }[slug]), [slug]);

  const Tool = content;
  const adEligible = isAdEligible({ tool, info, hasTool: Boolean(variant || Tool) });

  const pageTitle = useMemo(() => {
    if (!tool) return 'OrbitBoard';
    const base = info?.title || (tool.slug === 'image-compressor'
      ? `${tool.name} - online compressor | size compressor | online mb reducer | Free Online Tool | OrbitBoard`
      : `${tool.name} | Free Online Tool | OrbitBoard`);
    return base.includes('OrbitBoard') ? base : `${base} | OrbitBoard`;
  }, [tool, info]);

  const pageDescription = useMemo(() => {
    return info?.metaDescription || info?.intro || tool?.description || '';
  }, [info, tool]);

  const canonicalUrl = useMemo(() => {
    return variant?.canonicalUrl || `https://orbitboard.in/tools/${slug}`;
  }, [variant, slug]);

  const structuredData = useMemo(() => {
    if (!tool) return null;
    const url = canonicalUrl;
    const ld = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: tool.name,
        description: pageDescription,
        url,
        applicationCategory: SCHEMA_CATEGORY[tool.category] || 'UtilitiesApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires a modern web browser with JavaScript',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        inLanguage: 'en-IN',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://orbitboard.in/' },
          {
            '@type': 'ListItem',
            position: 2,
            name: CATEGORY_LABEL[tool.category] || tool.category,
            item: 'https://orbitboard.in/tools',
          },
          { '@type': 'ListItem', position: 3, name: tool.name, item: url },
        ],
      },
    ];

    if (info?.faq && info.faq.length > 0) {
      ld.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: info.faq.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      });
    }

    return ld;
  }, [tool, canonicalUrl, pageDescription, info]);

  useEffect(() => {
    if (adEligible) loadAdSense();
  }, [adEligible]);

  useEffect(() => {
    if (tool) {
      trackToolUsed(tool.slug);
      let robots = document.querySelector('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.appendChild(robots);
      }
      robots.content = tool.status === 'live' ? 'index, follow' : 'noindex, follow';
      window.scrollTo(0, 0);
    }
  }, [tool]);

  if (!tool) {
    return <NotFound />;
  }

  const related = LISTED_TOOLS.filter(t => t.category === tool.category && t.slug !== tool.slug).slice(0, 4);

  return (
    <div className="orbit-light orbit-tool min-h-screen bg-[var(--orbit-canvas)] text-stone-800 dark:text-stone-100 transition-colors flex">
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonical={canonicalUrl}
        schema={structuredData}
      />
      <QuickAccessLeftSidebar />
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <a href="#tool-workspace" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-accent-600 focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold">Skip to tool</a>
        <div>
          <ToolsHomeHeader />
          <ToolHeaderStrip
            tool={tool}
            info={info}
            workspaceRef={workspaceRef}
            onOpenShareModal={() => setIsShareModalOpen(true)}
          />

          <ToolShareContext.Provider value={shareContextValue}>
            <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
          <div id="tool-workspace" key={slug} ref={workspaceRef} className="orbit-card-enter relative rounded-3xl border border-[var(--orbit-border)] bg-[var(--orbit-surface)] shadow-md overflow-hidden ring-1 ring-accent-500/10 dark:ring-accent-400/10 transition-shadow duration-300 hover:shadow-lg">
            <div className="h-1.5 w-full bg-gradient-to-r from-accent-600 via-indigo-500 to-accent-400 opacity-85 animate-orbit-beam" />
            <div className="p-5 sm:p-8">
              {variant ? (
                variant.baseToolSlug === 'emi' ? (
                  <VariantEmi params={variant.params} />
                ) : variant.baseToolSlug === 'ctc-to-inhand' ? (
                  <VariantSalaryCalculator params={variant.params} />
                ) : (
                  <ComingSoon tool={tool} />
                )
              ) : Tool ? (
                <Tool />
              ) : (
                <ComingSoon tool={tool} />
              )}
            </div>
          </div>

          {adEligible && <SampleAd category={tool?.category} />}

          {adEligible && <AdSenseUnit slot="" />}

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
              <div className="border-t border-[var(--orbit-border)] divide-y divide-[var(--orbit-border)]">
                {(info?.faq || [
                  [`Is ${tool.name} free to use?`, `Yes, ${tool.name} is 100% free with no sign-up or registration required. All results are calculated instantly.`],
                  [`Is my data safe when using ${tool.name}?`, `Yes. All calculations and file transformations occur client-side in your browser. Your data is never uploaded, stored, or shared on external servers.`]
                ]).map(([q, a], i) => (
                  <details
                    key={q}
                    className="group py-4 first:pt-4 last:pb-2 transition-colors cursor-pointer list-none"
                    open={i === 0}
                  >
                    <summary className="flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-stone-800 dark:text-stone-200 list-none select-none hover:text-accent-600 dark:hover:text-accent-400 transition-colors">
                      <span>{q}</span>
                      <ChevronDown
                        size={18}
                        className="shrink-0 text-stone-400 transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <div className="mt-3 text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed pl-1">
                      {a}
                    </div>
                  </details>
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
                  className="group flex flex-col justify-between p-4 rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 hover:border-accent-400 dark:hover:border-accent-500 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-200 min-h-[104px] active:scale-[0.98]"
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
        <ShareResultModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          tool={tool}
          sharePayload={sharePayload}
        />
      </ToolShareContext.Provider>
      </div>

      <ToolsHomeFooter />
      </div>
    </div>
  );
}
