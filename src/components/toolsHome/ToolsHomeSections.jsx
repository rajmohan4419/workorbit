import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function PrivacySection() {
  return (
    <section className="max-w-[1440px] mx-auto border-t border-slate-900 py-8 sm:py-10">
      <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 px-5 py-5 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-emerald-300">
              <span aria-hidden="true">🔒</span> Your privacy matters
            </div>
            <h2 className="mt-2 text-lg sm:text-xl font-bold text-white">Private, secure & free by design.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              No account is required for our core tools. Many file and data tools process your content directly in your browser, so your files can stay on your device instead of being uploaded to OrbitBoard.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400 lg:min-w-[460px]">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
              <div className="font-semibold text-white">No sign-up</div>
              <div className="mt-1">Use core tools without an account.</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
              <div className="font-semibold text-white">Browser-first</div>
              <div className="mt-1">Many tools process files locally.</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
              <div className="font-semibold text-white">Free to use</div>
              <div className="mt-1">Core utilities stay accessible.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CatalogCalloutSection() {
  return (
    <section className="max-w-[1440px] mx-auto border-t border-slate-900 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Still exploring?</p>
          <h2 className="mt-1 text-xl font-bold">Every tool, when you need it.</h2>
        </div>
        <Link to="/tools" className="text-sm font-semibold text-violet-400 hover:text-violet-400">Open full catalogue <ArrowRight size={15} className="inline ml-1" /></Link>
      </div>
    </section>
  );
}

export function ToolsHomeFooter() {
  return (
    <footer className="border-t border-slate-900 py-8">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600">
        <span>OrbitBoard • Practical tools for work & life</span>
        <a
          href="mailto:support@orbitboard.in?subject=OrbitBoard%20Collaboration"
          className="font-medium text-slate-500 hover:text-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-md px-1"
        >
          Collaboration? support@orbitboard.in
        </a>
      </div>
    </footer>
  );
}
