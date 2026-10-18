import { Link } from 'react-router-dom';
import { ArrowRight, LockKeyhole } from 'lucide-react';

export function PrivacySection() {
  return (
    <section className="mx-auto max-w-6xl border-t border-stone-200 py-8 sm:py-10">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800"><LockKeyhole size={14} /> Your privacy matters</div>
            <h2 className="mt-2 text-lg font-bold text-stone-900 sm:text-xl">Private, secure and free by design.</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">No account is required for our core tools. Many file and data tools process content directly in your browser, helping keep files on your device.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-stone-600 sm:grid-cols-3 lg:min-w-[440px]">
            {['No sign-up required', 'Browser-first processing', 'Free core utilities'].map(item => <div key={item} className="rounded-xl border border-emerald-100 bg-white px-3 py-3 font-medium">{item}</div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CatalogCalloutSection() {
  return (
    <section className="mx-auto max-w-6xl border-t border-stone-200 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Still exploring?</p><h2 className="mt-1 text-xl font-bold text-stone-900">Every tool, when you need it.</h2></div>
        <Link to="/tools" className="inline-flex min-h-10 items-center gap-1 self-start rounded-lg px-2 text-sm font-semibold text-violet-800 hover:bg-violet-50">Open full catalogue <ArrowRight size={15} /></Link>
      </div>
    </section>
  );
}

export function ToolsHomeFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-3 px-4 text-center text-sm text-stone-500 sm:flex-row sm:px-6 sm:text-left">
        <span>OrbitBoard · Practical tools for work and life</span>
        <a href="mailto:support@orbitboard.in?subject=OrbitBoard%20Collaboration" className="rounded-md px-1 font-medium text-stone-600 hover:text-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-500">Collaboration? support@orbitboard.in</a>
      </div>
    </footer>
  );
}
