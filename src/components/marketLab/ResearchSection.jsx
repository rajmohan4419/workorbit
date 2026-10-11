import { Activity, TrendingUp, BarChart3 } from 'lucide-react';
import { AccessibleCard, Metric } from './MarketLabUiComponents';
import { DEMO_CONTRADICTIONS, DEMO_DOSSIER } from './marketLabData';
import { DOSSIER_STATUS } from '../../market/dossier';

export function ResearchSection({
  researchMode,
  setResearchMode,
  researchQuery,
  setResearchQuery,
  runResearch,
  researchResult,
  researchStatus
}) {
  return (
    <section className="mt-6 rounded-3xl border border-violet-800/60 bg-slate-900/80 p-5 sm:p-7 shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-violet-400">Simple research</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-black">Ask about a company. Get the evidence in plain English.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Accessible mode changes how Market Lab explains evidence — not the evidence standards underneath it.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1" role="group" aria-label="Research display mode">
          <button
            type="button"
            onClick={() => setResearchMode('simple')}
            aria-pressed={researchMode === 'simple'}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${researchMode === 'simple' ? 'bg-violet-500 text-white' : 'text-slate-500 hover:text-white'}`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setResearchMode('deep')}
            aria-pressed={researchMode === 'deep'}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${researchMode === 'deep' ? 'bg-violet-500 text-white' : 'text-slate-500 hover:text-white'}`}
          >
            Deep
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <label className="sr-only" htmlFor="market-research-company">Company or symbol</label>
        <input
          id="market-research-company"
          value={researchQuery}
          onChange={e => setResearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setResearchQuery(e.currentTarget.value.trim() || 'DEMO');
              runResearch();
            }
          }}
          placeholder="Try Infosys, INFY, NIFTY 50, NIFTY BANK..."
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        />
        <button type="button" onClick={runResearch} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-white hover:bg-violet-400">
          Research
        </button>
      </div>

      <div className="mt-5 grid md:grid-cols-3 gap-3">
        {researchResult && researchResult.entity !== 'DEMO' ? (
          <>
            <AccessibleCard
              label="What changed?"
              value={
                researchResult.dossier
                  ? `${researchResult.dossier.dataQuality.evidenceCount} evidence record(s) collected from the primary source. ${researchResult.dossier.dataQuality.verifiedEvidenceCount} currently verified.`
                  : 'The research run did not produce a dossier.'
              }
              tone="violet"
            />
            <AccessibleCard
              label="What doesn't line up?"
              value={
                researchResult.dossier?.dataQuality.contradictionCount
                  ? `${researchResult.dossier.dataQuality.contradictionCount} contradiction(s) need investigation.`
                  : 'No contradiction was detected in the evidence currently collected.'
              }
              tone="rose"
            />
            <AccessibleCard
              label="How reliable is this?"
              value={
                researchResult.status === 'READY'
                  ? 'Evidence coverage passed the current dossier gate.'
                  : 'Coverage is partial — missing or unverified evidence remains visible.'
              }
              tone="amber"
            />
          </>
        ) : (
          <>
            <AccessibleCard label="What changed?" value="Demo evidence shows price activity, financial observations and news signals." tone="violet" />
            <AccessibleCard
              label="What doesn't line up?"
              value={
                DEMO_CONTRADICTIONS.summary.total
                  ? `${DEMO_CONTRADICTIONS.summary.total} contradiction(s) need investigation.`
                  : 'No contradiction detected in the available evidence.'
              }
              tone="rose"
            />
            <AccessibleCard
              label="How reliable is this?"
              value={
                DEMO_DOSSIER.status === DOSSIER_STATUS.READY
                  ? 'Evidence coverage is complete and verified.'
                  : 'Coverage is partial — missing or unverified evidence remains visible.'
              }
              tone="amber"
            />
          </>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Research question</p>
        <p className="mt-2 text-sm font-semibold text-white">{researchQuery || 'DEMO'}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {researchMode === 'simple'
            ? 'Simple mode explains the evidence without analyst jargon. It does not turn incomplete evidence into a conclusion.'
            : 'Deep mode exposes the underlying evidence, reconciliation, contradiction and provenance layers.'}
        </p>
      </div>

      {researchStatus === 'running' && (
        <div className="mt-4 rounded-xl border border-violet-800/60 bg-violet-950/20 p-4 text-sm text-violet-200" role="status">
          Researching <strong>{researchQuery.trim() || 'DEMO'}</strong>…
        </div>
      )}

      {researchResult && researchStatus !== 'running' && (
        <div
          className={`mt-4 rounded-xl border p-4 ${
            researchStatus === 'complete' ? 'border-emerald-800/60 bg-emerald-950/20' : 'border-amber-800/60 bg-amber-950/20'
          }`}
          role="status"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Research result · {researchResult.entity}</p>
            <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-400">{researchResult.status}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{researchResult.message}</p>
          {researchResult.dossier && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Metric icon={Activity} label="Evidence" value={researchResult.dossier.dataQuality.evidenceCount} />
              <Metric icon={TrendingUp} label="Verified" value={researchResult.dossier.dataQuality.verifiedEvidenceCount} />
              <Metric icon={BarChart3} label="Contradictions" value={researchResult.dossier.dataQuality.contradictionCount} />
              <Metric icon={Activity} label="Blocked signals" value={researchResult.dossier.dataQuality.blockedSignalCount} />
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['What changed?', 'What are the risks?', 'Why is this contradictory?', 'Show the sources'].map(question => (
          <button
            key={question}
            type="button"
            onClick={() => setResearchQuery(question)}
            className="rounded-full border border-slate-700 px-3 py-1.5 font-semibold text-slate-400 hover:border-violet-500/60 hover:text-white"
          >
            {question}
          </button>
        ))}
      </div>
    </section>
  );
}
