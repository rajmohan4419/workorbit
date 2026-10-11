import { useMemo, useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Calculator, Code2, Coins, Search } from 'lucide-react';
import { TOOLS } from '../data/toolCatalog';
import { preloadToolPage } from '../lib/toolPageLoader';

const categories = [
  { name: 'All', label: 'All utilities', icon: Search },
  { name: 'Career', label: 'Career & Salary', icon: BriefcaseBusiness },
  { name: 'Finance', label: 'Money & Finance', icon: Coins },
  { name: 'Everyday', label: 'Everyday Utilities', icon: Calculator },
  { name: 'Developer', label: 'Developer Tools', icon: Code2 }
];

export default function ToolsCatalogue() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || searchParams.get('search');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  const filteredTools = useMemo(() => TOOLS.filter(tool => {
    const categoryMatch = category === 'All' || tool.category === category;
    const haystack = `${tool.name} ${tool.description} ${tool.slug}`.toLowerCase();
    return categoryMatch && haystack.includes(query.trim().toLowerCase());
  }), [category, query]);

  if (q) return <Navigate to={`/?q=${encodeURIComponent(q)}`} replace />;

  return (
    <div className="orbit-light min-h-screen bg-[#fbf8f3] text-stone-800">
      <header className="sticky top-0 z-30 border-b border-[#e7dfd3] bg-[#fbf8f3]/95 backdrop-blur">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight text-stone-900" aria-label="OrbitBoard home">
            ORBIT<span className="text-violet-600">BOARD</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-violet-700">
            <ArrowLeft size={15} /> Back home
          </Link>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="orbit-enter max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-violet-700">OrbitBoard catalogue</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight text-stone-900">Every tool, when you need it.</h1>
          <p className="mt-4 text-base leading-7 text-stone-600">A calmer, organised workspace for work, money, everyday tasks and developer workflows.</p>
        </div>

        <section className="orbit-card-enter mt-8 rounded-2xl border border-[#e7dfd3] bg-white p-4 sm:p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,.7fr)_minmax(0,1.3fr)]">
            <label className="flex flex-col gap-2 text-sm font-semibold text-stone-700">
              Browse category
              <select value={category} onChange={e => setCategory(e.target.value)} className="h-12 rounded-xl border border-[#ddd3c5] bg-[#fffdfa] px-3 text-stone-800 outline-none focus:ring-2 focus:ring-violet-300">
                {categories.map(item => <option key={item.name} value={item.name}>{item.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-stone-700">
              Find a utility
              <span className="flex h-12 items-center gap-2 rounded-xl border border-[#ddd3c5] bg-[#fffdfa] px-3 focus-within:ring-2 focus-within:ring-violet-300">
                <Search size={17} className="text-stone-400" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or purpose…" className="min-w-0 flex-1 bg-transparent text-stone-800 outline-none placeholder:text-stone-400" />
              </span>
            </label>
          </div>
          <p className="mt-3 text-xs text-stone-500">{filteredTools.length} utilities shown</p>
        </section>

        <section className="orbit-enter mt-6 overflow-hidden rounded-2xl border border-[#e7dfd3] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead className="bg-[#f4efe7] text-xs uppercase tracking-wider text-stone-600">
                <tr><th className="px-5 py-4 font-bold">Utility</th><th className="px-5 py-4 font-bold">Category</th><th className="px-5 py-4 font-bold">What it does</th><th className="px-5 py-4"></th></tr>
              </thead>
              <tbody>
                {filteredTools.map((tool, index) => (
                  <tr key={tool.slug} className="orbit-interactive border-t border-[#eee7de] hover:bg-[#fffdfa]" style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}>
                    <td className="px-5 py-4"><Link to={`/tools/${tool.slug}`} onMouseEnter={preloadToolPage} onFocus={preloadToolPage} className="font-semibold text-stone-900 hover:text-violet-700">{tool.name}</Link></td>
                    <td className="px-5 py-4"><span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{tool.category}</span></td>
                    <td className="max-w-xl px-5 py-4 text-sm leading-6 text-stone-600">{tool.description}</td>
                    <td className="px-5 py-4"><Link aria-label={`Open ${tool.name}`} to={`/tools/${tool.slug}`} onMouseEnter={preloadToolPage} className="inline-flex rounded-lg p-2 text-violet-700 hover:bg-violet-50"><ArrowRight size={17}/></Link></td>
                  </tr>
                ))}
                {!filteredTools.length && <tr><td colSpan="4" className="px-5 py-12 text-center text-sm text-stone-500">No utilities match that search. Try another term or category.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="mt-12 border-t border-[#e7dfd3] py-8 text-center text-sm text-stone-500">OrbitBoard · Practical tools for work & life</footer>
    </div>
  );
}
