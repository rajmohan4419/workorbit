import { Activity, TrendingUp, BarChart3 } from 'lucide-react';
import { AccessibleCard, Metric } from './MarketLabUiComponents';
import { DEMO_CONTRADICTIONS, DEMO_DOSSIER } from './marketLabData';
import { DOSSIER_STATUS } from '../../market/dossier';
import { MARKET_OPTIONS, ASSET_OPTIONS, EXCHANGE_OPTIONS } from '../../market/marketSelection';

export function ResearchSection({
  market,
  setMarket,
  assetType,
  setAssetType,
  exchange,
  setExchange,
  researchMode,
  setResearchMode,
  researchQuery,
  setResearchQuery,
  runResearch,
  researchResult,
  researchStatus
}) {
  return (
    <section className="mt-6 rounded-3xl border border-violet-200 bg-white p-5 sm:p-7 shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-violet-700">Evidence-led market research</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-black">Choose a market. Investigate the evidence.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Market selection controls instrument resolution and connector eligibility. It never changes the evidence standards.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-[#e7dfd3] bg-[#fbf8f3] p-1" role="group" aria-label="Research display mode">
          <button type="button" onClick={() => setResearchMode('simple')} aria-pressed={researchMode === 'simple'} className={`rounded-lg px-3 py-2 text-xs font-bold ${researchMode === 'simple' ? 'bg-violet-500 text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}>Simple</button>
          <button type="button" onClick={() => setResearchMode('deep')} aria-pressed={researchMode === 'deep'} className={`rounded-lg px-3 py-2 text-xs font-bold ${researchMode === 'deep' ? 'bg-violet-500 text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}>Deep</button>
        </div>
      </div>

      <div className="mt-5 grid sm:grid-cols-3 gap-3">
        <label className="block text-xs font-bold text-stone-600">
          Market
          <select value={market} onChange={e => setMarket(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e7dfd3] bg-[#fbf8f3] px-3 py-3 text-sm text-stone-900 focus:border-violet-500 focus:outline-none">
            {MARKET_OPTIONS.map(option => <option key={option.value} value={option.value} disabled={option.status !== 'AVAILABLE'}>{option.label}{option.status === 'COMING_SOON' ? ' — coming soon' : ''}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold text-stone-600">
          Asset type
          <select value={assetType} onChange={e => setAssetType(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e7dfd3] bg-[#fbf8f3] px-3 py-3 text-sm text-stone-900 focus:border-violet-500 focus:outline-none">
            {ASSET_OPTIONS.map(option => <option key={option.value} value={option.value} disabled={option.status !== 'AVAILABLE'}>{option.label}{option.status === 'COMING_SOON' ? ' — coming soon' : ''}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold text-stone-600">
          Exchange
          <select value={exchange} onChange={e => setExchange(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e7dfd3] bg-[#fbf8f3] px-3 py-3 text-sm text-stone-900 focus:border-violet-500 focus:outline-none">
            {EXCHANGE_OPTIONS.map(option => <option key={option.value} value={option.value} disabled={option.status !== 'AVAILABLE'}>{option.label}{option.status === 'COMING_SOON' ? ' — coming soon' : ''}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <label className="sr-only" htmlFor="market-research-company">Company or symbol</label>
        <input
          id="market-research-company"
          value={researchQuery}
          onChange={e => setResearchQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') runResearch(); }}
          placeholder={assetType === 'INDICES' ? 'Try NIFTY 50, NIFTY BANK...' : 'Try Infosys or INFY'}
          className="min-w-0 flex-1 rounded-xl border border-[#e7dfd3] bg-[#fbf8f3] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        />
        <button type="button" onClick={runResearch} disabled={researchStatus === 'running'} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-stone-900 hover:bg-violet-400 disabled:cursor-wait disabled:opacity-60">
          {researchStatus === 'running' ? 'Researching…' : 'Research'}
        </button>
      </div>

      <div className="mt-5 grid md:grid-cols-3 gap-3">
        {researchResult && researchResult.entity !== 'DEMO' ? (
          <>
            <AccessibleCard label="What changed?" value={researchResult.dossier ? `${researchResult.dossier.dataQuality.evidenceCount} evidence record(s) collected from the primary source. ${researchResult.dossier.dataQuality.verifiedEvidenceCount} currently verified.` : 'The research run did not produce a dossier.'} tone="violet" />
            <AccessibleCard label="What doesn't line up?" value={researchResult.dossier?.dataQuality.contradictionCount ? `${researchResult.dossier.dataQuality.contradictionCount} contradiction(s) need investigation.` : 'No contradiction was detected in the evidence currently collected.'} tone="rose" />
            <AccessibleCard label="How reliable is this?" value={researchResult.status === 'READY' ? 'Evidence coverage passed the current dossier gate.' : 'Coverage is partial — missing or unverified evidence remains visible.'} tone="amber" />
          </>
        ) : (
          <>
            <AccessibleCard label="What changed?" value="Demo evidence shows price activity, financial observations and news signals." tone="violet" />
            <AccessibleCard label="What doesn't line up?" value={DEMO_CONTRADICTIONS.summary.total ? `${DEMO_CONTRADICTIONS.summary.total} contradiction(s) need investigation.` : 'No contradiction detected in the available evidence.'} tone="rose" />
            <AccessibleCard label="How reliable is this?" value={DEMO_DOSSIER.status === DOSSIER_STATUS.READY ? 'Evidence coverage is complete and verified.' : 'Coverage is partial — missing or unverified evidence remains visible.'} tone="amber" />
          </>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-[#e7dfd3] bg-[#fbf8f3] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Research configuration</p>
        <p className="mt-2 text-sm font-semibold text-stone-900">{market} · {exchange} · {assetType} · {researchQuery || 'No symbol entered'}</p>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          {researchMode === 'simple'
            ? 'Simple mode explains evidence in plain English without turning incomplete evidence into a conclusion.'
            : 'Deep mode exposes the underlying evidence, reconciliation, contradiction and provenance layers.'}
        </p>
      </div>

      {researchStatus === 'running' && <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-200" role="status">Researching {researchQuery.trim() || 'the selected instrument'}…</div>}

      {researchResult && researchStatus !== 'running' && (
        <div className={`mt-4 rounded-xl border p-4 ${researchStatus === 'complete' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`} role="status">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-600">Research result · {researchResult.entity}</p>
            <span className="rounded-full border border-[#e7dfd3] px-2 py-1 text-[10px] font-bold text-stone-600">{researchResult.status}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-700">{researchResult.message}</p>
          {researchResult.dossier && <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Metric icon={Activity} label="Evidence" value={researchResult.dossier.dataQuality.evidenceCount} />
            <Metric icon={TrendingUp} label="Verified" value={researchResult.dossier.dataQuality.verifiedEvidenceCount} />
            <Metric icon={BarChart3} label="Contradictions" value={researchResult.dossier.dataQuality.contradictionCount} />
            <Metric icon={Activity} label="Blocked signals" value={researchResult.dossier.dataQuality.blockedSignalCount} />
          </div>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['What changed?', 'What are the risks?', 'Why is this contradictory?', 'Show the sources'].map(question => (
          <button key={question} type="button" onClick={() => setResearchQuery(question)} className="rounded-full border border-[#e7dfd3] px-3 py-1.5 font-semibold text-stone-600 hover:border-violet-500/60 hover:text-stone-900">{question}</button>
        ))}
      </div>
      <p className="mt-4 text-xs text-stone-500">Pilot availability: India / NSE. Other markets and exchanges remain disabled until their data connectors are validated.</p>
    </section>
  );
}
