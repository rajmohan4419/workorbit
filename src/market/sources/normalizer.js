import { createEvidenceRecord, EVIDENCE_KINDS, EVIDENCE_STATUS } from '../evidence';
import { assertSourceAdapter, normalizeAdapterResult } from './sourceContract';

export function normalizeSourcePayload(adapter, payload, context = {}) {
  assertSourceAdapter(adapter);

  const result = normalizeAdapterResult(adapter.normalize(payload, context));
  const records = result.records.map(record => {
    if (record.source) return record;

    return createEvidenceRecord({
      ...record,
      source: {
        provider: result.source.provider,
        url: context.sourceUrl ?? result.source.baseUrl ?? 'about:blank',
        sourceId: result.source.id,
        trust: result.source.trust
      },
      kind: record.kind ?? EVIDENCE_KINDS.FACT,
      status: record.status ?? EVIDENCE_STATUS.UNVERIFIED
    });
  });

  return {
    ...result,
    records
  };
}
