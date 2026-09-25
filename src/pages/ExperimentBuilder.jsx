import { useMemo, useState } from 'react';
import { ArrowLeft, Beaker, Play, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/layout/SEO';
import { INFY_SYNTHETIC_DAILY } from '../market/demo/infySyntheticData';
import { runExperiment } from '../market/experiments/engine';
import { runChallenge } from '../market/experiments/challenge';

const METRICS = [
  { value: 'volume_ratio', label: 'Volume ratio' },
  { value: 'open_interest_change', label: 'Open-interest change' },
  { value: 'daily_return', label: 'Daily return' },
  { value: 'price', label: 'Closing price' }
];
const OPERATORS = [
  { value: '>=', label: 'at least' },
  { value: '<=', label: 'at most' },
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' }
];
const WINDOWS = [1, 5, 20];

export default function ExperimentBuilder() {
  const [conditions, setConditions] = useState([{ metric: 'volume_ratio', operator: '>=', value: 1.75 }]);
  const [window, setWindow] = useState(5);
  const [ran, setRan] = useState(false);
  const [challengeRan, setChallengeRan] = useState(false);

  const definition = useMemo(() => ({
    universe: { type: 'security', symbols: ['INFY'] },
    period: { from: INFY_SYNTHETIC_DAILY[0].date, to: INFY_SYNTHETIC_DAILY.at(-1).date },
    trigger: { all: conditions.map((condition) => ({ ...condition, value: Number(condition.value) })) },
    forwardWindows: [window]
  }), [conditions, window]);

  const result = useMemo(() => ran ? runExperiment({ rows: INFY_SYNTHETIC_DAILY, definition }).results[window] : null, [definition, ran, window]);
  const challenge = useMemo(() => challengeRan ? runChallenge({ rows: INFY_SYNTHETIC_DAILY, definition }) : null, [definition, challengeRan]);

  const updateCondition = (index, key, value) => {
    setConditions((current) => current.map((condition, i) => i === index ? { ...condition, [key]: value } : condition));
    setRan(false);
    setChallengeRan(false);
  };
  const addCondition = () => {
    setConditions((current) => [...current, { metric: 'open_interest_change', operator: '>=', value: 2 }]);
    setRan(false);
    setChallengeRan(false);
  };
  const removeCondition = (index) => {
    setConditions((current) => current.length === 1 ? current : current.filter((_, i) => i !== index));
    setRan(false);
    setChallengeRan(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SEO title="Experiment Builder | OrbitBoard Market" description="Build, test and challenge reproducible market experiments in OrbitBoard Market." canonical="https://orbitboard.in/market/INFY/experiment" />
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur"><div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between"><Link to="/" className="text-xl font-black tracking-tight text-white">ORBIT<span className="text-violet-400">BOARD</span></Link><Link to="/market/INFY" className="text-sm font-semibold text-slate-400 hover:text-white">INFY research</Link></div></header>
      <main className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link to="/market/INFY" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"><ArrowLeft size={16} /> INFY research</Link>
        <section className="mt-6 rounded-3xl border border-violet-900/50 bg-gradient-to-br from-violet-950/60 via-slate-900 to-slate-950 p-6 sm:p-10"><span className="inline-flex items-center gap-2 rounded-full border border-violet-800/70 bg-violet-950/60 px-3 py-1.5 text-xs font-bold text-violet-300"><Beaker size={14} /> Experiment Builder</span><h1 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight">Turn a market question into a test.</h1><p className="mt-4 max-w-3xl text-slate-400">Define observable conditions, run the evidence, then try to break your own hypothesis.</p></section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-violet-400">Hypothesis</p><h2 className="mt-1 text-xl font-black">When these conditions happen…</h2></div><span className="text-xs text-slate-600">INFY · synthetic dataset</span></div>
          <div className="mt-6 space-y-3">{conditions.map((condition, index) => <div key={index} className="grid gap-3 md:grid-cols-[1fr_160px_140px_auto] items-center rounded-xl border border-slate-800 bg-slate-950 p-3"><select value={condition.metric} onChange={(e) => updateCondition(index, 'metric', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white">{METRICS.map((metric) => <option key={metric.value} value={metric.value}>{metric.label}</option>)}</select><select value={condition.operator} onChange={(e) => updateCondition(index, 'operator', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white">{OPERATORS.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}</select><input type="number" step="0.1" value={condition.value} onChange={(e) => updateCondition(index, 'value', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white" /><button type="button" onClick={() => removeCondition(index)} disabled={conditions.length === 1} aria-label="Remove condition" className="rounded-lg p-2 text-slate-600 hover:text-red-300 disabled:opacity-20"><Trash2 size={17} /></button></div>)}</div>
          <button type="button" onClick={addCondition} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-violet-500/50 hover:text-white"><Plus size={14} /> Add condition</button>
          <div className="mt-8 border-t border-slate-800 pt-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-400">Then inspect</p><div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-sm text-slate-400">The market after</span><select value={window} onChange={(e) => { setWindow(Number(e.target.value)); setRan(false); setChallengeRan(false); }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white">{WINDOWS.map((item) => <option key={item} value={item}>{item} session{item > 1 ? 's' : ''}</option>)}</select></div></div>
          <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setRan(true); setChallengeRan(false); }} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-black text-white hover:bg-violet-400"><Play size={16} /> Run experiment</button>{ran && <button type="button" onClick={() => setChallengeRan(true)} className="mt-7 inline-flex items-center gap-2 rounded-xl border border-amber-700/60 bg-amber-950/20 px-5 py-3 text-sm font-black text-amber-200 hover:bg-amber-950/40"><ShieldAlert size={16} /> Try to break it</button>}</div>
        </section>

        {result && <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-400">Evidence</p><h2 className="mt-1 text-2xl font-black">What the dataset shows</h2><div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Observations" value={result.observations} /><Metric label="Positive rate" value={result.positiveRate == null ? '—' : `${result.positiveRate.toFixed(1)}%`} /><Metric label="Median return" value={result.medianReturn == null ? '—' : `${result.medianReturn >= 0 ? '+' : ''}${result.medianReturn.toFixed(2)}%`} /><Metric label="Average return" value={result.averageReturn == null ? '—' : `${result.averageReturn >= 0 ? '+' : ''}${result.averageReturn.toFixed(2)}%`} /></div>{result.observations < 30 && <div className="mt-5 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm leading-6 text-amber-200/80"><strong className="text-amber-200">Small sample:</strong> only {result.observations} matching observations were found. This is not enough evidence to treat the result as a robust historical pattern.</div>}<div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-600">Experiment definition</p><pre className="mt-3 overflow-auto text-xs leading-5 text-slate-400">{JSON.stringify(definition, null, 2)}</pre></div><div className="mt-6 space-y-2"><p className="text-xs font-bold uppercase tracking-wider text-slate-600">Observed cases</p>{result.observations.slice(0, 10).map((item) => <div key={`${item.triggerDate}-${item.forwardDate}`} className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs"><span><b className="text-slate-300">{item.triggerDate}</b><br />trigger</span><span><b className="text-slate-300">{item.forwardDate}</b><br />forward date</span><span><b className="text-slate-300">{item.forwardReturn == null ? '—' : `${item.forwardReturn >= 0 ? '+' : ''}${item.forwardReturn.toFixed(2)}%`}</b><br />return</span><span className="capitalize text-slate-500">{item.outcome}</span></div>)}</div></section>}

        {challenge && <section className="mt-6 rounded-2xl border border-amber-800/50 bg-slate-900/70 p-5 sm:p-6"><div className="flex items-center gap-3"><ShieldAlert className="text-amber-300" size={20} /><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-400">Hypothesis challenge</p><h2 className="mt-1 text-2xl font-black">Try to break the result</h2></div></div><p className="mt-4 text-sm leading-6 text-slate-400">{challenge.interpretation}</p><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-600"><tr><th className="pb-3">Variant</th><th className="pb-3">Observations</th><th className="pb-3">Positive</th><th className="pb-3">Median return</th><th className="pb-3">Change vs baseline</th></tr></thead><tbody>{challenge.variants.map((item) => <tr key={item.id} className="border-t border-slate-800"><td className="py-3 font-semibold text-slate-300">{item.label}</td><td className="py-3">{item.observations}</td><td className="py-3">{item.positiveRate == null ? '—' : `${item.positiveRate.toFixed(1)}%`}</td><td className="py-3">{item.medianReturn == null ? '—' : `${item.medianReturn >= 0 ? '+' : ''}${item.medianReturn.toFixed(2)}%`}</td><td className="py-3">{item.id === 'baseline' || item.medianReturnDelta == null ? '—' : `${item.medianReturnDelta >= 0 ? '+' : ''}${item.medianReturnDelta.toFixed(2)} pp`}</td></tr>)}</tbody></table></div><p className="mt-5 text-xs leading-5 text-slate-600">Stress testing changes one condition at a time. It does not establish causation, predict future prices or prove a strategy will work outside this dataset.</p></section>}

        <section className="mt-6 rounded-2xl border border-amber-900/50 bg-amber-950/20 p-5 text-sm leading-6 text-amber-200/80"><strong className="text-amber-200">Prototype boundary:</strong> this builder uses fictional market observations. The production engine will only use data for which OrbitBoard has appropriate access and usage rights.</section>
      </main>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs uppercase tracking-wider text-slate-600">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}
