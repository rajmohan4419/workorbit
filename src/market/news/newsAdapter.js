import { createEvidenceRecord, EVIDENCE_KINDS, EVIDENCE_STATUS } from '../evidence';
import { createSourceDescriptor, SOURCE_CAPABILITIES, SOURCE_TRUST } from '../sources/sourceContract';

export const newsSource = createSourceDescriptor({
  id: 'market-news-feed',
  provider: 'External market news feed',
  trust: SOURCE_TRUST.SECONDARY,
  capabilities: [SOURCE_CAPABILITIES.NEWS]
});

/**
 * Expected normalized input:
 * [{
 *   symbol,
 *   exchange,
 *   headline,
 *   publishedAt,
 *   url,
 *   provider,
 *   direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
 *   materiality: 'LOW' | 'MEDIUM' | 'HIGH'
 * }]
 *
 * The adapter deliberately stores the publisher's direction as source
 * metadata; it does not infer sentiment from prose.
 */
export const newsAdapter = {
  source: newsSource,

  normalize(payload, context = {}) {
    if (!Array.isArray(payload)) {
      throw new TypeError('News adapter expects an array of news items.');
    }

    const warnings = [];
    const records = payload.map((item, index) => {
      const missing = ['symbol', 'headline', 'publishedAt', 'url'].filter(key => !item?.[key]);
      if (missing.length) warnings.push(`News item ${index} missing: ${missing.join(', ')}`);

      return createEvidenceRecord({
        entity: {
          symbol: item?.symbol ?? context.symbol ?? null,
          exchange: item?.exchange ?? context.exchange ?? null
        },
        metric: {
          key: 'news_event',
          label: 'Market news event'
        },
        value: {
          headline: item?.headline ?? null,
          url: item?.url ?? null,
          publisher: item?.provider ?? newsSource.provider,
          direction: item?.direction ?? 'NEUTRAL',
          materiality: item?.materiality ?? 'LOW',
          publishedAt: item?.publishedAt ?? null
        },
        unit: 'event',
        period: { asOf: item?.publishedAt ?? context.retrievedAt ?? null },
        source: {
          id: newsSource.id,
          provider: item?.provider ?? newsSource.provider,
          url: item?.url ?? newsSource.baseUrl
        },
        kind: EVIDENCE_KINDS.FACT,
        status: EVIDENCE_STATUS.UNVERIFIED,
        retrievedAt: context.retrievedAt ?? new Date().toISOString(),
        publishedAt: item?.publishedAt ?? null,
        notes: missing.length ? `Missing fields: ${missing.join(', ')}` : null
      });
    });

    return { records, source: newsSource, warnings };
  }
};
