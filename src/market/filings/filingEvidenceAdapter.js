import { createEvidenceRecord, EVIDENCE_KINDS, EVIDENCE_STATUS } from '../evidence';
import { FILING_TYPES } from './filingModel';

const METRIC_BY_TYPE = {
  [FILING_TYPES.FINANCIAL_RESULT]: 'earnings',
  [FILING_TYPES.CORPORATE_ACTION]: 'corporate_action',
  [FILING_TYPES.BOARD_DISCLOSURE]: 'board_event',
  [FILING_TYPES.ANNUAL_REPORT]: 'annual_report',
  [FILING_TYPES.SHAREHOLDING]: 'shareholding'
};

export function filingToEvidence(filing, entity) {
  const metricKey = METRIC_BY_TYPE[filing.type] ?? 'corporate_action';

  return createEvidenceRecord({
    id: 'ev_' + filing.id,
    entity,
    metric: { key: metricKey, label: filing.title },
    value: {
      title: filing.title,
      filingId: filing.id,
      filingType: filing.type,
      filingStatus: filing.status,
      url: filing.url
    },
    unit: null,
    period: { asOf: filing.publishedAt },
    source: filing.source,
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    retrievedAt: filing.retrievedAt,
    publishedAt: filing.publishedAt,
    notes: filing.notes
  });
}

export function filingsToEvidence(filings = [], entity) {
  return filings.map(filing => filingToEvidence(filing, entity));
}
