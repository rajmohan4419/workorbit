export default function SampleAd() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4" aria-label="Advertisement space">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Advertisement · placeholder</p>
        <span className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600">Coming soon</span>
      </div>
      <div className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-dashed border-slate-800 px-4 py-3 text-center text-xs text-slate-600">
        A future ad provider can be added here after it has been reviewed and approved.
      </div>
    </section>
  );
}
