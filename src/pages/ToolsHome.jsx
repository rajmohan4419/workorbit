import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Calculator, Code2, Coins, ArrowRight, Sparkles, Search, Star, Clock3 } from 'lucide-react';
import { TOOLS, TOOL_CONTENT } from '../data/tools';

const categories = ['All', 'Career', 'Finance', 'Everyday', 'Developer'];
const categoryMeta = {
  Career: { icon: BriefcaseBusiness, label: 'Career & Salary', description: 'Make clearer decisions about salary, offers and your next move.' },
  Finance: { icon: Coins, label: 'Money & Finance', description: 'Quick estimates for loans, taxes, investments and everyday money.' },
  Everyday: { icon: Calculator, label: 'Everyday', description: 'Small calculations that save a little time every day.' },
  Developer: { icon: Code2, label: 'Developer Tools', description: 'Fast browser-based utilities for developers and technical work.' }
};

export default function ToolsHome() {
  const [category,setCategory]=useState('All');
  const [query,setQuery]=useState('');
  const [favorites,setFavorites]=useState(()=>{try{return JSON.parse(localStorage.getItem('orbitboard:favorites')||'[]')}catch{return []}});
  const [recent,setRecent]=useState(()=>{try{return JSON.parse(localStorage.getItem('orbitboard:recent')||'[]')}catch{return []}});
  const [view,setView]=useState('all');
  useEffect(()=>{localStorage.setItem('orbitboard:favorites',JSON.stringify(favorites))},[favorites]);
  useEffect(()=>{localStorage.setItem('orbitboard:recent',JSON.stringify(recent))},[recent]);
  const toggleFavorite=(slug)=>setFavorites(prev=>prev.includes(slug)?prev.filter(x=>x!==slug):[...prev,slug]);
  const addRecent=(slug)=>setRecent(prev=>[slug,...prev.filter(x=>x!==slug)].slice(0,6));
  const filtered=useMemo(()=>TOOLS.filter(t=>{
    const q=query.trim().toLowerCase();
    if(category!=='All'&&t.category!==category) return false;
    if(!q) return true;
    const info=TOOL_CONTENT[t.slug];
    const haystack=[t.name,t.description,t.category,info?.keywords||''].join(' ').toLowerCase();
    return haystack.includes(q);
  }),[category,query]);
  const popularSlugs=['ctc-to-inhand','salary-hike','offer-comparison','emi','json-formatter','jwt-decoder'];
  const popularTools=popularSlugs.map(slug=>TOOLS.find(t=>t.slug===slug)).filter(Boolean);
  const visibleTools=useMemo(()=>{let list=filtered;if(view==='favorites')list=list.filter(t=>favorites.includes(t.slug));if(view==='recent')list=list.filter(t=>recent.includes(t.slug)).sort((a,b)=>recent.indexOf(a.slug)-recent.indexOf(b.slug));return list},[filtered,view,favorites,recent]);
  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" aria-label="OrbitBoard home" className="text-xl font-black tracking-tight text-white">ORBIT<span className="text-violet-400">BOARD</span></Link>
        <a href="#tools" className="text-sm font-medium text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-lg px-3 py-2">Browse tools</a>
      </div>
    </header>
    <main>
      <section className="relative overflow-hidden border-b border-slate-800/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(139,92,246,.18),transparent_32%)]" aria-hidden="true"/>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-[1.1fr_.9fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300"><Sparkles size={14}/> Free • No sign-up</div>
            <h1 className="mt-6 text-4xl sm:text-6xl font-black tracking-tight max-w-3xl">Useful tools for work, money and everyday life.</h1>
            <p className="mt-5 text-lg sm:text-xl leading-8 text-slate-400 max-w-2xl">Calculate, convert and compare without creating an account. Built for people who just need the answer.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a href="#tools" className="inline-flex justify-center items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300">Explore tools <ArrowRight size={18}/></a>
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 flex-1 max-w-md"><Search size={18} className="text-slate-500" aria-hidden="true"/><label htmlFor="tool-search" className="sr-only">Search tools</label><input id="tool-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a tool..." className="w-full bg-transparent outline-none text-sm placeholder:text-slate-600"/></div>
            </div>
          </div>
          <div className="hidden lg:block" aria-hidden="true">
            <div className="relative mx-auto max-w-md aspect-square rounded-[2rem] border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
              <div className="absolute -top-5 -right-5 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4"><Code2 className="text-violet-300" size={28}/></div>
              <div className="h-full rounded-2xl border border-slate-800 bg-slate-950 p-6 font-mono text-sm text-slate-400">
                <p className="text-violet-300">orbitboard.tools()</p><p className="mt-4">→ salary</p><p>→ finance</p><p>→ developer</p><p>→ everyday</p><p className="mt-4 text-emerald-400">✓ answer found</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section aria-labelledby="popular-heading" className="max-w-7xl mx-auto px-4 sm:px-6 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Start here</p><h2 id="popular-heading" className="mt-2 text-2xl sm:text-3xl font-black">Popular tools</h2><p className="mt-2 text-sm text-slate-500">Quick access to tools people are most likely to need.</p></div>
          <a href="#tools" className="hidden sm:inline text-sm font-semibold text-violet-400 hover:text-violet-300">Browse all <ArrowRight size={15} className="inline ml-1"/></a>
        </div>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularTools.map(tool=><ToolCard key={tool.slug} tool={tool} favorite={favorites.includes(tool.slug)} onFavorite={toggleFavorite} onUse={addRecent} compact/>)}
        </div>
      </section>
      <section id="tools" className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tool views">
          <button type="button" onClick={()=>setView('all')} className={view==='all'?'rounded-full px-4 py-2 text-sm font-medium border border-violet-500 bg-violet-500/15 text-violet-200':'rounded-full px-4 py-2 text-sm font-medium border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}><Calculator size={15} className="inline mr-2"/>All tools</button>
          <button type="button" onClick={()=>setView('recent')} className={view==='recent'?'rounded-full px-4 py-2 text-sm font-medium border border-violet-500 bg-violet-500/15 text-violet-200':'rounded-full px-4 py-2 text-sm font-medium border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}><Clock3 size={15} className="inline mr-2"/>Recently used</button>
          <button type="button" onClick={()=>setView('favorites')} className={view==='favorites'?'rounded-full px-4 py-2 text-sm font-medium border border-violet-500 bg-violet-500/15 text-violet-200':'rounded-full px-4 py-2 text-sm font-medium border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}><Star size={15} className="inline mr-2"/>Favorites {favorites.length>0&&'('+favorites.length+')'}</button>
          {categories.map(c=><button key={c} type="button" onClick={()=>setCategory(c)} role="tab" aria-selected={category===c} className={`rounded-full px-4 py-2 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-violet-500 ${category===c?'border-violet-500 bg-violet-500/15 text-violet-200':'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}`}>{c}</button>)}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500" aria-live="polite">{filtered.length} tool{filtered.length===1?'':'s'} available</p>
          {query&&<button type="button" onClick={()=>setQuery('')} className="text-sm font-medium text-violet-400 hover:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-lg px-2 py-1">Clear search</button>}
        </div>
        <section className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleTools.map(tool=><ToolCard key={tool.slug} tool={tool} favorite={favorites.includes(tool.slug)} onFavorite={toggleFavorite} onUse={addRecent}/>)}
        </section>
        {!visibleTools.length&&<div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center">
          <p className="text-base font-semibold text-slate-300">{view==='favorites'?'No favorite tools yet.':view==='recent'?'No recently used tools yet.':'No tools match “'+query+'”.'}</p>
          <p className="mt-2 text-sm text-slate-500">{view==='favorites'?'Star a tool to keep it here for your next visit.':view==='recent'?'Open any tool and it will appear here.':'Try a broader term such as salary, loan, JSON or percentage.'}</p>
          <button type="button" onClick={()=>{setQuery('');setCategory('All')}} className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-300">Show all tools</button>
        </div>}
      </section>
    </main>
    <footer className="border-t border-slate-900 py-10 text-center text-sm text-slate-600">OrbitBoard • Practical tools for work & life</footer>
  </div>
}
function ToolCard({tool,favorite,onFavorite,onUse,compact=false}) {
  const Icon=categoryMeta[tool.category]?.icon||Calculator;
  return <Link to={`/tools/${tool.slug}`} onClick={()=>onUse(tool.slug)} className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-6 hover:-translate-y-0.5 hover:border-violet-500/60 hover:bg-slate-900 transition focus:outline-none focus:ring-2 focus:ring-violet-500">
    <div className="flex items-start justify-between"><div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-300 flex items-center justify-center"><Icon size={21}/></div><button type="button" aria-label={favorite?`Remove ${tool.name} from favorites`:`Add ${tool.name} to favorites`} aria-pressed={favorite} onClick={e=>{e.preventDefault();e.stopPropagation();onFavorite(tool.slug)}} className="rounded-lg p-2 text-slate-500 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-violet-500"><Star size={17} fill={favorite?'currentColor':'none'}/></button></div>
    <h2 className="mt-5 text-lg font-bold group-hover:text-violet-300">{tool.name}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{tool.description}</p>
    <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-violet-400">{compact?'Open tool':'Use tool'} <ArrowRight size={15}/></span>
  </Link>
}
