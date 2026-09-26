import { createSignal, SIGNAL_STATUS, SIGNAL_TYPES } from './signalModel';

export function buildNewsSignals(newsReconciliations = []) {
  return newsReconciliations.map(item => {
    const statuses = item.observations?.map(observation => observation.status) ?? [];
    const verified = statuses.length > 0 && statuses.every(status => status === 'VERIFIED');
    const blocked = item.status !== 'AGREED' || !verified;

    const observation = item.observations?.[0];
    const value = observation?.value ?? {};
    const direction = value.direction ?? 'NEUTRAL';

    return createSignal({
      id: `sig_news_${item.key}`,
      entity: value.entity ?? null,
      type: SIGNAL_TYPES.NEWS_EVENT,
      status: blocked ? SIGNAL_STATUS.BLOCKED : SIGNAL_STATUS.ACTIVE,
      direction,
      strength: value.materiality ?? 'OBSERVATION',
      headline: value.headline ?? 'News event observed',
      evidenceIds: item.observations?.map(item => item.evidenceId) ?? [],
      sourceCount: item.sourceCount ?? 0,
      rationale: blocked
        ? item.status !== 'AGREED'
          ? 'News evidence is not sufficiently reconciled for signal use.'
          : 'News evidence is consistent, but signal use remains blocked until the contributing source evidence is verified.'
        : 'A timestamped news event was observed, reconciled, and verified.',
      observedAt: value.publishedAt ?? observation?.publishedAt ?? observation?.retrievedAt ?? null
    });
  });
}
