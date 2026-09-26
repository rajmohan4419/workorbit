export const FILING_TYPES = Object.freeze({
  FINANCIAL_RESULT: 'FINANCIAL_RESULT',
  ANNUAL_REPORT: 'ANNUAL_REPORT',
  CORPORATE_ACTION: 'CORPORATE_ACTION',
  SHAREHOLDING: 'SHAREHOLDING',
  BOARD_DISCLOSURE: 'BOARD_DISCLOSURE',
  OTHER: 'OTHER'
});

export const FILING_STATUS = Object.freeze({
  PUBLISHED: 'PUBLISHED',
  AMENDED: 'AMENDED',
  WITHDRAWN: 'WITHDRAWN',
  UNKNOWN: 'UNKNOWN'
});

export function createFilingRecord({
  id,
  issuer,
  identifiers = [],
  type = FILING_TYPES.OTHER,
  status = FILING_STATUS.PUBLISHED,
  title,
  publishedAt,
  effectiveAt = null,
  url,
  source,
  retrievedAt = new Date().toISOString(),
  contentHash = null,
  relatedEvidenceIds = [],
  notes = null
}) {
  if (!issuer || !title || !publishedAt || !url || !source) {
    throw new Error('Filing issuer, title, publishedAt, url and source are required.');
  }

  return {
    id: id ?? createFilingId(issuer, title, publishedAt, source),
    issuer,
    identifiers,
    type,
    status,
    title,
    publishedAt,
    effectiveAt,
    url,
    source,
    retrievedAt,
    contentHash,
    relatedEvidenceIds,
    notes
  };
}

function createFilingId(issuer, title, publishedAt, source) {
  const identity = [issuer, title, publishedAt, source?.provider ?? ''].join('|');
  let hash = 2166136261;
  for (let i = 0; i < identity.length; i += 1) {
    hash ^= identity.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 'fil_' + (hash >>> 0).toString(16).padStart(8, '0');
}
