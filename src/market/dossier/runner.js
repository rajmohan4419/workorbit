import { validateEvidenceSet } from '../evidence';
import { reconcileEvidenceSet } from '../reconciliation';
import { detectContradictions } from '../contradictions';
import { assessVolatilityRisk } from '../risk';
import { buildResearchDossier } from './builder';

export function runResearchDossier({
  entity,
  asOf = new Date().toISOString(),
  evidence = [],
  signals = []
}) {
  const validation = validateEvidenceSet(evidence);
  const reconciliation = reconcileEvidenceSet(evidence);
  const contradictions = detectContradictions(evidence);
  const volatilityRisk = assessVolatilityRisk(evidence, entity);

  const dossier = buildResearchDossier({
    entity,
    asOf,
    evidence,
    reconciliations: reconciliation,
    signals,
    contradictions,
    volatilityRisk
  });

  return {
    dossier,
    validation,
    reconciliation,
    contradictions,
    volatilityRisk,
    audit: {
      entity,
      asOf,
      evidenceIds: evidence.map(record => record.id),
      validatedRecordCount: validation.summary.valid,
      validationErrorCount: validation.errors.length,
      validationWarningCount: validation.warnings.length,
      reconciliationKeys: reconciliation.summary.totalKeys,
      reconciliationConflicts: reconciliation.summary.conflicted,
      contradictionCount: contradictions.summary.total,
      volatilityRiskStatus: volatilityRisk.status,
      volatilityRangePct: volatilityRisk.rangePct,
      generatedAt: dossier.generatedAt
    }
  };
}

export function createDossierInput({
  entity,
  evidence = [],
  signals = [],
  asOf = new Date().toISOString()
}) {
  return { entity, evidence, signals, asOf };
}
