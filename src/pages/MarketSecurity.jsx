import { useMemo, useState } from 'react';
import { Activity, ArrowLeft, BarChart3, CalendarDays, FlaskConical, Newspaper, Play, TrendingUp } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/layout/SEO';
import { INFY_SYNTHETIC_DAILY, INFY_SYNTHETIC_EVENTS, INFY_SYNTHETIC_NEWS } from '../market/demo/infySyntheticData';
import { runInfySyntheticExperiment } from '../market/demo/runInfyDemo';

const formatNumber = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);

export default function MarketSecurity() {
  const { symbol = 'INFY' } = useParams();
  const normalizedSymbol = symbol.toUpperCase();
  const isInfy = normalizedSymbol === 'INFY';
  const [tab, setTab] = useState('overview');
  const experiment = useMemo(() => isInfy ? runInfySyntheticExperiment() : null, [isInfy]);
  const latest = INFY_SYNTHETIC_DAILY.at(-1);
  const first = INFY_SYNTHETIC_DAILY[0];
  const periodChange = ((latest.close - first.close) / first.close) * 100;

  if (!isInfy) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 p-8"><Link to="/market/INFY">Open the prototype security</Link></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SEO title="INFY Market Research | OrbitBoard" description="Research market data, events, news and reproducible experiments for INFY in OrbitBoard's prototype research workspace." canonical="https://orbitboard.in/market/INFY" />
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight text-white">ORBIT<span className="text-violet-400">BOARD</span></Link>
          <Link to="/market-lab" className="text-sm font-semibold text-slate-400 hover:text-white">Market Lab</Link>
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
        <Link to="/market-lab" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"><ArrowLeft size={16} /> Market Lab</Link>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-950 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-violet-800/70 bg-violet-950/60 px-3 py-1.5 text-xs font-bold text-violet-300">Market Research</span>
            <span className="rounded-full border border-amber-800/60 bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-300">Prototype · synthetic data</span>
          </div>
          <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-slate-500">NSE · Technology services · research workspace</p>
              <h1 className="mt-1 text-4xl sm:text-5xl font-black tracking-tight">{normalizedSymbol}</h1>
              <p className="mt-3 max-w-2xl text-slate-400">One page for market context, news, events and reproducible experiments. Research the evidence; make your own decision.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[260px]">
              <Stat label="Latest demo close" value={formatNumber(latest.close)} />
              <Stat label="Demo period change" value={`${periodChange >= 0 ? '+' : ''}${periodChange.toFixed(2)}%`} />
            </div>
          </div>
        </section>

        <nav className="mt-5 flex gap-2 overflow-x-auto border-b border-slate-800 pb-px">
          {[
            ['overview', 'Overview'],
            ['market', 'Market'],
            ['news', 'News'],
            ['events', 'Events'],
            ['experiments', 'Experiments']
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold ${tab === key ? 'border-violet-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-200'}`}>{label}</button>
          ))}
        </nav>

        {tab === 'overview' && <Overview latest={latest} periodChange={periodChange} experiment={experiment} onExperiments={() => setTab('experiments')} />}
        {tab === 'market' && <Market rows={INFY_SYNTHETIC_DAILY} />}
        {tab === 'news' && <News items={INFY_SYNTHETIC_NEWS} />}
        {tab === 'events' && <Events items={INFY_SYNTHETIC_EVENTS} />}
        {tab === 'experiments' && <Experiments experiment={experiment} />}
        
        <div className="mt-8 rounded-2xl border border-amber-900/50 bg-amber-950/20 p-5 text-sm leading-6 text-amber-200/80">
          <strong className="text-amber-200">Prototype boundary:</strong> every market observation, event and news item on this page is synthetic. This build has no live prices, broker connection, order execution or investment recommendation.
        </div>
      </main>
    </div>
  );
}

function Overview({ latest, periodChange, experiment, onExperiments }) {
  const five = experiment?.results?.[5];
  return (
    <section className="mt-6 grid lg:grid-cols-[1.1fr_.9fr] gap-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-violet-400">Research snapshot</p>
        <h2 className="mt-2 text-2xl font-black">What is in the record?</h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-3">
          <Stat label="Latest close" value={formatNumber(latest.close)} icon={Activity} />
          <Stat label="Data sessions" value="520" icon={CalendarDays} />
          <Stat label="Synthetic events" value="11" icon={Newspaper} />
        </div>
        <p className="mt-6 text-sm leading-6 text-slate-400">The production version will replace this deterministic demo with licensed market data and timestamped source records. The page structure stays the same.</p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-400">Experiment evidence</p>
        <h2 className="mt-2 text-2xl font-black">One reproducible test</h2>
        {five && <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label="Observations" value={five.observations} />
          <Stat label="Positive rate" value={five.positiveRate == null ? '—' : `${five.positiveRate.toFixed(1)}%`} />
          <Stat label="Median return" value={five.medianReturn == null ? '—' : `${five.medianReturn >= 0 ? '+' : ''}${five.medianReturn.toFixed(2)}%`} />
          <Stat label="Median vs benchmark" value="Not supplied" />
        </div>}
        <button type="button" onClick={onExperiments} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold"><FlaskConical size={16} /> Inspect experiment</button>
      </div>
    </section>
  );
}

function Market({ rows }) {
  const [index, setIndex] = useState(rows.length - 1);
  const row = rows[index];
  return <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
    <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-400">Market</p><h2 className="mt-1 text-2xl font-black">Historical session explorer</h2></div><span className="text-xs text-slate-500">{row.date}</span></div>
    <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">{[['Open',row.open],['High',row.high],['Low',row.low],['Close',row.close],['Volume',row.volume]].map(([label,value]) => <Stat key={label} label={label} value={formatNumber(value)} />)}</div>
    <input aria-label="Historical market session" type="range" min="0" max={rows.length - 1} value={index} onChange={(e) => setIndex(Number(e.target.value))} className="mt-8 w-full accent-cyan-500" />
    <p className="mt-3 text-xs text-slate-600">Replay is based on the synthetic dataset and is included to validate the research workflow.</p>
  </section>;
}

function News({ items }) {
  return <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-400">News</p><h2 className="mt-1 text-2xl font-black">Event-linked news</h2>
    <div className="mt-6 space-y-3">{items.map(item => <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex justify-between gap-4"><h3 className="font-bold">{item.headline}</h3><time className="shrink-0 text-xs text-slate-600">{item.publishedAt.slice(0,10)}</time></div><p className="mt-2 text-sm text-slate-500">{item.summary}</p><span className="mt-3 inline-block text-[11px] font-semibold text-slate-600">{item.publisher}</span></article>)}</div>
  </section>;
}

function Events({ items }) {
  return <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-amber-400">Company events</p><h2 className="mt-1 text-2xl font-black">Timeline</h2>
    <div className="mt-6 space-y-3">{items.map(item => <article key={item.id} className="flex gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"><CalendarDays size={18} className="mt-0.5 shrink-0 text-amber-400" /><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-sm text-slate-500">{item.description}</p><time className="mt-2 block text-xs text-slate-600">{item.timestamp}</time></div></article>)}</div>
  </section>;
}

function Experiments({ experiment }) {
  const rows = Object.values(experiment?.results || {});
  return <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-violet-400">Experiment engine</p><h2 className="mt-1 text-2xl font-black">Volume + OI hypothesis</h2></div><Link to="/market-lab" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold"><Play size={15} /> Open Lab</Link></div>
    <p className="mt-3 text-sm text-slate-400">Trigger: volume ratio ≥ 1.75× baseline and open-interest change ≥ 2%. The same definition is evaluated over three forward windows.</p>
    <div className="mt-6 grid md:grid-cols-3 gap-4">{rows.map(item => <div key={item.window} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs font-bold text-slate-500">{item.window}-session window</p><p className="mt-3 text-2xl font-black">{item.observations}</p><p className="text-xs uppercase tracking-wider text-slate-600">observations</p><p className="mt-4 text-sm">Median return <strong>{item.medianReturn == null ? '—' : `${item.medianReturn >= 0 ? '+' : ''}${item.medianReturn.toFixed(2)}%`}</strong></p><p className="mt-1 text-sm text-slate-500">Positive {item.positiveRate == null ? '—' : `${item.positiveRate.toFixed(1)}%`}</p></div>)}</div>
  </section>;
}

function Stat({ label, value, icon: Icon }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">{Icon && <Icon size={15} className="text-violet-400" />}<p className="mt-2 text-lg font-black">{value}</p><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p></div>;
}
