import { Activity, TrendingUp, BarChart3 } from 'lucide-react';
import { Metric } from './MarketLabUiComponents';
import { DEMO_DOSSIER } from './marketLabData';
import { DOSSIER_STATUS } from '../../market/dossier';

export function DossierSection() {
  return (
    <section className="mt-6 rounded-2xl border border-cyan-900/60 bg-slate-900/70 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-400">Research dossier</p>
          <h2 className="mt-1 text-2xl font-black">One auditable view of the evidence</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            The dossier assembles market, fundamentals, valuation, technicals, corporate events and news coverage without inventing missing sections.
          </p>
        </div>
        <span className="rounded-full border border-cyan-800/60 bg-cyan-950/30 px-3 py-1.5 text-xs font-bold text-cyan-300">
          {DEMO_DOSSIER.status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric icon={Activity} label="Evidence" value={DEMO_DOSSIER.dataQuality.evidenceCount} />
        <Metric icon={TrendingUp} label="Verified" value={DEMO_DOSSIER.dataQuality.verifiedEvidenceCount} />
        <Metric icon={BarChart3} label="Blocked signals" value={DEMO_DOSSIER.dataQuality.blockedSignalCount} />
        <Metric icon={Activity} label="Contradictions" value={DEMO_DOSSIER.dataQuality.contradictionCount} />
      </div>

      <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(DEMO_DOSSIER.sections).map(([section, value]) => (
          <div key={section} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{section}</p>
            <p className="mt-2 text-sm font-semibold text-white">{value.status}</p>
            <p className="mt-1 text-xs text-slate-600">{value.evidenceCount} evidence records</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs leading-5 text-slate-600">
        Dossier status is {DEMO_DOSSIER.status}.{' '}
        {DEMO_DOSSIER.status === DOSSIER_STATUS.PARTIAL
          ? 'The demo intentionally contains incomplete/unverified and conflicting evidence, so the dossier is not presented as fully ready.'
          : ''}
      </p>
    </section>
  );
}
