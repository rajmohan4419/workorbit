import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/layout/SEO';
import { runResearch as executeResearch } from '../market/research';

import { DEMO_DAYS, DEMO_DOSSIER, runExperiment } from '../components/marketLab/marketLabData';
import { FeatureCard } from '../components/marketLab/MarketLabUiComponents';
import { MarketLabHero } from '../components/marketLab/MarketLabHero';
import { ResearchSection } from '../components/marketLab/ResearchSection';
import { ExperimentSection } from '../components/marketLab/ExperimentSection';
import { EvidenceLedgerGrid } from '../components/marketLab/EvidenceLedgerGrid';
import { DossierSection } from '../components/marketLab/DossierSection';
import { MarketReplaySection } from '../components/marketLab/MarketReplaySection';

export default function MarketLab() {
  const [volumeThreshold, setVolumeThreshold] = useState(1.25);
  const [oiThreshold, setOiThreshold] = useState(2);
  const [forwardDays, setForwardDays] = useState(2);
  const [researchQuery, setResearchQuery] = useState('INFY');
  const [market, setMarket] = useState('IN');
  const [assetType, setAssetType] = useState('STOCKS');
  const [exchange, setExchange] = useState('NSE');
  const [researchMode, setResearchMode] = useState('simple');
  const [researchResult, setResearchResult] = useState(null);
  const [researchStatus, setResearchStatus] = useState('idle');
  const [result, setResult] = useState(() => runExperiment(DEMO_DAYS, 1.25, 2, 2));
  const [replayIndex, setReplayIndex] = useState(0);

  const run = useCallback(() => setResult(runExperiment(DEMO_DAYS, volumeThreshold, oiThreshold, forwardDays)), [volumeThreshold, oiThreshold, forwardDays]);
  const reset = useCallback(() => {
    setVolumeThreshold(1.25);
    setOiThreshold(2);
    setForwardDays(2);
    setResult(runExperiment(DEMO_DAYS, 1.25, 2, 2));
  }, []);

  const runResearch = useCallback(async () => {
    const query = researchQuery.trim();
    if (!query) {
      setResearchResult({ entity: 'Unknown', status: 'UNSUPPORTED', dossier: null, message: 'Enter a company name or symbol before starting research.' });
      setResearchStatus('blocked');
      return;
    }
    setResearchStatus('running');
    setResearchResult(null);

    try {
      const res = await executeResearch({
        query,
        market,
        assetType,
        exchange,
        fetcher: async request => {
          const requestedSymbol = request.index?.symbol ?? (request.issuer === 'Infosys Limited' ? 'INFY' : query);
          const { data, error } = await supabase.functions.invoke('market-research', {
            body: { query: requestedSymbol, market, assetType, exchange }
          });
          if (error) throw new Error(error.message || 'Research function failed.');
          if (!data?.records) throw new Error(data?.error || 'Research function returned no records.');
          return data.records;
        }
      });

      setResearchResult({
        entity: res.entity?.symbol ?? query.toUpperCase(),
        status: res.status,
        dossier: res.dossier ?? null,
        message: res.message ?? (res.status === 'READY' ? 'Research completed.' : 'Research completed with incomplete evidence coverage.'),
        connector: res.connector ?? null
      });
      setResearchStatus(res.status === 'FAILED' || res.status === 'BLOCKED' || res.status === 'UNSUPPORTED' ? 'blocked' : 'complete');
    } catch (error) {
      setResearchResult({ entity: query.toUpperCase(), status: 'FAILED', dossier: null, message: error.message || 'Research failed.' });
      setResearchStatus('blocked');
    }
  }, [researchQuery, market, assetType, exchange]);

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
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white"><ArrowLeft size={16} /> OrbitBoard home</Link>
        <MarketLabHero />
        <ResearchSection
          market={market}
          setMarket={setMarket}
          assetType={assetType}
          setAssetType={setAssetType}
          exchange={exchange}
          setExchange={setExchange}
          researchMode={researchMode}
          setResearchMode={setResearchMode}
          researchQuery={researchQuery}
          setResearchQuery={setResearchQuery}
          runResearch={runResearch}
          researchResult={researchResult}
          researchStatus={researchStatus}
        />

        <div className="mt-6 grid lg:grid-cols-[1.1fr_.9fr] gap-6">
          <ExperimentSection volumeThreshold={volumeThreshold} setVolumeThreshold={setVolumeThreshold} oiThreshold={oiThreshold} setOiThreshold={setOiThreshold} forwardDays={forwardDays} setForwardDays={setForwardDays} reset={reset} run={run} />
          <EvidenceLedgerGrid result={result} />
        </div>
        <DossierSection />
        <MarketReplaySection replayIndex={replayIndex} setReplayIndex={setReplayIndex} />

        <section className="mt-6 grid md:grid-cols-3 gap-4">
          <FeatureCard title="Evidence first" text="Turn a hypothesis into measurable historical conditions instead of relying on a conversational guess." />
          <FeatureCard title="Replay the context" text="Inspect what the market record looked like at a point in time before seeing the later outcome." />
          <FeatureCard title="Research, don't predict" text="OrbitBoard helps users investigate market behaviour; it does not tell them what to buy or sell." />
        </section>

        <section className="mt-8 rounded-2xl border border-amber-900/50 bg-amber-950/20 p-5 text-sm leading-6 text-amber-200/80">
          <strong className="text-amber-200">Prototype note:</strong> Historical filing research currently supports Infosys on NSE and selected Indian indices. Market prices and live quotes are not yet connected; the experiment and replay panels use synthetic demo data.
        </section>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-violet-500/50 hover:text-white">Back to OrbitBoard</Link>
          <Link to="/tools" className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-400">Explore tools</Link>
        </div>
        <p className="mt-10 text-xs text-slate-600">Demo market data shown in the experiment and replay panels is fictional and exists only to demonstrate the workflow.</p>
      </main>
    </div>
  );
}
