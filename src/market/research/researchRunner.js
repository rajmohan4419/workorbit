import { runInfosysValidation } from '../india';
import { filingsToEvidence } from '../filings';
import { runIndiaIndexConnector, createIndiaIndexConnector, indexRecordsToEvidence, resolveIndex } from '../indices';
import { runResearchDossier } from '../dossier';
import { validateMarketSelection } from '../marketSelection';

export const RESEARCH_STATUS = Object.freeze({
  READY: 'READY',
  PARTIAL: 'PARTIAL',
  BLOCKED: 'BLOCKED',
  FAILED: 'FAILED',
  UNSUPPORTED: 'UNSUPPORTED'
});

export function resolveResearchEntity(query, selection = {}) {
  const normalized = String(query ?? '').trim().toUpperCase();
  const market = selection.market ?? 'IN';
  const assetType = selection.assetType ?? 'STOCKS';
  const exchange = selection.exchange ?? 'NSE';

  if (normalized === 'INFY' || normalized === 'INFOSYS' || normalized === 'INFOSYS LIMITED') {
    if (market !== 'IN' || assetType !== 'STOCKS' || exchange !== 'NSE') return null;
    return { symbol: 'INFY', exchange: 'NSE', market: 'IN', currency: 'INR', issuer: 'Infosys Limited', entityType: 'SECURITY', assetType: 'STOCKS' };
  }

  const index = resolveIndex(query);
  if (index) {
    if (market !== 'IN' || assetType !== 'INDICES' || exchange !== 'NSE') return null;
    return {
      symbol: index.symbol,
      exchange: index.exchange,
      market: 'IN',
      currency: 'INDEX_POINTS',
      issuer: index.name,
      name: index.name,
      entityType: 'INDEX',
      assetType: 'INDICES',
      indexType: index.type,
      sourceUrl: index.url
    };
  }

  return null;
}

export async function runResearch({ query, fetcher, context = {}, market = 'IN', assetType, exchange = 'NSE' }) {
  const normalizedAssetType = assetType ?? (resolveIndex(query) ? 'INDICES' : 'STOCKS');
  const selection = { market, assetType: normalizedAssetType, exchange };
  const selectionValidation = validateMarketSelection(selection);

  if (!selectionValidation.valid) {
    return {
      status: RESEARCH_STATUS.UNSUPPORTED,
      entity: null,
      message: selectionValidation.message,
      audit: { query: String(query ?? ''), selection, validationCode: selectionValidation.code }
    };
  }

  const entity = resolveResearchEntity(query, selection);

  if (!entity) {
    return {
      status: RESEARCH_STATUS.UNSUPPORTED,
      entity: null,
      message: 'No research connector is registered for this instrument in the selected market and exchange. No fallback instrument or evidence was substituted.',
      audit: { query: String(query ?? ''), selection }
    };
  }

  if (typeof fetcher !== 'function') {
    return {
      status: RESEARCH_STATUS.BLOCKED,
      entity,
      message: 'Research connector is unavailable. No evidence was fabricated or substituted.',
      audit: { query, connector: 'missing-fetcher', selection }
    };
  }

  const connectorResult = entity.entityType === 'INDEX'
    ? await runIndiaIndexConnector(
        createIndiaIndexConnector({ fetcher }),
        { index: entity },
        context
      )
    : await runInfosysValidation(fetcher, context);

  if (connectorResult.status === 'FAILED') {
    return {
      status: RESEARCH_STATUS.FAILED,
      entity,
      message: entity.entityType === 'INDEX'
        ? 'The primary index source failed. This is not treated as an empty result.'
        : 'The primary filing source failed. This is not treated as an empty result.',
      connector: connectorResult,
      audit: { query, connectorStatus: connectorResult.status, selection }
    };
  }

  const evidence = entity.entityType === 'INDEX'
    ? indexRecordsToEvidence(connectorResult.records, entity, context)
    : filingsToEvidence(connectorResult.records, entity);

  const result = runResearchDossier({ entity, evidence });

  return {
    status: result.dossier.status === 'READY' ? RESEARCH_STATUS.READY : RESEARCH_STATUS.PARTIAL,
    entity,
    dossier: result.dossier,
    evidence,
    connector: connectorResult,
    validation: result.validation,
    reconciliation: result.reconciliation,
    contradictions: result.contradictions,
    audit: { ...result.audit, selection }
  };
}
