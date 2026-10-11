import { ReplayMetric } from './MarketLabUiComponents';
import { DEMO_DAYS, formatNumber } from './marketLabData';

export function MarketReplaySection({ replayIndex, setReplayIndex }) {
  const replay = DEMO_DAYS[replayIndex];
  const replayProgress = ((replayIndex + 1) / DEMO_DAYS.length) * 100;

  return (
    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-400">Market replay</p>
          <h2 className="mt-1 text-xl font-black">What would you have seen at the time?</h2>
        </div>
        <div className="text-right text-xs text-slate-500">
          {replay.date} · session {replayIndex + 1} / {DEMO_DAYS.length}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Replay progress</span>
          <span>{Math.round(replayProgress)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${replayProgress}%` }} />
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <ReplayMetric label="Open" value={formatNumber(replay.open)} />
          <ReplayMetric label="High" value={formatNumber(replay.high)} />
          <ReplayMetric label="Low" value={formatNumber(replay.low)} />
          <ReplayMetric label="Close" value={formatNumber(replay.close)} />
          <ReplayMetric label="Volume index" value={`${replay.volume.toFixed(2)}×`} />
        </div>

        <input
          aria-label="Replay historical session"
          type="range"
          min="0"
          max={DEMO_DAYS.length - 1}
          value={replayIndex}
          onChange={e => setReplayIndex(Number(e.target.value))}
          className="mt-7 w-full accent-cyan-500"
        />

        <div className="mt-4 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            disabled={replayIndex === 0}
            onClick={() => setReplayIndex(index => Math.max(0, index - 1))}
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-30"
          >
            Previous
          </button>
          <p className="max-w-xl text-center text-xs leading-5 text-slate-600">
            Replay is intentionally limited to the information available in this demo record. The production version will use timestamped historical market data.
          </p>
          <button
            type="button"
            disabled={replayIndex === DEMO_DAYS.length - 1}
            onClick={() => setReplayIndex(index => Math.min(DEMO_DAYS.length - 1, index + 1))}
            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
