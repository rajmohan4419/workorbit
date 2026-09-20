import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Calculator, Code2, Coins } from 'lucide-react';
import { TOOLS } from '../data/toolCatalog';
import { TOOL_CONTENT } from '../data/toolContent';
import { loadToolPage } from '../lib/toolPageLoader';

const ToolPage = lazy(loadToolPage);

const categoryIcons = {
  Career: BriefcaseBusiness,
  Finance: Coins,
  Developer: Code2,
  Everyday: Calculator,
};

function ToolShell({ tool, info }) {
  const CategoryIcon = categoryIcons[tool.category] || Calculator;
  const related = TOOLS.filter(item => item.category === tool.category && item.slug !== tool.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" aria-label="OrbitBoard home" className="text-lg font-black text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 via-violet-500 to-cyan-400 p-0.5">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center text-amber-400 text-xs font-black">O</div>
            </div>
            ORBIT<span className="text-orange-500">BOARD</span>
          </Link>
          <Link to="/tools" className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg px-3 py-2">
            <ArrowLeft size={16}/> All tools
          </Link>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-800/70 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 sm:py-7">
            <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-6 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                  <CategoryIcon size={14}/>{tool.category} tool
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-3">{tool.name}</h1>
                <p className="mt-3 text-sm sm:text-base leading-7 text-slate-400">{info?.intro || tool.description}</p>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 min-h-44 sm:min-h-52">
                <img src={tool.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/70 to-transparent" />
                <div className="relative h-full min-h-44 sm:min-h-52 p-5 flex items-end">
                  <div>
                    <p className="text-xs uppercase tracking-[.2em] text-violet-400">OrbitBoard</p>
                    <p className="mt-2 text-xl font-bold text-white">Get the answer. Keep moving.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
            <div className="mb-5 flex flex-wrap gap-2">
              <div className="h-9 w-24 rounded-xl bg-slate-800 animate-pulse" />
              <div className="h-9 w-20 rounded-xl bg-slate-800 animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-8 w-40 rounded-lg bg-slate-800 animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-slate-950 animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-slate-950 animate-pulse" />
              <div className="h-10 w-28 rounded-xl bg-violet-900/40 animate-pulse" />
            </div>
          </section>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">More {tool.category} tools</p>
              <div className="mt-4 space-y-2">
                {related.map(item => (
                  <Link key={item.slug} to={`/tools/${item.slug}`} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
                    {item.name}<ArrowRight size={15}/>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function ToolPageRoute() {
  const { slug } = useParams();
  const tool = TOOLS.find(item => item.slug === slug);
  const info = TOOL_CONTENT[slug];

  if (!tool) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-10">
        <Link to="/tools">← Tools</Link>
        <h1 className="text-2xl font-bold mt-8">Tool not found</h1>
      </div>
    );
  }

  return (
    <Suspense fallback={<ToolShell tool={tool} info={info} />}>
      <ToolPage />
    </Suspense>
  );
}
