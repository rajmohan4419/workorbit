import { createEvidenceRecord, EVIDENCE_KINDS, EVIDENCE_STATUS } from '../evidence';

export function indexRecordsToEvidence(records = [], entity, context = {}) {
  return records.map((record, index) => createEvidenceRecord({
    id: record.id ?? 'idx_ev_' + entity.symbol.toLowerCase() + '_' + index,
    entity,
    metric: { key: record.metric ?? 'index_definition', label: record.label ?? entity.name },
    value: record.value,
    unit: record.unit ?? null,
    period: record.period ?? { asOf: context.retrievedAt ?? new Date().toISOString() },
    source: record.source,
    kind: record.kind ?? EVIDENCE_KINDS.FACT,
    status: record.status ?? EVIDENCE_STATUS.UNVERIFIED,
    retrievedAt: record.retrievedAt ?? context.retrievedAt ?? new Date().toISOString(),
    publishedAt: record.publishedAt ?? null,
    notes: record.notes ?? null
  }));
}
