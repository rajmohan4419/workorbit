/**
 * Market Lab — Signal Model
 *
 * Signals are deterministic interpretations of reconciled evidence.
 * They never replace evidence and never resolve evidence conflicts.
 */

export const SIGNAL_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE'
});

export const SIGNAL_TYPES = Object.freeze({
  PRICE_STRUCTURE: 'PRICE_STRUCTURE',
  VOLUME_ACTIVITY: 'VOLUME_ACTIVITY',
  FUNDAMENTAL_CHANGE: 'FUNDAMENTAL_CHANGE',
  NEWS_EVENT: 'NEWS_EVENT',
  CONTRADICTION: 'CONTRADICTION'
});

export function createSignal({
  id,
  entity,
  type,
  status = SIGNAL_STATUS.ACTIVE,
  direction = 'NEUTRAL',
  strength = 'OBSERVATION',
  headline,
  evidenceIds = [],
  sourceCount = 0,
  rationale,
  observedAt = null
}) {
  return {
    id,
    entity,
    type,
    status,
    direction,
    strength,
    headline,
    evidenceIds,
    sourceCount,
    rationale,
    observedAt
  };
}
