import { Link, useParams } from 'react-router-dom';
import { lazy, useEffect, useMemo, useState, useRef } from 'react';
import { 
  ArrowRight, Share2, RotateCcw, Maximize2, Star, ChevronRight, 
  ChevronDown, Coins, BriefcaseBusiness, Code2, Calculator, TrendingUp 
} from 'lucide-react';
import { TOOLS, LISTED_TOOLS } from '../data/toolCatalog';
import { TOOL_CONTENT } from '../data/toolContent';
import { ComingSoon } from '../components/tools/ToolFields';
import { CompoundInterest, FdMaturity, RdMaturity, LoanAmortization, HraExemption } from '../tools/finance/FinanceCalculators';
import { SaasRetention, SalesPipelineForecaster, SaasPricing } from '../tools/business/BusinessCalculators';
import { InvoiceAging, DecisionMatrix } from '../tools/business/BusinessWorkflows';
import { GstInvoice } from '../tools/business/GstInvoice';
import { GifMaker } from '../tools/everyday/GifMaker';
import { ImageToGif, VideoToGif } from '../tools/media/GifTools';
import SampleAd from '../components/SampleAd';
import { isAdEligible, loadAdSense } from '../lib/adsense';
import AdSenseUnit from '../components/AdSenseUnit';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';
import { QuickAccessLeftSidebar } from '../components/layout/QuickAccessLeftSidebar';

// Extracted Modular Tool Packages
import { SalaryCalculator, SalaryHike, Offer, Notice, Experience } from '../tools/career/CareerTools';
import { Emi, Gst, Sip } from '../tools/finance/FinanceTools';
import {
  PasswordGenerator, JsonFormatter, JsonToCsv, Base64Tool, JwtDecoder,
  UnixTimestamp, UuidGenerator, UrlEncoder, DiffChecker, JsonToXml,
  XmlToJson, MarkdownToHtml
} from '../tools/developer/DeveloperTools';
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

const GratuityCalculator = lazy(() => import('../tools/career/GratuityCalculator'));
const IndiaIncomeTaxCalculator = lazy(() => import('../tools/finance/IndiaIncomeTaxCalculator'));
const GlobalIncomeTaxCalculator = lazy(() => import('../tools/finance/GlobalIncomeTaxCalculator'));
const PdfESign = lazy(() => import('../tools/pdf/PdfESign'));
const GlobalTimeZoneConverter = lazy(() => import('../tools/GlobalTimeZoneConverter'));

function ToolHeaderStrip({ tool, info, workspaceRef }) {
  const [shared, setShared] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  const categoryOptions = [
    { name: 'Finance', label: 'Finance & Money', icon: Coins, count: 11 },
    { name: 'Career', label: 'Career & Salary', icon: BriefcaseBusiness, count: 6 },
    { name: 'Developer', label: 'Developer Tools', icon: Code2, count: 15 },
    { name: 'Everyday', label: 'Everyday Utilities', icon: Calculator, count: 27 },
    { name: 'Business', label: 'Business & SaaS', icon: TrendingUp, count: 7 },
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
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9160921653901381" crossOrigin="anonymous"></script>
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
