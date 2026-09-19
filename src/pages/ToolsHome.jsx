import { Link } from 'react-router-dom';
import { TOOLS } from '../data/tools';

const categories = ['All', 'Career', 'Finance', 'Everyday'];

export default function ToolsHome() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/90">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">ORBITBOARD</Link>
          <span className="text-xs text-slate-500">Free tools for work & life</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-14">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-violet-400 mb-3">ORBITBOARD TOOLS</p>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight">Tools that get work done.</h1>
          <p className="mt-5 text-lg text-slate-400">Fast, practical calculators for Indian professionals. No sign-up required.</p>
        </section>
        <div className="flex gap-2 flex-wrap mt-10">
          {categories.map(c => <span key={c} className="px-3 py-1.5 rounded-full text-xs border border-slate-800 bg-slate-900 text-slate-400">{c}</span>)}
        </div>
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {TOOLS.map(tool => (
            <Link key={tool.slug} to={`/tools/${tool.slug}`} className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-violet-500/60 hover:bg-slate-900 transition">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center font-bold">{tool.icon}</div>
              <h2 className="mt-5 text-lg font-bold group-hover:text-violet-300">{tool.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{tool.description}</p>
              <span className="inline-block mt-5 text-xs font-semibold text-violet-400">Open tool →</span>
            </Link>
          ))}
        </section>
      </main>
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-600">OrbitBoard • Free utilities for Indian professionals</footer>
    </div>
  );
}
