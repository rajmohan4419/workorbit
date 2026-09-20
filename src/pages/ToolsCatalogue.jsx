import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Calculator, Code2, Coins } from 'lucide-react';
import { TOOLS } from '../data/toolCatalog';

const categories = [
  { name: 'Career', label: 'Career & Salary', icon: BriefcaseBusiness },
  { name: 'Finance', label: 'Money & Finance', icon: Coins },
  { name: 'Everyday', label: 'Everyday', icon: Calculator },
  { name: 'Developer', label: 'Developer Tools', icon: Code2 }
];

export default function ToolsCatalogue() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight text-white" aria-label="OrbitBoard home">
            ORBIT<span className="text-violet-400">BOARD</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white">
            <ArrowLeft size={15} /> Back home
          </Link>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-400">OrbitBoard catalogue</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight">Every tool, when you need it.</h1>
          <p className="mt-4 text-base leading-7 text-slate-400">
            Browse the complete OrbitBoard toolkit for work, money, everyday tasks and developer workflows.
          </p>
        </div>

        <div className="mt-10 space-y-12">
          {categories.map(({ name, label, icon: Icon }) => {
            const tools = TOOLS.filter(tool => tool.category === name);

            return (
              <section key={name} aria-labelledby={`catalogue-${name.toLowerCase()}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h2 id={`catalogue-${name.toLowerCase()}`} className="text-xl font-bold">{label}</h2>
                      <p className="text-xs text-slate-500">{tools.length} tools</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tools.map(tool => (
                    <Link
                      key={tool.slug}
                      to={`/tools/${tool.slug}`}
                      className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 hover:-translate-y-0.5 hover:border-violet-500/50 hover:bg-slate-900 transition focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">{name}</p>
                          <h3 className="mt-1 font-bold text-white group-hover:text-violet-400">{tool.name}</h3>
                        </div>
                        <ArrowRight size={16} className="mt-1 shrink-0 text-slate-600 group-hover:text-violet-400" />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{tool.description}</p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-slate-900 py-8 text-center text-sm text-slate-600">
        OrbitBoard • Practical tools for work & life
      </footer>
    </div>
  );
}
