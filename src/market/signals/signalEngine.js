import { RECONCILIATION_STATUS } from '../reconciliation';
import { createSignal, SIGNAL_STATUS, SIGNAL_TYPES } from './signalModel';

function signalTypeForMetric(metricKey = '') {
  if (metricKey === 'news_event') return SIGNAL_TYPES.NEWS_EVENT;
  if (metricKey.includes('close') || metricKey.includes('price')) return SIGNAL_TYPES.PRICE_STRUCTURE;
  if (metricKey.includes('volume') || metricKey.includes('oi')) return SIGNAL_TYPES.VOLUME_ACTIVITY;
  return SIGNAL_TYPES.FUNDAMENTAL_CHANGE;
}

function buildGenericSignal(item) {
  const blocked = item.status === RECONCILIATION_STATUS.CONFLICTED
    || item.status === RECONCILIATION_STATUS.INVALID
    || item.status === RECONCILIATION_STATUS.INSUFFICIENT_DATA;

  const evidenceIds = item.observations?.map(observation => observation.evidenceId) ?? [];

  return createSignal({
    id: `sig_${item.key}`,
    entity: item.entity ?? null,
    type: signalTypeForMetric(item.metric?.key),
    status: blocked ? SIGNAL_STATUS.BLOCKED : SIGNAL_STATUS.ACTIVE,
    direction: 'NEUTRAL',
    strength: item.status === RECONCILIATION_STATUS.AGREED
      ? 'RECONCILED'
      : item.status === RECONCILIATION_STATUS.SINGLE_SOURCE
        ? 'SINGLE_SOURCE'
        : 'BLOCKED',
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
