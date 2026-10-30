import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Globe, Zap, LockKeyhole, Cpu, CheckCircle2, HeartHandshake } from 'lucide-react';
import { ToolsHomeHeader } from '../components/toolsHome/ToolsHomeHeader';
import { ToolsHomeFooter } from '../components/toolsHome/ToolsHomeSections';
import { QuickAccessLeftSidebar } from '../components/layout/QuickAccessLeftSidebar';

export default function AboutUs() {
  useEffect(() => {
    document.title = 'About Us | OrbitBoard';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="orbit-light min-h-screen bg-[var(--orbit-canvas)] text-stone-800 dark:text-stone-100 transition-colors flex">
      <QuickAccessLeftSidebar />
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <ToolsHomeHeader />

        <div className="border-b border-[var(--orbit-border)] bg-[var(--orbit-canvas)] py-8 sm:py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-700 dark:text-accent-400 hover:underline mb-4">
              <ArrowLeft size={14} /> Back to OrbitBoard
            </Link>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-700 dark:text-accent-400">
              <Globe size={16} /> Our Purpose & Architecture
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              About OrbitBoard
            </h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Fast, browser-native web tools designed for daily work, career decisions, finance, and developer productivity.
            </p>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              Why We Built OrbitBoard
            </h2>
            <p className="text-base text-stone-600 dark:text-stone-300 leading-8">
              Modern web software is often bloated with compulsory sign-ups, paywalls, invasive tracking, and slow server round-trips. OrbitBoard was built to provide a clean, reliable, and instant set of utilities that respect user privacy and workflow speed. Whether you are calculating take-home salary after a job hike, converting PDF pages, formatting JSON arrays, or inspecting JWT claims, OrbitBoard provides authentic, well-tested tools without friction.
            </p>
          </section>

          <section className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-950 text-accent-700 dark:text-accent-300 flex items-center justify-center font-bold">
                <Zap size={20} />
              </div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100">Zero Latency</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-5">Calculations execute client-side in milliseconds without network bottlenecks.</p>
            </div>

            <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                <LockKeyhole size={20} />
              </div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100">Complete Privacy</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-5">Your documents, text, and numbers stay on your device in your web browser.</p>
            </div>

            <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
                <Cpu size={20} />
              </div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100">Browser Engines</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-5">Built on modern JavaScript, WebAssembly, and standard DOM APIs for reliability.</p>
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--orbit-border)] pt-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-accent-600" />
              Editorial & Curation Standards
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-7">
              Every tool on OrbitBoard is actively maintained, thoroughly tested with unit test suites (Vitest), and verified against official regulatory rules (such as Indian EPF thresholds, New vs Old Tax Regime slabs, Gratuity Act formulas, and ISO timestamp conversions). We continuously curate our codebase and add educational guides, formulas, and FAQs on every tool page so users understand the exact mechanics behind their results.
            </p>
          </section>

          <section className="space-y-4 border-t border-[var(--orbit-border)] pt-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <HeartHandshake size={18} className="text-accent-600" />
              How OrbitBoard Remains Free
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-7">
              OrbitBoard is supported through unobtrusive third-party advertising (via Google AdSense) and optional voluntary support contributions. This allows us to offer all core utilities completely free of charge to students, developers, job seekers, and professionals worldwide.
            </p>
          </section>
        </main>
      </div>

      <ToolsHomeFooter />
      </div>
    </div>
  );
}
