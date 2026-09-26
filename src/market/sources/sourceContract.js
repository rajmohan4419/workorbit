/**
 * Market Lab — Source Adapter Contract
 *
 * Providers may expose wildly different payloads. Adapters translate them
 * into this contract before Market Lab sees the data.
 */

export const SOURCE_CAPABILITIES = Object.freeze({
  QUOTE: 'quote',
  OHLCV: 'ohlcv',
  FUNDAMENTALS: 'fundamentals',
  SHAREHOLDING: 'shareholding',
  CORPORATE_ACTIONS: 'corporate_actions',
  NEWS: 'news'
});

export const SOURCE_TRUST = Object.freeze({
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
  DISCOVERY: 'DISCOVERY'
});

export function createSourceDescriptor({
  id,
  provider,
  trust = SOURCE_TRUST.SECONDARY,
  capabilities = [],
  baseUrl = null
}) {
  if (!id || !provider) throw new Error('Source id and provider are required.');

  return Object.freeze({
    id,
    provider,
    trust,
    capabilities: [...new Set(capabilities)],
    baseUrl
  });
}

/**
 * Adapter interface:
 *
 * normalize(payload, context) -> {
 *   records: EvidenceRecord[],
 *   source: SourceDescriptor,
 *   warnings: string[]
 * }
 *
 * Adapters must never silently drop malformed observations.
 */
export function assertSourceAdapter(adapter) {
  if (!adapter || typeof adapter.normalize !== 'function') {
    throw new TypeError('A source adapter must expose normalize(payload, context).');
  }
  if (!adapter.source?.id || !adapter.source?.provider) {
    throw new TypeError('A source adapter must expose a valid source descriptor.');
  }
  return adapter;
}

export function normalizeAdapterResult(result) {
  if (!result || !Array.isArray(result.records)) {
    throw new TypeError('Adapter normalization must return a records array.');
  }

  return {
    records: result.records,
    source: result.source ?? null,
    warnings: Array.isArray(result.warnings) ? result.warnings : []
  };
}
