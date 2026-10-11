export function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <Icon size={15} className="text-violet-400" />
      <p className="mt-3 text-lg font-black">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p>
    </div>
  );
}

export function ReplayMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}

export function AccessibleCard({ label, value, tone }) {
  const tones = {
    violet: 'border-violet-900/60 bg-violet-950/20 text-violet-300',
    rose: 'border-rose-900/60 bg-rose-950/20 text-rose-300',
    amber: 'border-amber-900/60 bg-amber-950/20 text-amber-300'
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone] ?? tones.violet}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-sm leading-5 text-slate-200">{value}</p>
    </div>
  );
}

export function FeatureCard({ title, text }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}
