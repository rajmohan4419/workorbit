import { Search, Sparkles } from 'lucide-react';
import { ResultRow } from './ToolCard';

export function ToolsHomeHero({ query, setQuery, setCategory, searchResults, addRecent, logEvent }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--orbit-border)] bg-white px-5 py-12 sm:px-10 sm:py-16 lg:py-20 shadow-sm orbit-enter">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-100/80 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-amber-100/70 blur-3xl" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-[var(--orbit-accent)]">
          <Sparkles size={14} /> Practical tools, one place
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-stone-900 sm:text-6xl lg:text-7xl">
          What do you need to <span className="text-[var(--orbit-accent)]">get done?</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
          Describe the task. Find the right tool without digging through menus.
        </p>
        <div className="relative mx-auto mt-8 max-w-2xl">
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4 shadow-sm focus-within:border-[var(--orbit-accent)] focus-within:ring-2 focus-within:ring-violet-200">
            <Search size={22} className="shrink-0 text-stone-500" aria-hidden="true" />
            <label htmlFor="tool-search" className="sr-only">Describe what you need</label>
            <input id="tool-search" value={query} onChange={e => { setQuery(e.target.value); setCategory(null); }} placeholder="e.g. I need my salary in hand" className="w-full bg-transparent text-stone-900 outline-none placeholder:text-stone-400" />
            {query && <button type="button" onClick={() => setQuery('')} className="text-xs font-semibold text-stone-500 hover:text-stone-900">Clear</button>}
          </div>
          {query && <div className="absolute z-20 mt-3 w-full rounded-2xl border border-stone-200 bg-white p-3 text-left shadow-xl">
            <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">{searchResults.length ? 'Matching tools' : 'No direct match yet'}</div>
            {searchResults.map(tool => <ResultRow key={tool.slug} tool={tool} onUse={addRecent} />)}
            {!searchResults.length && <div className="px-2 py-6 text-center text-sm text-stone-500">Try salary, EMI, PDF, Excel, JSON or image.</div>}
          </div>}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {['Salary in hand', 'EMI', 'Format JSON', 'Convert Excel', 'Resize image'].map(example => <button key={example} type="button" onClick={() => { setQuery(example); logEvent('search.suggestion_used', { suggestion: example }); }} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-violet-300 hover:text-[var(--orbit-accent)]">{example}</button>)}
        </div>
      </div>
    </section>
  );
}
