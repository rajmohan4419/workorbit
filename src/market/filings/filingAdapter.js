import { createFilingRecord, FILING_STATUS, FILING_TYPES } from './filingModel';
import { createSourceDescriptor, SOURCE_CAPABILITIES, SOURCE_TRUST } from '../sources/sourceContract';

export const filingSource = createSourceDescriptor({
  id: 'primary-filings',
  provider: 'Primary disclosure feed',
  trust: SOURCE_TRUST.PRIMARY,
  capabilities: [SOURCE_CAPABILITIES.CORPORATE_ACTIONS, SOURCE_CAPABILITIES.FUNDAMENTALS]
});

const TYPE_MAP = {
  results: FILING_TYPES.FINANCIAL_RESULT,
  annual_report: FILING_TYPES.ANNUAL_REPORT,
  corporate_action: FILING_TYPES.CORPORATE_ACTION,
  shareholding: FILING_TYPES.SHAREHOLDING,
  board: FILING_TYPES.BOARD_DISCLOSURE
};

export const filingAdapter = {
  source: filingSource,

  normalize(payload, context = {}) {
    if (!Array.isArray(payload)) {
      throw new TypeError('Filing adapter expects an array of filings.');
    }

    const warnings = [];
    const records = payload.map((item, index) => {
      const type = TYPE_MAP[item?.type] ?? FILING_TYPES.OTHER;
      const missing = ['issuer', 'title', 'publishedAt', 'url'].filter(key => !item?.[key]);

      if (missing.length) {
        warnings.push('Filing ' + index + ' missing: ' + missing.join(', '));
      }

      return createFilingRecord({
        issuer: item?.issuer ?? context.issuer ?? 'UNKNOWN',
        identifiers: item?.identifiers ?? context.identifiers ?? [],
        type,
        status: item?.status ?? FILING_STATUS.UNKNOWN,
        title: item?.title ?? 'Untitled filing',
        publishedAt: item?.publishedAt ?? context.retrievedAt ?? new Date().toISOString(),
        effectiveAt: item?.effectiveAt ?? null,
        url: item?.url ?? filingSource.baseUrl ?? 'about:blank',
        source: {
          id: filingSource.id,
          provider: item?.provider ?? filingSource.provider,
          trust: SOURCE_TRUST.PRIMARY,
          url: item?.url ?? filingSource.baseUrl
        },
        retrievedAt: context.retrievedAt ?? new Date().toISOString(),
        contentHash: item?.contentHash ?? null,
        relatedEvidenceIds: item?.relatedEvidenceIds ?? [],
        notes: missing.length ? 'Missing fields: ' + missing.join(', ') : null
      });
    });

    return { records, source: filingSource, warnings };
  }
};
