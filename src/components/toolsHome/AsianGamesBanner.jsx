import { ArrowRight, Trophy } from 'lucide-react';

export function AsianGamesBanner() {
  return (
    <div className="border-b border-amber-900/40 bg-gradient-to-r from-amber-950/80 via-slate-900 to-accent-950/60">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-3">
        <a
          href="https://www.aichi-nagoya2026.org/"
          target="_blank"
          rel="noreferrer noopener"
          className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-amber-700/30 bg-slate-950/40 px-4 py-3 transition hover:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
              <Trophy size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-rose-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" /> Live now
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">Asian Games 2026</span>
              </div>
              <p className="mt-0.5 truncate text-sm font-semibold text-white">Aichi–Nagoya · 19 Sep – 4 Oct</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 group-hover:text-amber-200 sm:shrink-0">
            Schedule & live results <ArrowRight size={14} aria-hidden="true" />
          </span>
        </a>
      </div>
    </div>
  );
}
