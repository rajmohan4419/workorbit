import { RECONCILIATION_STATUS } from '../reconciliation';
import { createSignal, SIGNAL_STATUS, SIGNAL_TYPES } from './signalModel';

function buildGenericSignal(item) {
  const blocked = item.status === RECONCILIATION_STATUS.CONFLICTED
    || item.status === RECONCILIATION_STATUS.INVALID
    || item.status === RECONCILIATION_STATUS.INSUFFICIENT_DATA;

  const evidenceIds = item.observations?.map(observation => observation.evidenceId) ?? [];

  return createSignal({
    id: `sig_${item.key}`,
    entity: null,
    type: SIGNAL_TYPES.FUNDAMENTAL_CHANGE,
    status: blocked ? SIGNAL_STATUS.BLOCKED : SIGNAL_STATUS.ACTIVE,
    direction: 'NEUTRAL',
    strength: item.status === RECONCILIATION_STATUS.AGREED ? 'OBSERVATION' : 'SINGLE_SOURCE',
    headline: `Evidence state: ${item.status}`,
    evidenceIds,
    sourceCount: item.sourceCount ?? 0,
    rationale: blocked
      ? 'Signal generation is blocked because the underlying evidence is not reconciled.'
      : item.rationale
  });
}

export function buildSignals(reconciliation) {
  if (!reconciliation?.results) return [];

  return reconciliation.results.map(buildGenericSignal);
}
