import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BriefcaseBusiness, Calculator, ChevronLeft, Code2, Coins,
  Clock3, Search, Sparkles, Star, WandSparkles
} from 'lucide-react';
import { TOOLS, TOOL_CONTENT } from '../data/tools';
import { logEvent } from '../lib/telemetry';

const categories = ['Career', 'Finance', 'Everyday', 'Developer'];

const categoryMeta = {
  Career: {
    icon: BriefcaseBusiness,
    label: 'Career & Salary',
    description: 'Salary, offers, notice periods and career decisions.'
  },
  Finance: {
    icon: Coins,
    label: 'Money & Finance',
    description: 'Loans, GST, investments and everyday money math.'
  },
  Everyday: {
    icon: Calculator,
    label: 'Everyday',
    description: 'Converters and practical file utilities.'
  },
  Developer: {
    icon: Code2,
    label: 'Developer Tools',
    description: 'Fast browser utilities for data and technical work.'
  }
};

const intentMap = [
  { terms: ['salary', 'ctc', 'in hand', 'take home', 'take-home', 'hike', 'increment', 'offer', 'notice', 'experience'], slugs: ['ctc-to-inhand', 'salary-hike', 'offer-comparison', 'notice-period', 'experience'] },
  { terms: ['emi', 'loan', 'interest', 'gst', 'sip', 'investment'], slugs: ['emi', 'gst', 'sip'] },
  { terms: ['json', 'jwt', 'base64', 'xml', 'markdown', 'timestamp', 'uuid', 'url', 'developer', 'api'], slugs: ['json-formatter', 'jwt-decoder', 'base64', 'json-to-csv', 'json-to-xml', 'xml-to-json', 'markdown-to-html', 'unix-timestamp', 'uuid-generator', 'url-encoder'] },
  { terms: ['csv', 'xlsx', 'excel', 'spreadsheet'], slugs: ['csv-to-xlsx', 'xlsx-to-csv', 'json-to-xlsx', 'csv-to-pdf', 'csv-to-json'] },
  { terms: ['pdf', 'document'], slugs: ['pdf-workspace', 'pdf-merge', 'pdf-split', 'pdf-to-text', 'pdf-to-jpg', 'pdf-to-png', 'image-to-pdf', 'txt-to-pdf', 'pdf-compressor'] },
  { terms: ['image', 'jpg', 'jpeg', 'png', 'webp', 'photo', 'picture'], slugs: ['jpg-to-png', 'png-to-jpg', 'webp-to-jpg', 'image-resizer', 'image-compressor', 'image-metadata-remover', 'svg-to-png'] },
  { terms: ['convert', 'converter'], slugs: ['length-converter', 'weight-converter', 'temperature-converter', 'time-converter'] },
  { terms: ['percentage', 'percent', '%'], slugs: ['percentage'] }
];

const visualKind = (slug) => {
  if (['ctc-to-inhand', 'salary-hike', 'offer-comparison', 'notice-period', 'experience'].includes(slug)) return 'career';
  if (['emi', 'gst', 'sip'].includes(slug)) return 'finance';
  if (['json-formatter', 'json-to-csv', 'json-to-xml', 'xml-to-json', 'markdown-to-html', 'base64', 'jwt-decoder', 'unix-timestamp', 'uuid-generator', 'url-encoder', 'diff-checker'].includes(slug)) return 'code';
  if (slug.includes('xlsx') || slug.includes('csv')) return 'sheet';
  if (slug.includes('pdf') || slug === 'txt-to-pdf') return 'pdf';
  if (slug.includes('image') || ['jpg-to-png', 'png-to-jpg', 'webp-to-jpg', 'svg-to-png'].includes(slug)) return 'image';
  if (slug.includes('converter') || slug === 'percentage') return 'convert';
  return 'tool';
};

export default function ToolsHome() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbitboard:favorites') || '[]'); } catch { return []; }
  });
  const [visitorCount, setVisitorCount] = useState(null);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbitboard:recent') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('orbitboard:favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const handleCount = (event) => {
      if (typeof event.detail === 'number' && Number.isFinite(event.detail)) setVisitorCount(event.detail);
    };
    window.addEventListener('orbitboard:visitor-count', handleCount);
    return () => window.removeEventListener('orbitboard:visitor-count', handleCount);
  }, []);
  useEffect(() => { localStorage.setItem('orbitboard:recent', JSON.stringify(recent)); }, [recent]);

  const toggleFavorite = (slug) => setFavorites(prev => prev.includes(slug) ? prev.filter(x => x !== slug) : [slug, ...prev]);
  const addRecent = (slug) => {
    setRecent(prev => [slug, ...prev.filter(x => x !== slug)].slice(0, 6));
    logEvent('tool.opened', { tool: slug });
  };
  const chooseCategory = (name) => {
    setCategory(name);
    logEvent('category.explored', { category: name });
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const direct = TOOLS.filter(tool => {
      const info = TOOL_CONTENT[tool.slug];
      const haystack = [tool.name, tool.description, tool.category, info?.keywords || ''].join(' ').toLowerCase();
      return haystack.includes(q);
    });
    const intentSlugs = intentMap.filter(group => group.terms.some(term => q.includes(term))).flatMap(group => group.slugs);
    const merged = [...intentSlugs.map(slug => TOOLS.find(t => t.slug === slug)), ...direct].filter(Boolean);
    return [...new Map(merged.map(tool => [tool.slug, tool])).values()].slice(0, 8);
  }, [query]);

  const categoryTools = useMemo(
    () => category ? TOOLS.filter(tool => tool.category === category).slice(0, 10) : [],
    [category]
  );

  const recentTools = recent.map(slug => TOOLS.find(t => t.slug === slug)).filter(Boolean).slice(0, 4);
  const showExplore = !query.trim() && !category;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" aria-label="OrbitBoard home" className="text-xl font-black tracking-tight text-white">
            ORBIT<span className="text-violet-400">BOARD</span>
          </Link>
          <div className="flex items-center gap-3">
            {visitorCount !== null && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-500" title="Unique visitors recorded by OrbitBoard">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                {visitorCount.toLocaleString()} visitors
              </div>
            )}
            <div className="text-xs font-medium text-slate-500">Free • No sign-up</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <section className="min-h-[calc(100vh-64px)] flex items-center py-12 sm:py-16">
          <div className="w-full">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300">
                <Sparkles size={14} /> Practical tools, one place
              </div>
              <h1 className="mt-6 text-4xl sm:text-6xl font-black tracking-tight">
                What do you need to <span className="text-violet-400">get done?</span>
              </h1>
              <p className="mt-5 text-base sm:text-lg leading-7 text-slate-400">
                Tell OrbitBoard what you are trying to do. We’ll take you straight to the right tool.
              </p>

              <div className="mt-8 relative max-w-2xl mx-auto">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 shadow-2xl shadow-violet-950/20 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20">
                  <Search size={22} className="text-slate-500 shrink-0" aria-hidden="true" />
                  <label htmlFor="tool-search" className="sr-only">Describe what you need</label>
                  <input
                    id="tool-search"
                    autoFocus
                    value={query}
                    onChange={e => { setQuery(e.target.value); setCategory(null); }}
                    placeholder="e.g. “I need my salary in hand”"
                    className="w-full bg-transparent outline-none text-base placeholder:text-slate-600"
                  />
                  {query && <button type="button" onClick={() => setQuery('')} className="text-xs text-slate-500 hover:text-white">Clear</button>}
                </div>

                {query && (
                  <div className="absolute z-20 mt-3 w-full rounded-2xl border border-slate-800 bg-slate-900 p-3 text-left shadow-2xl">
                    <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {searchResults.length ? 'We found these tools' : 'No direct match yet'}
                    </div>
                    {searchResults.map(tool => <ResultRow key={tool.slug} tool={tool} onUse={addRecent} />)}
                    {!searchResults.length && (
                      <div className="px-2 py-6 text-center text-sm text-slate-500">
                        Try “salary”, “EMI”, “PDF”, “Excel”, “JSON” or “image”.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 relative h-10 hidden sm:block" aria-hidden="true">
                <div className="absolute left-1/2 top-1/2 h-px w-72 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                <OrbitNode className="left-[12%] top-0" label="Salary" />
                <OrbitNode className="left-[30%] top-5" label="JSON" />
                <OrbitNode className="right-[30%] top-5" label="EMI" />
                <OrbitNode className="right-[12%] top-0" label="PDF" />
              </div>

              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {['Salary in hand', 'EMI', 'Format JSON', 'Convert Excel', 'Resize image'].map(example => (
                  <button key={example} type="button" onClick={() => { setQuery(example); logEvent('search.suggestion_used', { suggestion: example }); }} className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-400 hover:border-violet-500/40 hover:text-violet-300">
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {!query && (
              <div className="mt-14 max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-slate-600">
                  <WandSparkles size={14} /> Explore by intent
                </div>
                <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {categories.map(name => {
                    const meta = categoryMeta[name];
                    const Icon = meta.icon;
                    return (
                      <button key={name} type="button" onClick={() => chooseCategory(name)} className="group text-left rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:-translate-y-1 hover:border-violet-500/50 hover:bg-slate-900 transition">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-300 flex items-center justify-center"><Icon size={20} /></div>
                        <h2 className="mt-4 font-bold text-white group-hover:text-violet-300">{meta.label}</h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{meta.description}</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-400">Explore <ArrowRight size={13} /></span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {category && !query && (
              <div className="mt-10 max-w-5xl mx-auto">
                <button type="button" onClick={() => setCategory(null)} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-white">
                  <ChevronLeft size={16} /> All areas
                </button>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Explore</p>
                    <h2 className="mt-1 text-2xl font-black">{categoryMeta[category].label}</h2>
                  </div>
                  <span className="text-xs text-slate-600">{categoryTools.length} shown</span>
                </div>
                <div className="mt-5 grid sm:grid-cols-2 gap-4">
                  {categoryTools.map(tool => <ToolCard key={tool.slug} tool={tool} onUse={addRecent} favorite={favorites.includes(tool.slug)} onFavorite={toggleFavorite} />)}
                </div>
              </div>
            )}

            {showExplore && recentTools.length > 0 && (
              <div className="mt-10 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <Clock3 size={14} /> Continue where you left off
                  </div>
                  <span className="text-xs text-slate-700">{recentTools.length} recent</span>
                </div>
                <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {recentTools.map(tool => <ResultRow key={tool.slug} tool={tool} onUse={addRecent} compact />)}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-slate-900 py-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Still exploring?</p>
              <h2 className="mt-1 text-xl font-bold">Every tool, when you need it.</h2>
            </div>
            <Link to="/tools" className="text-sm font-semibold text-violet-400 hover:text-violet-300">Open full catalogue <ArrowRight size={15} className="inline ml-1" /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-900 py-8 text-center text-sm text-slate-600">
        OrbitBoard • Practical tools for work & life
      </footer>
    </div>
  );
}

function ResultRow({ tool, onUse, compact = false, favorite = false, onFavorite }) {
  const Icon = categoryMeta[tool.category]?.icon || Calculator;
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 hover:border-violet-500/40">
      <Link to={`/tools/${tool.slug}`} onClick={() => onUse(tool.slug)} className="min-w-0 flex-1 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-lg">
        <ToolVisual tool={tool} compact />
        <div className="min-w-0">
          <div className="font-semibold text-sm text-white group-hover:text-violet-300 truncate">{tool.name}</div>
          {!compact && <div className="mt-0.5 text-xs text-slate-500 truncate">{tool.description}</div>}
        </div>
        <ArrowRight size={15} className="shrink-0 text-slate-600 group-hover:text-violet-400" />
      </Link>
      {onFavorite && (
        <button type="button" aria-label={favorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`} aria-pressed={favorite} onClick={() => onFavorite(tool.slug)} className="rounded-lg p-2 text-slate-600 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-violet-500">
          <Star size={15} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      )}
    </div>
  );
}

function ToolCard({ tool, favorite, onFavorite, onUse }) {
  return (
    <Link to={`/tools/${tool.slug}`} onClick={() => onUse(tool.slug)} className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 hover:-translate-y-1 hover:border-violet-500/60 hover:bg-slate-900 transition focus:outline-none focus:ring-2 focus:ring-violet-500">
      <ToolVisual tool={tool} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">{tool.category}</span>
            <h2 className="mt-1 text-lg font-bold group-hover:text-violet-300">{tool.name}</h2>
          </div>
          <button type="button" aria-label={favorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`} aria-pressed={favorite} onClick={e => { e.preventDefault(); e.stopPropagation(); onFavorite(tool.slug); }} className="rounded-lg p-2 text-slate-500 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-violet-500">
            <Star size={17} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">{tool.description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-400">Use tool <ArrowRight size={15} /></span>
      </div>
    </Link>
  );
}

function ToolVisual({ tool, compact = false }) {
  const kind = visualKind(tool.slug);
  const height = compact ? 'h-11 w-14' : 'h-36 w-full';
  const label = tool.icon;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 ${height}`} aria-hidden="true">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,.35),transparent_35%)]" />
      <svg viewBox="0 0 320 150" className="relative h-full w-full" fill="none">
        {kind === 'career' && <>
          <rect x="35" y="28" width="150" height="96" rx="12" fill="rgba(15,23,42,.9)" stroke="rgba(167,139,250,.45)" />
          <rect x="54" y="46" width="55" height="8" rx="4" fill="rgba(167,139,250,.7)" />
          <rect x="54" y="65" width="92" height="6" rx="3" fill="rgba(148,163,184,.35)" />
          <rect x="54" y="80" width="72" height="6" rx="3" fill="rgba(148,163,184,.25)" />
          <circle cx="238" cy="72" r="38" fill="rgba(124,58,237,.18)" stroke="rgba(167,139,250,.6)" />
          <text x="238" y="84" textAnchor="middle" fontSize="34" fontWeight="800" fill="#c4b5fd">₹</text>
          <path d="M205 116 L230 102 L251 110 L284 82" stroke="#34d399" strokeWidth="5" strokeLinecap="round" />
        </>}
        {kind === 'finance' && <>
          <rect x="38" y="34" width="244" height="82" rx="16" fill="rgba(15,23,42,.92)" stroke="rgba(167,139,250,.45)" />
          <text x="58" y="65" fontSize="12" fill="#94a3b8">ESTIMATE</text>
          <text x="58" y="94" fontSize="27" fontWeight="800" fill="#f8fafc">₹ 12,500</text>
          <path d="M196 96 C216 68 235 86 253 60 C262 48 272 48 280 40" stroke="#a78bfa" strokeWidth="5" strokeLinecap="round" />
        </>}
        {kind === 'code' && <>
          <rect x="38" y="25" width="244" height="100" rx="14" fill="rgba(2,6,23,.95)" stroke="rgba(56,189,248,.35)" />
          <circle cx="58" cy="43" r="4" fill="#fb7185" /><circle cx="72" cy="43" r="4" fill="#fbbf24" /><circle cx="86" cy="43" r="4" fill="#34d399" />
          <text x="58" y="72" fontFamily="monospace" fontSize="17" fill="#c4b5fd">{label === '{}' ? '{ }' : label}</text>
          <path d="M58 92 H177 M58 106 H143" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
        </>}
        {kind === 'sheet' && <>
          <rect x="62" y="20" width="196" height="112" rx="10" fill="rgba(15,23,42,.94)" stroke="rgba(52,211,153,.45)" />
          {[0,1,2,3].map(i => <path key={i} d={`M62 ${48+i*21} H258`} stroke="rgba(71,85,105,.65)" />)}
          {[0,1,2,3,4].map(i => <path key={i} d={`M${101+i*39} 20 V132`} stroke="rgba(71,85,105,.65)" />)}
          <rect x="102" y="49" width="38" height="20" fill="rgba(52,211,153,.22)" />
          <rect x="141" y="70" width="38" height="20" fill="rgba(167,139,250,.18)" />
        </>}
        {kind === 'pdf' && <>
          <path d="M98 18 H197 L231 52 V132 H98 Z" fill="rgba(15,23,42,.95)" stroke="rgba(248,113,113,.45)" strokeWidth="2" />
          <path d="M197 18 V53 H231" stroke="rgba(248,113,113,.45)" strokeWidth="2" />
          <text x="115" y="86" fontSize="25" fontWeight="800" fill="#fca5a5">PDF</text>
          <path d="M117 103 H209 M117 115 H190" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
        </>}
        {kind === 'image' && <>
          <rect x="44" y="27" width="232" height="98" rx="14" fill="rgba(15,23,42,.9)" stroke="rgba(96,165,250,.45)" />
          <circle cx="103" cy="58" r="13" fill="rgba(250,204,21,.8)" />
          <path d="M59 111 L118 74 L153 99 L190 68 L261 111 Z" fill="rgba(96,165,250,.28)" stroke="rgba(96,165,250,.7)" />
          <text x="214" y="52" textAnchor="middle" fontSize="12" fill="#bfdbfe">{label}</text>
        </>}
        {kind === 'convert' && <>
          <rect x="43" y="43" width="86" height="58" rx="12" fill="rgba(15,23,42,.95)" stroke="rgba(167,139,250,.45)" />
          <rect x="191" y="43" width="86" height="58" rx="12" fill="rgba(15,23,42,.95)" stroke="rgba(167,139,250,.45)" />
          <path d="M137 61 H183 M183 61 L173 53 M183 61 L173 69" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M183 83 H137 M137 83 L147 75 M137 83 L147 91" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="86" y="78" textAnchor="middle" fontSize="15" fontWeight="700" fill="#c4b5fd">{label}</text>
          <text x="234" y="78" textAnchor="middle" fontSize="15" fontWeight="700" fill="#a7f3d0">NEW</text>
        </>}
        {kind === 'tool' && <>
          <circle cx="160" cy="75" r="48" fill="rgba(124,58,237,.15)" stroke="rgba(167,139,250,.5)" />
          <text x="160" y="86" textAnchor="middle" fontSize="28" fontWeight="800" fill="#c4b5fd">{label}</text>
        </>}
      </svg>
      {!compact && <div className="absolute bottom-3 left-4 rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold text-slate-300 backdrop-blur">{tool.category}</div>}
    </div>
  );
}

function OrbitNode({ label, className }) {
  return <span className={`absolute inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[10px] font-semibold text-slate-500 backdrop-blur ${className}`}><span className="h-1.5 w-1.5 rounded-full bg-violet-400" />{label}</span>;
}
