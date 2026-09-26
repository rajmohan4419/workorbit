/**
 * Market Lab — Evidence Model
 *
 * Evidence is the atomic unit of research. A record is either:
 * FACT, CALCULATION, OBSERVATION, or INTERPRETATION.
 *
 * AI/UI layers should consume these records; they should not invent them.
 */

export const EVIDENCE_KINDS = Object.freeze({
  FACT: 'FACT',
  CALCULATION: 'CALCULATION',
  OBSERVATION: 'OBSERVATION',
  INTERPRETATION: 'INTERPRETATION'
});

export const EVIDENCE_STATUS = Object.freeze({
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  CONFLICTED: 'CONFLICTED',
  STALE: 'STALE'
});

export function createEvidenceRecord({
  id,
  entity,
  metric,
  value,
  unit = null,
  period = null,
  source,
  kind = EVIDENCE_KINDS.FACT,
  status = EVIDENCE_STATUS.UNVERIFIED,
  retrievedAt = new Date().toISOString(),
  publishedAt = null,
  inputs = [],
  methodology = null,
  notes = null
}) {
  return {
    id: id ?? createEvidenceId(entity, metric, period, source),
    entity,
    metric,
    value,
    unit,
    period,
    source,
    kind,
    status,
    provenance: {
      inputs,
      methodology,
      notes
    },
    publishedAt,
    retrievedAt
  };
}

export function createEvidenceId(entity, metric, period, source) {
  const identity = [
    entity?.exchange ?? '',
    entity?.symbol ?? '',
    metric?.key ?? '',
    period?.end ?? period?.asOf ?? '',
    source?.provider ?? ''
  ].join('|');

  return 'ev_' + stableHash(identity);
}

export function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function evidenceKey(record) {
  return [
    record.entity?.exchange ?? '',
    record.entity?.symbol ?? '',
    record.metric?.key ?? '',
    record.period?.end ?? record.period?.asOf ?? ''
  ].join('|');
}
