/**
 * Market Lab — Research Dossier Model
 *
 * A dossier is an auditable snapshot assembled from evidence, reconciliations,
 * signals and contradictions. It is not an investment recommendation.
 */

export const DOSSIER_STATUS = Object.freeze({
  READY: 'READY',
  PARTIAL: 'PARTIAL',
  BLOCKED: 'BLOCKED'
});

export const DOSSIER_SECTIONS = Object.freeze({
  MARKET: 'market',
  FUNDAMENTALS: 'fundamentals',
  VALUATION: 'valuation',
  TECHNICALS: 'technicals',
  CORPORATE_EVENTS: 'corporateEvents',
  NEWS: 'news',
  CONTRADICTIONS: 'contradictions',
  RISKS: 'risks',
  CATALYSTS: 'catalysts',
  DATA_QUALITY: 'dataQuality'
});

export function createResearchDossier({
  id,
  entity,
  asOf,
  generatedAt,
  status = DOSSIER_STATUS.PARTIAL,
  sections = {},
  evidenceIds = [],
  signalIds = [],
  contradictionCount = 0,
  dataQuality = {}
}) {
  return {
    id,
    entity,
    asOf,
    generatedAt,
    status,
    sections,
    evidenceIds,
    signalIds,
    contradictionCount,
    dataQuality
  };
}
