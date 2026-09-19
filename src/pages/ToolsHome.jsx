import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BriefcaseBusiness, Calculator, ChevronLeft, Code2, Coins,
  Clock3, Search, Sparkles, Star, WandSparkles
} from 'lucide-react';
import { TOOLS, TOOL_CONTENT } from '../data/tools';

const categories = ['Career', 'Finance', 'Everyday', 'Developer'];

const categoryMeta = {
  Career: {
    icon: BriefcaseBusiness,
    label: 'Career & Salary',
    description: 'Salary, offers, notice periods and career decisions.',
    examples: ['12 LPA in hand', 'Compare offers', 'Calculate hike']
  },
  Finance: {
    icon: Coins,
    label: 'Money & Finance',
    description: 'Loans, GST, investments and everyday money math.',
    examples: ['EMI for 10 lakh', 'Calculate GST', 'Estimate SIP']
  },
  Everyday: {
    icon: Calculator,
    label: 'Everyday',
    description: 'Converters and practical file utilities.',
    examples: ['Convert PDF', 'Resize image', 'Convert CSV']
  },
  Developer: {
    icon: Code2,
    label: 'Developer Tools',
    description: 'Fast browser utilities for data and technical work.',
    examples: ['Format JSON', 'Decode JWT', 'Convert JSON']
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

export default function ToolsHome() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbitboard:favorites') || '[]'); } catch { return []; }
  });
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbitboard:recent') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('orbitboard:favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('orbitboard:recent', JSON.stringify(recent)); }, [recent]);

  const toggleFavorite = (slug) => setFavorites(prev => prev.includes(slug) ? prev.filter(x => x !== slug) : [slug, ...prev]);
  const addRecent = (slug) => setRecent(prev => [slug, ...prev.filter(x => x !== slug)].slice(0, 6));

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const direct = TOOLS.filter(tool => {
      const info = TOOL_CONTENT[tool.slug];
      const haystack = [tool.name, tool.description, tool.category, info?.keywords || ''].join(' ').toLowerCase();
      return haystack.includes(q);
    });

    const intentSlugs = intentMap
      .filter(group => group.terms.some(term => q.includes(term)))
      .flatMap(group => group.slugs);

    const merged = [...intentSlugs.map(slug => TOOLS.find(t => t.slug === slug)), ...direct].filter(Boolean);
    return [...new Map(merged.map(tool => [tool.slug, tool])).values()].slice(0, 8);
  }, [query]);

  const categoryTools = useMemo(
    () => category ? TOOLS.filter(tool => tool.category === category).slice(0, 8) : [],
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
          <div className="text-xs font-medium text-slate-500">Free • No sign-up</div>
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

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {['Salary in hand', 'EMI', 'Format JSON', 'Convert Excel', 'Resize image'].map(example => (
                  <button key={example} type="button" onClick={() => setQuery(example)} className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-400 hover:border-violet-500/40 hover:text-violet-300">
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
                      <button
                        key={name}
                        type="button"
                        onClick={() => setCategory(name)}
                        className="group text-left rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:-translate-y-1 hover:border-violet-500/50 hover:bg-slate-900 transition"
                      >
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-300 flex items-center justify-center">
                          <Icon size={20} />
                        </div>
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
              <div className="mt-10 max-w-4xl mx-auto">
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
                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                  {categoryTools.map(tool => <ResultRow key={tool.slug} tool={tool} onUse={addRecent} favorite={favorites.includes(tool.slug)} onFavorite={toggleFavorite} />)}
                </div>
              </div>
            )}

            {showExplore && recentTools.length > 0 && (
              <div className="mt-10 max-w-4xl mx-auto">
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
        <div className="w-9 h-9 shrink-0 rounded-lg bg-violet-500/10 text-violet-300 flex items-center justify-center"><Icon size={17} /></div>
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
