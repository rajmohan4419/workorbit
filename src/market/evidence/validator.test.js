import { describe, it, expect } from 'vitest';
import { validateEvidenceRecord, validateEvidenceSet } from './validator';
import { EVIDENCE_KINDS, EVIDENCE_STATUS, createEvidenceRecord } from './evidenceModel';

describe('validateEvidenceRecord', () => {
  const getValidRecord = () => ({
    id: 'ev_001',
    entity: { symbol: 'AAPL', exchange: 'NASDAQ' },
    metric: { key: 'revenue' },
    value: 1000,
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    source: { provider: 'SEC', url: 'https://sec.gov/edgar' },
    retrievedAt: '2023-10-01T12:00:00Z'
  });

  it('validates a completely valid fact record', () => {
    const record = getValidRecord();
    const result = validateEvidenceRecord(record);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('fails validation when record is not an object or missing', () => {
    expect(validateEvidenceRecord(null)).toEqual({
      valid: false,
      errors: [{ severity: 'error', code: 'RECORD_REQUIRED', field: 'record', message: 'Evidence record is required.' }],
      warnings: []
    });

    expect(validateEvidenceRecord(undefined)).toEqual({
      valid: false,
      errors: [{ severity: 'error', code: 'RECORD_REQUIRED', field: 'record', message: 'Evidence record is required.' }],
      warnings: []
    });

    expect(validateEvidenceRecord('not an object')).toEqual({
      valid: false,
      errors: [{ severity: 'error', code: 'RECORD_REQUIRED', field: 'record', message: 'Evidence record is required.' }],
      warnings: []
    });
  });

  it('requires entity symbol and exchange', () => {
    const recordNoSymbol = { ...getValidRecord(), entity: { exchange: 'NASDAQ' } };
    const res1 = validateEvidenceRecord(recordNoSymbol);
    expect(res1.valid).toBe(false);
    expect(res1.errors).toContainEqual({
      severity: 'error',
      code: 'ENTITY_SYMBOL_REQUIRED',
      field: 'entity.symbol',
      message: 'Entity symbol is required.'
    });

    const recordNoExchange = { ...getValidRecord(), entity: { symbol: 'AAPL' } };
    const res2 = validateEvidenceRecord(recordNoExchange);
    expect(res2.valid).toBe(false);
    expect(res2.errors).toContainEqual({
      severity: 'error',
      code: 'ENTITY_EXCHANGE_REQUIRED',
      field: 'entity.exchange',
      message: 'Exchange is required.'
    });
  });

  it('requires metric key', () => {
    const record = { ...getValidRecord(), metric: {} };
    const result = validateEvidenceRecord(record);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      severity: 'error',
      code: 'METRIC_KEY_REQUIRED',
      field: 'metric.key',
      message: 'Metric key is required.'
    });
  });

  it('validates record value presence and finiteness', () => {
    const recordNullVal = { ...getValidRecord(), value: null };
    const resNull = validateEvidenceRecord(recordNullVal);
    expect(resNull.valid).toBe(false);
    expect(resNull.errors).toContainEqual({
      severity: 'error',
      code: 'VALUE_REQUIRED',
      field: 'value',
      message: 'Evidence value is required; missing values must not be silently coerced.'
    });

    const recordUndefVal = { ...getValidRecord(), value: undefined };
    const resUndef = validateEvidenceRecord(recordUndefVal);
    expect(resUndef.valid).toBe(false);
    expect(resUndef.errors).toContainEqual({
      severity: 'error',
      code: 'VALUE_REQUIRED',
      field: 'value',
      message: 'Evidence value is required; missing values must not be silently coerced.'
    });

    const recordNaN = { ...getValidRecord(), value: NaN };
    const resNaN = validateEvidenceRecord(recordNaN);
    expect(resNaN.valid).toBe(false);
    expect(resNaN.errors).toContainEqual({
      severity: 'error',
      code: 'VALUE_NOT_FINITE',
      field: 'value',
      message: 'Numeric evidence value must be finite.'
    });

    const recordInf = { ...getValidRecord(), value: Infinity };
    const resInf = validateEvidenceRecord(recordInf);
    expect(resInf.valid).toBe(false);
    expect(resInf.errors).toContainEqual({
      severity: 'error',
      code: 'VALUE_NOT_FINITE',
      field: 'value',
      message: 'Numeric evidence value must be finite.'
    });

    // Zero or boolean or string values should be accepted as valid values
    const recordZero = { ...getValidRecord(), value: 0 };
    expect(validateEvidenceRecord(recordZero).valid).toBe(true);

    const recordString = { ...getValidRecord(), value: 'test string' };
    expect(validateEvidenceRecord(recordString).valid).toBe(true);
  });

  it('validates kind and status fields', () => {
    const recordBadKind = { ...getValidRecord(), kind: 'INVALID_KIND' };
    const resKind = validateEvidenceRecord(recordBadKind);
    expect(resKind.valid).toBe(false);
    expect(resKind.errors).toContainEqual({
      severity: 'error',
      code: 'INVALID_KIND',
      field: 'kind',
      message: 'Evidence kind must be FACT, CALCULATION, OBSERVATION, or INTERPRETATION.'
    });

    const recordBadStatus = { ...getValidRecord(), status: 'INVALID_STATUS' };
    const resStatus = validateEvidenceRecord(recordBadStatus);
    expect(resStatus.valid).toBe(false);
    expect(resStatus.errors).toContainEqual({
      severity: 'error',
      code: 'INVALID_STATUS',
      field: 'status',
      message: 'Evidence status is invalid.'
    });
  });

  it('validates source provider and url', () => {
    const recordBadSource = { ...getValidRecord(), source: {} };
    const result = validateEvidenceRecord(recordBadSource);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      severity: 'error',
      code: 'SOURCE_PROVIDER_REQUIRED',
      field: 'source.provider',
      message: 'Source provider is required.'
    });
    expect(result.errors).toContainEqual({
      severity: 'error',
      code: 'SOURCE_URL_REQUIRED',
      field: 'source.url',
      message: 'Source URL is required for auditability.'
    });
  });

  it('validates retrievedAt and optional publishedAt ISO dates', () => {
    const recordBadRetrieved = { ...getValidRecord(), retrievedAt: 'invalid-date' };
    const resRetrieved = validateEvidenceRecord(recordBadRetrieved);
    expect(resRetrieved.valid).toBe(false);
    expect(resRetrieved.errors).toContainEqual({
      severity: 'error',
      code: 'RETRIEVED_AT_INVALID',
      field: 'retrievedAt',
      message: 'retrievedAt must be an ISO date/time.'
    });

    const recordBadPublished = { ...getValidRecord(), publishedAt: 'not-iso-date' };
    const resPublished = validateEvidenceRecord(recordBadPublished);
    expect(resPublished.valid).toBe(false);
    expect(resPublished.errors).toContainEqual({
      severity: 'error',
      code: 'PUBLISHED_AT_INVALID',
      field: 'publishedAt',
      message: 'publishedAt must be an ISO date/time when supplied.'
    });

    const recordGoodPublished = { ...getValidRecord(), publishedAt: '2023-09-30' };
    expect(validateEvidenceRecord(recordGoodPublished).valid).toBe(true);
  });

  it('validates period start, end, and chronological order', () => {
    const recordBadStart = { ...getValidRecord(), period: { start: 'bad' } };
    const resStart = validateEvidenceRecord(recordBadStart);
    expect(resStart.errors).toContainEqual({
      severity: 'error',
      code: 'PERIOD_START_INVALID',
      field: 'period.start',
      message: 'Period start must be an ISO date/time.'
    });

    const recordBadEnd = { ...getValidRecord(), period: { end: 'bad' } };
    const resEnd = validateEvidenceRecord(recordBadEnd);
    expect(resEnd.errors).toContainEqual({
      severity: 'error',
      code: 'PERIOD_END_INVALID',
      field: 'period.end',
      message: 'Period end must be an ISO date/time.'
    });

    const recordBadOrder = {
      ...getValidRecord(),
      period: { start: '2023-12-31', end: '2023-01-01' }
    };
    const resOrder = validateEvidenceRecord(recordBadOrder);
    expect(resOrder.errors).toContainEqual({
      severity: 'error',
      code: 'PERIOD_ORDER_INVALID',
      field: 'period',
      message: 'Period start cannot be after period end.'
    });

    const recordValidPeriod = {
      ...getValidRecord(),
      period: { start: '2023-01-01', end: '2023-12-31' }
    };
    expect(validateEvidenceRecord(recordValidPeriod).valid).toBe(true);
  });

  it('validates CALCULATION evidence provenance requirements', () => {
    const calcNoInputs = {
      ...getValidRecord(),
      kind: EVIDENCE_KINDS.CALCULATION,
      provenance: { methodology: 'sum' }
    };
    const resInputs = validateEvidenceRecord(calcNoInputs);
    expect(resInputs.errors).toContainEqual({
      severity: 'error',
      code: 'CALCULATION_INPUTS_REQUIRED',
      field: 'provenance.inputs',
      message: 'Calculations must identify their input evidence IDs.'
    });

    const calcNoMethod = {
      ...getValidRecord(),
      kind: EVIDENCE_KINDS.CALCULATION,
      provenance: { inputs: ['ev_100'] }
    };
    const resMethod = validateEvidenceRecord(calcNoMethod);
    expect(resMethod.errors).toContainEqual({
      severity: 'error',
      code: 'CALCULATION_METHOD_REQUIRED',
      field: 'provenance.methodology',
      message: 'Calculations must identify the methodology or formula used.'
    });

    const validCalc = {
      ...getValidRecord(),
      kind: EVIDENCE_KINDS.CALCULATION,
      provenance: { inputs: ['ev_100'], methodology: 'A + B' }
    };
    expect(validateEvidenceRecord(validCalc).valid).toBe(true);
  });

  it('validates INTERPRETATION evidence provenance requirements and warnings', () => {
    const interpNoInputs = {
      ...getValidRecord(),
      kind: EVIDENCE_KINDS.INTERPRETATION,
      status: EVIDENCE_STATUS.UNVERIFIED,
      provenance: {}
    };
    const resInputs = validateEvidenceRecord(interpNoInputs);
    expect(resInputs.errors).toContainEqual({
      severity: 'error',
      code: 'INTERPRETATION_INPUTS_REQUIRED',
      field: 'provenance.inputs',
      message: 'Interpretations must identify the evidence they rely on.'
    });

    const interpVerified = {
      ...getValidRecord(),
      kind: EVIDENCE_KINDS.INTERPRETATION,
      status: EVIDENCE_STATUS.VERIFIED,
      provenance: { inputs: ['ev_100'] }
    };
    const resWarning = validateEvidenceRecord(interpVerified);
    expect(resWarning.valid).toBe(true);
    expect(resWarning.warnings).toContainEqual({
      severity: 'warning',
      code: 'INTERPRETATION_NOT_FACT',
      field: 'status',
      message: 'Interpretations should not be represented as verified facts.'
    });
  });
});

describe('validateEvidenceSet', () => {
  const recordA = {
    id: 'ev_A',
    entity: { symbol: 'AAPL', exchange: 'NASDAQ' },
    metric: { key: 'revenue' },
    value: 100,
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    source: { provider: 'SEC', url: 'https://sec.gov' },
    retrievedAt: '2023-10-01T12:00:00Z',
    period: { end: '2023-09-30' }
  };

  const recordBConflicting = {
    id: 'ev_B',
    entity: { symbol: 'AAPL', exchange: 'NASDAQ' },
    metric: { key: 'revenue' },
    value: 200, // Conflict with recordA (same exchange|symbol|metric|period.end)
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    source: { provider: 'Bloomberg', url: 'https://bloomberg.com' },
    retrievedAt: '2023-10-01T12:00:00Z',
    period: { end: '2023-09-30' }
  };

  const recordCInvalid = {
    id: 'ev_C',
    entity: { symbol: 'AAPL' } // Missing exchange
  };

  it('handles empty or missing records list', () => {
    const resNull = validateEvidenceSet(null);
    expect(resNull.valid).toBe(true);
    expect(resNull.errors).toHaveLength(0);
    expect(resNull.warnings).toHaveLength(0);
    expect(resNull.summary).toEqual({ total: 0, valid: 0, conflicts: 0 });

    const resEmpty = validateEvidenceSet([]);
    expect(resEmpty.valid).toBe(true);
    expect(resEmpty.summary).toEqual({ total: 0, valid: 0, conflicts: 0 });
  });

  it('attaches evidenceId to errors and warnings', () => {
    const result = validateEvidenceSet([recordCInvalid]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].evidenceId).toBe('ev_C');
  });

  it('detects conflicting evidence and updates summary', () => {
    const result = validateEvidenceSet([recordA, recordBConflicting]);
    expect(result.valid).toBe(true); // Record errors is empty, warnings exist
    expect(result.warnings).toContainEqual({
      severity: 'warning',
      code: 'CONFLICTING_EVIDENCE',
      field: 'value',
      evidenceId: 'ev_B',
      message: 'Conflicting values found for NASDAQ|AAPL|revenue|2023-09-30; source reconciliation is required.',
      conflictsWith: 'ev_A'
    });
    expect(result.summary).toEqual({
      total: 2,
      valid: 2,
      conflicts: 1
    });
  });

  it('does not flag conflict when values match for same key', () => {
    const recordAMatch = { ...recordA, id: 'ev_A2' };
    const result = validateEvidenceSet([recordA, recordAMatch]);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.summary.conflicts).toBe(0);
  });

  it('works with records created via createEvidenceRecord helper', () => {
    const record1 = createEvidenceRecord({
      entity: { symbol: 'MSFT', exchange: 'NASDAQ' },
      metric: { key: 'eps' },
      value: 2.99,
      source: { provider: 'SEC', url: 'https://sec.gov' }
    });

    const result = validateEvidenceSet([record1]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.valid).toBe(1);
  });
});
