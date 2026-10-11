import { RotateCcw, Play } from 'lucide-react';

export function ExperimentSection({
  volumeThreshold,
  setVolumeThreshold,
  oiThreshold,
  setOiThreshold,
  forwardDays,
  setForwardDays,
  reset,
  run
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-violet-400">Experiment</p>
          <h2 className="mt-1 text-xl font-black">Volume + OI hypothesis</h2>
        </div>
        <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-white">
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Volume multiplier</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="2"
              step="0.05"
              value={volumeThreshold}
              onChange={e => setVolumeThreshold(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <span className="w-12 text-right text-sm font-bold">{volumeThreshold.toFixed(2)}×</span>
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Minimum OI change</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="6"
              step="0.5"
              value={oiThreshold}
              onChange={e => setOiThreshold(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <span className="w-12 text-right text-sm font-bold">{oiThreshold.toFixed(1)}%</span>
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Forward window</span>
          <select
            value={forwardDays}
            onChange={e => setForwardDays(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            <option value="1">1 session</option>
            <option value="2">2 sessions</option>
            <option value="3">3 sessions</option>
          </select>
        </label>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
        <span className="font-bold text-white">WHEN</span> volume is at least <span className="text-violet-300">{volumeThreshold.toFixed(2)}×</span> its recent baseline
        <span className="text-slate-600"> + </span>
        OI change is at least <span className="text-violet-300">{oiThreshold.toFixed(1)}%</span>
        <span className="text-slate-600"> → </span>
        inspect the next <span className="text-violet-300">{forwardDays}</span> session{forwardDays > 1 ? 's' : ''}.
      </div>

      <button
        type="button"
        onClick={run}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        <Play size={16} /> Run experiment
      </button>
    </section>
  );
}
