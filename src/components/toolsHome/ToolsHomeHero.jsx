import { Search, Sparkles } from 'lucide-react';
import { ResultRow } from './ToolCard';

export function ToolsHomeHero({ query, setQuery, setCategory, searchResults, addRecent, logEvent }) {
  return (
    <section className="orbit-enter mx-auto max-w-4xl px-1 py-7 sm:py-10">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">
          <Sparkles size={14} aria-hidden="true" /> Free online tools for everyday work
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 sm:text-5xl">
          Find the right tool. <span className="text-violet-700">Get it done.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600 sm:text-base">
          Convert files, run calculations and get everyday work done in seconds.
        </p>
        <div className="relative mx-auto mt-6 max-w-2xl">
          <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100">
            <Search size={21} className="shrink-0 text-stone-500" aria-hidden="true" />
            <label htmlFor="tool-search" className="sr-only">Search online tools</label>
            <input id="tool-search" value={query} onChange={e => { setQuery(e.target.value); setCategory(null); }} placeholder="Search tools, e.g. PDF, salary, image…" className="w-full border-0 bg-transparent text-base text-stone-900 outline-none placeholder:text-stone-400 focus:ring-0" />
            {query && <button type="button" onClick={() => setQuery('')} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-900">Clear</button>}
          </div>
          {query && <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-stone-200 bg-white p-2 text-left shadow-xl">
            <div className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-stone-500">{searchResults.length ? 'Matching tools' : 'No direct match yet'}</div>
            {searchResults.map(tool => <ResultRow key={tool.slug} tool={tool} onUse={addRecent} />)}
            {!searchResults.length && <div className="px-3 py-5 text-sm text-stone-500">Try salary, EMI, PDF, Excel, JSON or image.</div>}
          </div>}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-xs text-stone-500">Popular searches</span>
          {['Salary in hand', 'EMI', 'PDF', 'JSON', 'Image'].map(example => <button key={example} type="button" onClick={() => { setQuery(example); setCategory(null); logEvent('search.suggestion_used', { suggestion: example }); }} className="min-h-9 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800">{example}</button>)}
        </div>
      </div>
    </section>
  );
}
