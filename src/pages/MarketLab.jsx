import { useMemo, useState } from 'react';
import { ArrowLeft, FlaskConical, Play, RotateCcw, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/layout/SEO';

const DEMO_DAYS = [
  ['2026-01-05', 23840, 23910, 23790, 23880, 1.12, 1.4],
  ['2026-01-06', 23880, 23940, 23810, 23835, 0.94, 1.1],
  ['2026-01-07', 23835, 24020, 23820, 23980, 1.35, 2.2],
  ['2026-01-08', 23980, 24010, 23870, 23920, 1.02, 1.8],
  ['2026-01-09', 23920, 24110, 23890, 24085, 1.58, 3.1],
  ['2026-01-12', 24085, 24160, 23980, 24040, 1.08, 2.5],
  ['2026-01-13', 24040, 24230, 24020, 24200, 1.72, 3.8],
  ['2026-01-14', 24200, 24260, 24080, 24120, 0.91, 2.0],
  ['2026-01-15', 24120, 24340, 24090, 24310, 1.86, 4.1],
  ['2026-01-16', 24310, 24380, 24200, 24255, 1.01, 2.6],
  ['2026-01-19', 24255, 24420, 24210, 24390, 1.49, 3.4],
  ['2026-01-20', 24390, 24410, 24280, 24320, 0.88, 2.1],
  ['2026-01-21', 24320, 24540, 24300, 24510, 1.92, 4.6],
  ['2026-01-22', 24510, 24580, 24390, 24420, 0.97, 1.7],
  ['2026-01-23', 24420, 24620, 24380, 24590, 1.63, 3.9],
  ['2026-01-26', 24590, 24610, 24450, 24480, 0.82, 1.4],
  ['2026-01-27', 24480, 24680, 24460, 24630, 1.77, 4.3],
  ['2026-01-28', 24630, 24720, 24530, 24570, 0.93, 2.0],
  ['2026-01-29', 24570, 24810, 24520, 24790, 1.96, 4.8],
  ['2026-01-30', 24790, 24840, 24620, 24680, 0.89, 1.9]
].map(([date, open, high, low, close, volume, oi]) => ({ date, open, high, low, close, volume, oi }));

const formatNumber = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);

function runExperiment(data, volumeThreshold, oiThreshold, forwardDays) {
  const matches = [];
  for (let i = 2; i < data.length - forwardDays; i += 1) {
    const current = data[i];
    const baseline = (data[i - 1].volume + data[i - 2].volume) / 2;
    const oiChange = ((current.oi - data[i - 1].oi) / data[i - 1].oi) * 100;
    if (current.volume >= baseline * volumeThreshold && oiChange >= oiThreshold) {
      const exit = data[i + forwardDays];
      const returnPct = ((exit.close - current.close) / current.close) * 100;
      matches.push({ ...current, returnPct });
    }
  }
  const positive = matches.filter(item => item.returnPct > 0);
  const average = matches.length ? matches.reduce((sum, item) => sum + item.returnPct, 0) / matches.length : 0;
  return {
    matches,
    occurrences: matches.length,
    positiveRate: matches.length ? (positive.length / matches.length) * 100 : 0,
    averageReturn: average
  };
}

export default function MarketLab() {
  const [volumeThreshold, setVolumeThreshold] = useState(1.25);
  const [oiThreshold, setOiThreshold] = useState(2);
  const [forwardDays, setForwardDays] = useState(2);
  const [result, setResult] = useState(() => runExperiment(DEMO_DAYS, 1.25, 2, 2));
  const [replayIndex, setReplayIndex] = useState(0);

  const replay = DEMO_DAYS[replayIndex];
  const replayProgress = ((replayIndex + 1) / DEMO_DAYS.length) * 100;

  const summary = useMemo(() => ({
    first: DEMO_DAYS[0],
    last: DEMO_DAYS[DEMO_DAYS.length - 1],
    change: ((DEMO_DAYS.at(-1).close - DEMO_DAYS[0].close) / DEMO_DAYS[0].close) * 100
  }), []);

  const run = () => setResult(runExperiment(DEMO_DAYS, volumeThreshold, oiThreshold, forwardDays));
  const reset = () => {
    setVolumeThreshold(1.25);
    setOiThreshold(2);
    setForwardDays(2);
    setResult(runExperiment(DEMO_DAYS, 1.25, 2, 2));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SEO
        title="Market Lab | OrbitBoard"
        description="Test market hypotheses, inspect historical evidence and replay a demo market dataset with OrbitBoard Market Lab."
        canonical="https://orbitboard.in/market-lab"
      />
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight text-white">ORBIT<span className="text-violet-400">BOARD</span></Link>
          <Link to="/tools" className="text-sm font-semibold text-slate-400 hover:text-white">All tools</Link>
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white">
          <ArrowLeft size={16} /> OrbitBoard home
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-violet-900/50 bg-gradient-to-br from-violet-950/60 via-slate-900 to-slate-950">
          <div className="p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-800/70 bg-violet-950/60 px-3 py-1.5 text-xs font-bold text-violet-300"><FlaskConical size={14} /> Market Lab</span>
              <span className="rounded-full border border-amber-800/60 bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-300">Prototype · demo dataset</span>
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl sm:text-6xl font-black tracking-tight">Test the idea. Don't just ask the AI.</h1>
            <p className="mt-4 max-w-3xl text-base sm:text-lg leading-7 text-slate-400">
              OrbitBoard Market Lab is designed around a simple workflow: form a market hypothesis, test it against historical data, inspect the evidence, then replay the market context.
            </p>
          </div>
        </section>

        <div className="mt-6 grid lg:grid-cols-[1.1fr_.9fr] gap-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-violet-400">Experiment</p>
                <h2 className="mt-1 text-xl font-black">Volume + OI hypothesis</h2>
              </div>
              <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-white"><RotateCcw size={14} /> Reset</button>
            </div>

            <div className="mt-6 grid sm:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-slate-400">Volume multiplier</span>
                <div className="mt-2 flex items-center gap-2">
                  <input type="range" min="1" max="2" step="0.05" value={volumeThreshold} onChange={e => setVolumeThreshold(Number(e.target.value))} className="w-full accent-violet-500" />
                  <span className="w-12 text-right text-sm font-bold">{volumeThreshold.toFixed(2)}×</span>
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-400">Minimum OI change</span>
                <div className="mt-2 flex items-center gap-2">
                  <input type="range" min="0" max="6" step="0.5" value={oiThreshold} onChange={e => setOiThreshold(Number(e.target.value))} className="w-full accent-violet-500" />
                  <span className="w-12 text-right text-sm font-bold">{oiThreshold.toFixed(1)}%</span>
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-400">Forward window</span>
                <select value={forwardDays} onChange={e => setForwardDays(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white">
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

            <button type="button" onClick={run} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400">
              <Play size={16} /> Run experiment
            </button>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-400">Evidence</p>
            <h2 className="mt-1 text-xl font-black">Observed in demo data</h2>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric icon={Activity} label="Occurrences" value={result.occurrences} />
              <Metric icon={TrendingUp} label="Positive" value={`${result.positiveRate.toFixed(1)}%`} />
              <Metric icon={BarChart3} label="Avg move" value={`${result.averageReturn >= 0 ? '+' : ''}${result.averageReturn.toFixed(2)}%`} />
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-600">
              This is a deterministic demo dataset for the product prototype, not live market data, investment advice or a trading signal.
            </p>
          </section>
        </div>

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
            <div className="flex items-center justify-between text-xs text-slate-500"><span>Replay progress</span><span>{Math.round(replayProgress)}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${replayProgress}%` }} /></div>

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
              <button type="button" disabled={replayIndex === 0} onClick={() => setReplayIndex(index => Math.max(0, index - 1))} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-30">Previous</button>
              <p className="max-w-xl text-center text-xs leading-5 text-slate-600">Replay is intentionally limited to the information available in this demo record. The production version will use timestamped historical market data.</p>
              <button type="button" disabled={replayIndex === DEMO_DAYS.length - 1} onClick={() => setReplayIndex(index => Math.min(DEMO_DAYS.length - 1, index + 1))} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-30">Next</button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid md:grid-cols-3 gap-4">
          <Feature title="Evidence first" text="Turn a hypothesis into measurable historical conditions instead of relying on a conversational guess." />
          <Feature title="Replay the context" text="Inspect what the market record looked like at a point in time before seeing the later outcome." />
          <Feature title="Research, don't predict" text="OrbitBoard is designed to help users investigate market behaviour, not tell them what to buy or sell." />
        </section>

        <section className="mt-8 rounded-2xl border border-amber-900/50 bg-amber-950/20 p-5 text-sm leading-6 text-amber-200/80">
          <strong className="text-amber-200">Prototype note:</strong> The current Market Lab uses a small synthetic demo dataset so we can validate the product workflow before paying for live market-data access. No live prices, brokerage credentials or order execution are involved.
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-violet-500/50 hover:text-white">Back to OrbitBoard</Link>
          <Link to="/tools" className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-400">Explore tools</Link>
        </div>

        <p className="mt-10 text-xs text-slate-600">Demo market data shown here is fictional and exists only to demonstrate the Market Lab interface.</p>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><Icon size={15} className="text-violet-400" /><p className="mt-3 text-lg font-black">{value}</p><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p></div>;
}

function ReplayMetric({ label, value }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-1 font-bold text-white">{value}</p></div>;
}

function Feature({ title, text }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><h3 className="font-bold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>;
}
