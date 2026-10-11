import { Activity, TrendingUp, BarChart3 } from 'lucide-react';
import { Metric } from './MarketLabUiComponents';
import {
  DEMO_EVIDENCE_VALIDATION,
  DEMO_SOURCE_VALIDATION,
  RECONCILIATION_DEMO,
  DEMO_RECONCILIATION,
  DEMO_CONTRADICTIONS,
  DEMO_NEWS_SUMMARY,
  DEMO_NEWS_INTELLIGENCE
} from './marketLabData';
import { RECONCILIATION_STATUS } from '../../market/reconciliation';

export function EvidenceLedgerGrid({ result }) {
  const evidenceValidation = DEMO_EVIDENCE_VALIDATION;
  const sourceValidation = DEMO_SOURCE_VALIDATION;

  return (
    <>
      <section className="rounded-2xl border border-[#e7dfd3] bg-white p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-400">Evidence integrity</p>
        <h2 className="mt-1 text-xl font-black">Evidence ledger validation</h2>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric icon={Activity} label="Records" value={evidenceValidation.summary.total} />
          <Metric icon={TrendingUp} label="Valid" value={evidenceValidation.summary.valid} />
          <Metric icon={BarChart3} label="Conflicts" value={evidenceValidation.summary.conflicts} />
        </div>
        <div className="mt-5 rounded-xl border border-[#e7dfd3] bg-[#fbf8f3] p-3 text-xs leading-5">
          <p className={evidenceValidation.valid ? 'text-emerald-300' : 'text-rose-300'}>
            {evidenceValidation.valid ? 'Schema validation passed.' : 'Schema validation failed.'}
          </p>
          <p className="mt-1 text-stone-500">
            Source adapter normalized {sourceValidation.summary.total} atomic records. Invalid or missing observations are preserved for validation instead of being silently discarded.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e7dfd3] bg-white p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-amber-400">Reconciliation gate</p>
        <h2 className="mt-1 text-xl font-black">Conflicts stay visible</h2>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric icon={Activity} label="Keys checked" value={RECONCILIATION_DEMO.summary.totalKeys} />
          <Metric icon={TrendingUp} label="Agreed" value={RECONCILIATION_DEMO.summary.agreed} />
          <Metric icon={BarChart3} label="Conflicted" value={RECONCILIATION_DEMO.summary.conflicted} />
        </div>
        <div className="mt-5 rounded-xl border border-amber-900/60 bg-amber-50 p-3 text-xs leading-5">
          <p className="font-bold text-amber-300">
            {DEMO_RECONCILIATION.status === RECONCILIATION_STATUS.CONFLICTED ? 'CONFLICTED — signal use blocked' : DEMO_RECONCILIATION.status}
          </p>
          <p className="mt-1 text-amber-900/70">{DEMO_RECONCILIATION.rationale}</p>
          <p className="mt-1 text-stone-500">
            Demo revenue observations: 12.4 Cr, 12.1 Cr, 12.4 Cr. Market Lab does not silently select the majority or a preferred provider.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-900/60 bg-white p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-rose-400">Contradiction engine</p>
        <h2 className="mt-1 text-xl font-black">Don't let a positive story hide negative evidence</h2>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric icon={Activity} label="Contradictions" value={DEMO_CONTRADICTIONS.summary.total} />
          <Metric icon={TrendingUp} label="High/Critical" value={DEMO_CONTRADICTIONS.summary.highOrCritical} />
          <Metric icon={BarChart3} label="Rule types" value={Object.values(DEMO_CONTRADICTIONS.summary.byType).filter(Boolean).length} />
        </div>
        {DEMO_CONTRADICTIONS.contradictions.slice(0, 3).map(item => (
          <div key={item.type} className="mt-4 rounded-xl border border-rose-900/50 bg-rose-950/20 p-3 text-xs leading-5">
            <p className="font-bold text-rose-300">{item.severity} · {item.type}</p>
            <p className="mt-1 text-rose-200/70">{item.rationale}</p>
            <p className="mt-1 text-stone-500">Evidence IDs: {item.evidenceIds.length} · Period: {item.period?.end ?? item.period?.asOf ?? 'n/a'}</p>
          </div>
        ))}
        {DEMO_CONTRADICTIONS.summary.total === 0 && (
          <p className="mt-4 text-xs text-stone-500">No contradiction detected under the active rules and evidence requirements.</p>
        )}
      </section>

      <section className="rounded-2xl border border-cyan-900/60 bg-white p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-400">News intelligence</p>
        <h2 className="mt-1 text-xl font-black">Freshness is not the same as truth</h2>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric icon={Activity} label="Fresh" value={DEMO_NEWS_SUMMARY.fresh} />
          <Metric icon={TrendingUp} label="Aging / stale" value={DEMO_NEWS_SUMMARY.aging + DEMO_NEWS_SUMMARY.stale} />
          <Metric icon={BarChart3} label="Duplicates" value={DEMO_NEWS_SUMMARY.exactDuplicates + DEMO_NEWS_SUMMARY.possibleDuplicates} />
        </div>
        <div className="mt-5 space-y-2">
          {DEMO_NEWS_INTELLIGENCE.map(record => (
            <div key={record.id} className="rounded-xl border border-[#e7dfd3] bg-[#fbf8f3] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-stone-900">{record.value?.freshness}</span>
                <span className="text-[10px] font-bold text-stone-500">{record.value?.duplicateStatus}</span>
                <span className="text-[10px] text-stone-500">{record.source?.trust ?? 'UNKNOWN'} source</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-stone-600">{record.value?.headline}</p>
              <p className="mt-1 text-[10px] text-stone-500">
                Published {record.publishedAt ?? 'unknown'} · Retrieved {record.retrievedAt ?? 'unknown'}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-stone-500">
          Demo only. Freshness is calculated from publication time; retrieval time is retained for provenance. Duplicate detection flags repeats but does not merge distinct stories merely because headlines resemble each other.
        </p>
      </section>

      <section className="rounded-2xl border border-[#e7dfd3] bg-white p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-400">Evidence</p>
        <h2 className="mt-1 text-xl font-black">Observed in demo data</h2>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric icon={Activity} label="Occurrences" value={result.occurrences} />
          <Metric icon={TrendingUp} label="Positive" value={`${result.positiveRate.toFixed(1)}%`} />
          <Metric icon={BarChart3} label="Avg move" value={`${result.averageReturn >= 0 ? '+' : ''}${result.averageReturn.toFixed(2)}%`} />
        </div>
        <p className="mt-5 text-xs leading-5 text-stone-500">
          This is a deterministic demo dataset for the product prototype, not live market data, investment advice or a trading signal.
        </p>
      </section>
    </>
  );
}
