import { runInfosysValidation } from '../india';
import { filingsToEvidence } from '../filings';
import { runResearchDossier } from '../dossier';

export const RESEARCH_STATUS = Object.freeze({
  READY: 'READY',
  PARTIAL: 'PARTIAL',
  BLOCKED: 'BLOCKED',
  FAILED: 'FAILED',
  UNSUPPORTED: 'UNSUPPORTED'
});

export function resolveResearchEntity(query) {
  const normalized = String(query ?? '').trim().toUpperCase();

  if (normalized === 'INFY' || normalized === 'INFOSYS' || normalized === 'INFOSYS LIMITED') {
    return { symbol: 'INFY', exchange: 'NSE', issuer: 'Infosys Limited' };
  }

  return null;
}

export async function runResearch({ query, fetcher, context = {} }) {
  const entity = resolveResearchEntity(query);

  if (!entity) {
    return {
      status: RESEARCH_STATUS.UNSUPPORTED,
      entity: null,
      message: 'No research connector is registered for this company yet.',
      audit: { query: String(query ?? '') }
    };
  }

  if (typeof fetcher !== 'function') {
    return {
      status: RESEARCH_STATUS.BLOCKED,
      entity,
      message: 'Research connector is unavailable. No evidence was fabricated or substituted.',
      audit: { query, connector: 'missing-fetcher' }
    };
  }

  const connectorResult = await runInfosysValidation(fetcher, context);
  if (connectorResult.status === 'FAILED') {
    return {
      status: RESEARCH_STATUS.FAILED,
      entity,
      message: 'The primary filing source failed. This is not treated as an empty result.',
      connector: connectorResult,
      audit: { query, connectorStatus: connectorResult.status }
    };
  }

  const evidence = filingsToEvidence(connectorResult.records, entity);
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
    audit: result.audit
  };
}
