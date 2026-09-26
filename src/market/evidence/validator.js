import { EVIDENCE_KINDS, EVIDENCE_STATUS, evidenceKey } from './evidenceModel';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/;

function error(code, field, message) {
  return { severity: 'error', code, field, message };
}

function warning(code, field, message) {
  return { severity: 'warning', code, field, message };
}

export function validateEvidenceRecord(record) {
  const errors = [];
  const warnings = [];

  if (!record || typeof record !== 'object') {
    return { valid: false, errors: [error('RECORD_REQUIRED', 'record', 'Evidence record is required.')], warnings };
  }

  if (!record.entity?.symbol) {
    errors.push(error('ENTITY_SYMBOL_REQUIRED', 'entity.symbol', 'Entity symbol is required.'));
  }

  if (!record.entity?.exchange) {
    errors.push(error('ENTITY_EXCHANGE_REQUIRED', 'entity.exchange', 'Exchange is required.'));
  }

  if (!record.metric?.key) {
    errors.push(error('METRIC_KEY_REQUIRED', 'metric.key', 'Metric key is required.'));
  }

  if (record.value === undefined || record.value === null) {
    errors.push(error('VALUE_REQUIRED', 'value', 'Evidence value is required; missing values must not be silently coerced.'));
  } else if (typeof record.value === 'number' && !Number.isFinite(record.value)) {
    errors.push(error('VALUE_NOT_FINITE', 'value', 'Numeric evidence value must be finite.'));
  }

  if (!Object.values(EVIDENCE_KINDS).includes(record.kind)) {
    errors.push(error('INVALID_KIND', 'kind', 'Evidence kind must be FACT, CALCULATION, OBSERVATION, or INTERPRETATION.'));
  }

  if (!Object.values(EVIDENCE_STATUS).includes(record.status)) {
    errors.push(error('INVALID_STATUS', 'status', 'Evidence status is invalid.'));
  }

  if (!record.source?.provider) {
    errors.push(error('SOURCE_PROVIDER_REQUIRED', 'source.provider', 'Source provider is required.'));
  }

  if (!record.source?.url) {
    errors.push(error('SOURCE_URL_REQUIRED', 'source.url', 'Source URL is required for auditability.'));
  }

  if (!record.retrievedAt || !ISO_DATE.test(record.retrievedAt)) {
    errors.push(error('RETRIEVED_AT_INVALID', 'retrievedAt', 'retrievedAt must be an ISO date/time.'));
  }

  if (record.publishedAt && !ISO_DATE.test(record.publishedAt)) {
    errors.push(error('PUBLISHED_AT_INVALID', 'publishedAt', 'publishedAt must be an ISO date/time when supplied.'));
  }

  if (record.period) {
    if (record.period.start && !ISO_DATE.test(record.period.start)) {
      errors.push(error('PERIOD_START_INVALID', 'period.start', 'Period start must be an ISO date/time.'));
    }
    if (record.period.end && !ISO_DATE.test(record.period.end)) {
      errors.push(error('PERIOD_END_INVALID', 'period.end', 'Period end must be an ISO date/time.'));
    }
    if (record.period.start && record.period.end && record.period.start > record.period.end) {
      errors.push(error('PERIOD_ORDER_INVALID', 'period', 'Period start cannot be after period end.'));
    }
  }

  if (record.kind === EVIDENCE_KINDS.CALCULATION) {
    if (!record.provenance?.inputs?.length) {
      errors.push(error('CALCULATION_INPUTS_REQUIRED', 'provenance.inputs', 'Calculations must identify their input evidence IDs.'));
    }
    if (!record.provenance?.methodology) {
      errors.push(error('CALCULATION_METHOD_REQUIRED', 'provenance.methodology', 'Calculations must identify the methodology or formula used.'));
    }
  }

  if (record.kind === EVIDENCE_KINDS.INTERPRETATION && !record.provenance?.inputs?.length) {
    errors.push(error('INTERPRETATION_INPUTS_REQUIRED', 'provenance.inputs', 'Interpretations must identify the evidence they rely on.'));
  }

  if (record.status === EVIDENCE_STATUS.VERIFIED && record.kind === EVIDENCE_KINDS.INTERPRETATION) {
    warnings.push(warning('INTERPRETATION_NOT_FACT', 'status', 'Interpretations should not be represented as verified facts.'));
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateEvidenceSet(records) {
  const errors = [];
  const warnings = [];
  const seen = new Map();
  const safeRecords = records ?? [];

  for (const record of safeRecords) {
    const result = validateEvidenceRecord(record);
    errors.push(...result.errors.map(item => ({ ...item, evidenceId: record?.id })));
    warnings.push(...result.warnings.map(item => ({ ...item, evidenceId: record?.id })));

    if (!result.valid) continue;

    const key = evidenceKey(record);
    const previous = seen.get(key);

    if (previous && previous.value !== record.value) {
      warnings.push({
        severity: 'warning',
        code: 'CONFLICTING_EVIDENCE',
        field: 'value',
        evidenceId: record.id,
        message: 'Conflicting values found for ' + key + '; source reconciliation is required.',
        conflictsWith: previous.id
      });
    } else {
      seen.set(key, record);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      total: safeRecords.length,
      valid: safeRecords.filter(record => validateEvidenceRecord(record).valid).length,
      conflicts: warnings.filter(item => item.code === 'CONFLICTING_EVIDENCE').length
    }
  };
}
