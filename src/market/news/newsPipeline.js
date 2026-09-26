import { normalizeSourcePayload } from '../sources';
import { enrichNewsEvidence, summarizeNewsIntelligence } from './newsIntelligence';

/**
 * Normalize multiple news providers through the same source contract,
 * then apply freshness and duplicate intelligence to the combined ledger.
 *
 * This function intentionally does not fetch the internet. Fetching belongs
 * at the application/backend boundary so provider credentials, rate limits,
 * retries and audit logs never leak into the evidence engine.
 */
export function ingestNewsSources(
  inputs = [],
  {
    now = new Date().toISOString(),
    rules
  } = {}
) {
  const warnings = [];
  const records = [];
  const sources = [];

  for (const input of inputs) {
    if (!input?.adapter) {
      warnings.push('Skipped a news input without an adapter.');
      continue;
    }

    try {
      const result = normalizeSourcePayload(
        input.adapter,
        input.payload ?? [],
        input.context ?? {}
      );

      sources.push(result.source);
      records.push(...result.records);
      warnings.push(...result.warnings);
    } catch (error) {
      warnings.push(
        (input.adapter.source?.provider ?? 'Unknown source') + ': ' + error.message
      );
    }
  }

  // Preserve every observation. Duplicate detection is an intelligence result,
  // not a destructive ingestion step.
  const enrichedRecords = enrichNewsEvidence(records, { now, rules });

  return {
    records: enrichedRecords,
    sources,
    warnings,
    summary: summarizeNewsIntelligence(enrichedRecords)
  };
}
