import { EVIDENCE_STATUS } from '../evidence';
import { DOSSIER_SECTIONS, DOSSIER_STATUS, createResearchDossier } from './dossierModel';

const SECTION_METRICS = {
  [DOSSIER_SECTIONS.MARKET]: ['close', 'open', 'high', 'low', 'volume_index', 'oi', 'price_change', 'price_trend'],
  [DOSSIER_SECTIONS.FUNDAMENTALS]: ['revenue', 'revenue_growth', 'profit', 'net_profit', 'profit_growth', 'operating_cash_flow', 'operating_cash_flow_growth', 'margin_change', 'debt', 'debt_growth', 'net_debt_growth'],
  [DOSSIER_SECTIONS.VALUATION]: ['pe', 'pb', 'ev_ebitda', 'market_cap', 'dividend_yield'],
  [DOSSIER_SECTIONS.TECHNICALS]: ['rsi', 'macd', 'moving_average', 'price_trend', 'support', 'resistance'],
  [DOSSIER_SECTIONS.CORPORATE_EVENTS]: ['corporate_action', 'earnings', 'agm', 'board_event'],
  [DOSSIER_SECTIONS.NEWS]: ['news_event']
};

function periodOf(record) {
  return record.period?.end ?? record.period?.asOf ?? record.publishedAt ?? record.retrievedAt;
}

function groupRecords(records, metricKeys) {
  return records.filter(record => metricKeys.includes(record.metric?.key));
}

function latest(records) {
  return [...records].sort((a, b) => String(periodOf(b)).localeCompare(String(periodOf(a))))[0] ?? null;
}

function evidenceStatus(records) {
  if (!records.length) return 'MISSING';
  if (records.some(record => record.status === EVIDENCE_STATUS.CONFLICTED)) return 'CONFLICTED';
  if (records.every(record => record.status === EVIDENCE_STATUS.VERIFIED)) return 'VERIFIED';
  return 'UNVERIFIED';
}

function buildSection(records, metricKeys) {
  const items = groupRecords(records, metricKeys);
  const byMetric = {};

  for (const metric of metricKeys) {
    const metricRecords = items.filter(record => record.metric?.key === metric);
    const current = latest(metricRecords);
    if (current) {
      byMetric[metric] = {
        value: current.value,
        unit: current.unit ?? null,
        period: current.period ?? null,
        status: current.status,
        evidenceId: current.id,
        source: current.source ?? null
      };
    }
  }

  return {
    status: evidenceStatus(items),
    metrics: byMetric,
    evidenceCount: items.length,
    evidenceIds: items.map(record => record.id)
  };
}

function entityRecords(records, entity) {
  return records.filter(record =>
    record.entity?.exchange === entity.exchange
    && record.entity?.symbol === entity.symbol
  );
}

export function buildResearchDossier({
  entity,
  asOf = new Date().toISOString(),
  evidence = [],
  reconciliations = { results: [] },
  signals = [],
  contradictions = { contradictions: [] }
}) {
  const scopedEvidence = entityRecords(evidence, entity);
  const sectionEntries = Object.entries(SECTION_METRICS).map(([section, keys]) => [
    section,
    buildSection(scopedEvidence, keys)
  ]);
  const sections = Object.fromEntries(sectionEntries);

  const contradictionItems = (contradictions.contradictions ?? []).filter(item =>
    item.entity?.exchange === entity.exchange && item.entity?.symbol === entity.symbol
  );

  const signalItems = signals.filter(signal =>
    signal.entity?.exchange === entity.exchange && signal.entity?.symbol === entity.symbol
  );

  const conflictedReconciliations = (reconciliations.results ?? []).filter(item =>
    item.entity?.exchange === entity.exchange
    && item.entity?.symbol === entity.symbol
    && item.status === 'CONFLICTED'
  );

  const allEvidenceVerified = scopedEvidence.length > 0
    && scopedEvidence.every(record => record.status === EVIDENCE_STATUS.VERIFIED);

  const hasBlockingConflict = conflictedReconciliations.length > 0;
  const status = !scopedEvidence.length
    ? DOSSIER_STATUS.BLOCKED
    : hasBlockingConflict
      ? DOSSIER_STATUS.PARTIAL
      : allEvidenceVerified
        ? DOSSIER_STATUS.READY
        : DOSSIER_STATUS.PARTIAL;

  const dataQuality = {
    evidenceCount: scopedEvidence.length,
    verifiedEvidenceCount: scopedEvidence.filter(record => record.status === EVIDENCE_STATUS.VERIFIED).length,
    unverifiedEvidenceCount: scopedEvidence.filter(record => record.status === EVIDENCE_STATUS.UNVERIFIED).length,
    conflictedEvidenceCount: scopedEvidence.filter(record => record.status === EVIDENCE_STATUS.CONFLICTED).length,
    reconciliationConflictCount: conflictedReconciliations.length,
    contradictionCount: contradictionItems.length,
    blockedSignalCount: signalItems.filter(signal => signal.status === 'BLOCKED').length
  };

  return createResearchDossier({
    id: `dossier_${entity.exchange}_${entity.symbol}_${String(asOf).replace(/[^0-9A-Za-z]/g, '')}`,
    entity,
    asOf,
    generatedAt: new Date().toISOString(),
    status,
    sections,
    evidenceIds: scopedEvidence.map(record => record.id),
    signalIds: signalItems.map(signal => signal.id),
    contradictionCount: contradictionItems.length,
    dataQuality
  });
}
