import { Search, Sparkles } from 'lucide-react';
import { ResultRow } from './ToolCard';
import { OrbitNode } from './ToolVisual';

const heroImage = '/images/orbitboard-hero.svg';

export function ToolsHomeHero({
  query,
  setQuery,
  setCategory,
  searchResults,
  addRecent,
  logEvent
}) {
  return (
    <div className="relative py-10 sm:py-12 overflow-hidden rounded-b-[2.5rem]">
      <img src={heroImage} alt="" aria-hidden="true" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/95 via-slate-950/90 to-slate-950" aria-hidden="true" />
      <div className="relative z-10 w-full">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-400">
              <Sparkles size={14} /> Practical tools, one place
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/70 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              <span aria-hidden="true">🔒</span> Private · Secure · Free
            </div>
          </div>
          <h1 className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight">
            What do you need to <span className="text-violet-400">get done?</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg leading-7 text-slate-400">
            Tell OrbitBoard what you are trying to do. We’ll take you straight to the right tool.
          </p>

          <div className="mt-8 relative max-w-2xl mx-auto">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 shadow-2xl shadow-violet-200/40 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/10">
              <Search size={22} className="text-slate-500 shrink-0" aria-hidden="true" />
              <label htmlFor="tool-search" className="sr-only">Describe what you need</label>
              <input
                id="tool-search"
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
              <button key={example} type="button" onClick={() => { setQuery(example); logEvent('search.suggestion_used', { suggestion: example }); }} className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-400 hover:border-violet-500/40 hover:text-violet-400">
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
