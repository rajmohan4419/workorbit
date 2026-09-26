import { createEvidenceRecord, EVIDENCE_KINDS, EVIDENCE_STATUS } from '../evidence';
import { createSourceDescriptor, SOURCE_CAPABILITIES, SOURCE_TRUST } from './sourceContract';

export const demoSource = createSourceDescriptor({
  id: 'orbitboard-demo',
  provider: 'OrbitBoard synthetic dataset',
  trust: SOURCE_TRUST.DISCOVERY,
  capabilities: [SOURCE_CAPABILITIES.OHLCV]
});

export const demoAdapter = {
  source: demoSource,

  normalize(payload, context = {}) {
    if (!Array.isArray(payload)) {
      throw new TypeError('Demo OHLCV payload must be an array.');
    }

    const sourceUrl = context.sourceUrl ?? 'https://orbitboard.in/market-lab';

    const records = [];
    for (const row of payload) {
      if (!row?.date) {
        records.push(createEvidenceRecord({
          entity: { symbol: context.symbol ?? 'DEMO', exchange: context.exchange ?? 'DEMO' },
          metric: { key: 'ohlcv_row', label: 'OHLCV row' },
          value: null,
          period: { asOf: new Date().toISOString() },
          source: { provider: demoSource.provider, url: sourceUrl, sourceId: demoSource.id, trust: demoSource.trust },
          status: EVIDENCE_STATUS.UNVERIFIED,
          notes: 'Malformed source row: missing date.'
        }));
        continue;
      }

      for (const [key, value] of [
        ['open', row.open],
        ['high', row.high],
        ['low', row.low],
        ['close', row.close],
        ['volume_index', row.volume],
        ['open_interest_index', row.oi]
      ]) {
        records.push(createEvidenceRecord({
          entity: { symbol: context.symbol ?? 'DEMO', exchange: context.exchange ?? 'DEMO' },
          metric: { key, label: key.replaceAll('_', ' ') },
          value,
          unit: key.includes('index') ? 'x' : 'INR',
          period: { asOf: row.date },
          source: { provider: demoSource.provider, url: sourceUrl, sourceId: demoSource.id, trust: demoSource.trust },
          kind: EVIDENCE_KINDS.FACT,
          status: EVIDENCE_STATUS.UNVERIFIED,
          retrievedAt: context.retrievedAt
        }));
      }
    }

    return { records, source: demoSource, warnings: [] };
  }
};
