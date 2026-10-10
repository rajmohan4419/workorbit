import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateEvidenceSet } from './validator.js';
import { createEvidenceRecord, EVIDENCE_KINDS, EVIDENCE_STATUS } from './evidenceModel.js';

describe('validateEvidenceSet', () => {
  const baseRecordArgs = {
    entity: { symbol: 'INFY', exchange: 'NSE' },
    metric: { key: 'REVENUE' },
    value: 1000,
    unit: 'INR_CR',
    period: { start: '2023-01-01', end: '2023-12-31' },
    source: { provider: 'NSE', url: 'https://nseindia.com/reports/1' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    retrievedAt: '2024-01-01T00:00:00Z'
  };

  test('handles null, undefined, and empty arrays gracefully', () => {
    for (const input of [null, undefined, []]) {
      const result = validateEvidenceSet(input);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.warnings, []);
      assert.deepEqual(result.summary, {
        total: 0,
        valid: 0,
        conflicts: 0
      });
    }
  });

  test('validates a single valid record set', () => {
    const record = createEvidenceRecord({ ...baseRecordArgs, id: 'ev_001' });
    const result = validateEvidenceSet([record]);

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(result.summary, {
      total: 1,
      valid: 1,
      conflicts: 0
    });
  });

  test('aggregates errors and maps evidenceId for invalid records', () => {
    const invalidRecord = {
      id: 'ev_invalid_1',
      entity: { symbol: '' }, // missing exchange & symbol
      metric: {}, // missing key
      value: null, // missing value
      kind: 'INVALID_KIND',
      status: 'INVALID_STATUS',
      source: {}
    };

    const result = validateEvidenceSet([invalidRecord]);

    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
    for (const err of result.errors) {
      assert.equal(err.evidenceId, 'ev_invalid_1');
    }
    assert.deepEqual(result.summary, {
      total: 1,
      valid: 0,
      conflicts: 0
    });
  });

  test('handles non-object elements in record list', () => {
    const result = validateEvidenceSet([null]);

    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].code, 'RECORD_REQUIRED');
    assert.equal(result.errors[0].evidenceId, undefined);
    assert.deepEqual(result.summary, {
      total: 1,
      valid: 0,
      conflicts: 0
    });
  });

  test('processes multiple valid non-conflicting records', () => {
    const record1 = createEvidenceRecord({
      ...baseRecordArgs,
      id: 'ev_1',
      metric: { key: 'REVENUE' },
      value: 1000
    });
    const record2 = createEvidenceRecord({
      ...baseRecordArgs,
      id: 'ev_2',
      metric: { key: 'NET_PROFIT' },
      value: 200
    });

    const result = validateEvidenceSet([record1, record2]);

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(result.summary, {
      total: 2,
      valid: 2,
      conflicts: 0
    });
  });

  test('handles duplicate identical evidence without generating conflicts', () => {
    const record1 = createEvidenceRecord({ ...baseRecordArgs, id: 'ev_dup1', value: 1000 });
    const record2 = createEvidenceRecord({ ...baseRecordArgs, id: 'ev_dup2', value: 1000 });

    const result = validateEvidenceSet([record1, record2]);

    assert.equal(result.valid, true);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(result.summary, {
      total: 2,
      valid: 2,
      conflicts: 0
    });
  });

  test('detects conflicting evidence for matching key with differing values', () => {
    const record1 = createEvidenceRecord({ ...baseRecordArgs, id: 'ev_c1', value: 1000 });
    const record2 = createEvidenceRecord({ ...baseRecordArgs, id: 'ev_c2', value: 1200 });

    const result = validateEvidenceSet([record1, record2]);

    assert.equal(result.valid, true); // valid errors === 0, conflict is warning
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 1);

    const conflictWarning = result.warnings[0];
    assert.equal(conflictWarning.code, 'CONFLICTING_EVIDENCE');
    assert.equal(conflictWarning.severity, 'warning');
    assert.equal(conflictWarning.field, 'value');
    assert.equal(conflictWarning.evidenceId, 'ev_c2');
    assert.equal(conflictWarning.conflictsWith, 'ev_c1');
    assert.ok(conflictWarning.message.includes('Conflicting values found for'));

    assert.deepEqual(result.summary, {
      total: 2,
      valid: 2,
      conflicts: 1
    });
  });

  test('correctly handles numeric 0 as valid non-conflicting value', () => {
    const record1 = createEvidenceRecord({ ...baseRecordArgs, id: 'ev_zero1', value: 0 });
    const record2 = createEvidenceRecord({ ...baseRecordArgs, id: 'ev_zero2', value: 0 });

    const result = validateEvidenceSet([record1, record2]);

    assert.equal(result.valid, true);
    assert.equal(result.warnings.length, 0);
    assert.deepEqual(result.summary, {
      total: 2,
      valid: 2,
      conflicts: 0
    });
  });

  test('detects conflict when value is 0 vs positive number', () => {
    const record1 = createEvidenceRecord({ ...baseRecordArgs, id: 'ev_zero', value: 0 });
    const record2 = createEvidenceRecord({ ...baseRecordArgs, id: 'ev_pos', value: 50 });

    const result = validateEvidenceSet([record1, record2]);

    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0].code, 'CONFLICTING_EVIDENCE');
    assert.equal(result.summary.conflicts, 1);
  });

  test('aggregates warnings from record validation (e.g., VERIFIED INTERPRETATION)', () => {
    const interpretationRecord = createEvidenceRecord({
      ...baseRecordArgs,
      id: 'ev_interp_1',
      kind: EVIDENCE_KINDS.INTERPRETATION,
      status: EVIDENCE_STATUS.VERIFIED,
      inputs: ['ev_fact_1']
    });

    const result = validateEvidenceSet([interpretationRecord]);

    assert.equal(result.valid, true);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0].code, 'INTERPRETATION_NOT_FACT');
    assert.equal(result.warnings[0].evidenceId, 'ev_interp_1');
  });

  test('validates CALCULATION and INTERPRETATION provenance in set context', () => {
    const unprovenancedCalc = createEvidenceRecord({
      ...baseRecordArgs,
      id: 'ev_calc_bad',
      kind: EVIDENCE_KINDS.CALCULATION
      // missing inputs & methodology
    });

    const result = validateEvidenceSet([unprovenancedCalc]);

    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 2);
    assert.equal(result.errors[0].code, 'CALCULATION_INPUTS_REQUIRED');
    assert.equal(result.errors[0].evidenceId, 'ev_calc_bad');
    assert.equal(result.errors[1].code, 'CALCULATION_METHOD_REQUIRED');
    assert.equal(result.errors[1].evidenceId, 'ev_calc_bad');
  });

  test('skips conflict check for invalid records in mixed set', () => {
    const validRecord = createEvidenceRecord({ ...baseRecordArgs, id: 'ev_valid', value: 100 });
    const invalidRecord = {
      id: 'ev_invalid',
      entity: baseRecordArgs.entity,
      metric: baseRecordArgs.metric,
      period: baseRecordArgs.period,
      value: null // invalid
    };

    const result = validateEvidenceSet([validRecord, invalidRecord]);

    assert.equal(result.valid, false);
    assert.equal(result.summary.total, 2);
    assert.equal(result.summary.valid, 1);
    assert.equal(result.summary.conflicts, 0);
  });
});
