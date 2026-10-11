import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileEvidenceSet } from './reconcile.js';
import { RECONCILIATION_STATUS } from './rules.js';
import { createEvidenceRecord, EVIDENCE_KINDS, EVIDENCE_STATUS } from '../evidence/evidenceModel.js';

function createValidRecord(overrides = {}) {
  const base = {
    entity: { symbol: 'AAPL', exchange: 'NASDAQ' },
    metric: { key: 'revenue' },
    period: { start: '2023-01-01', end: '2023-12-31' },
    value: 1000,
    source: { provider: 'SecEdgar', id: 'sec-1', url: 'https://sec.gov/doc' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    retrievedAt: '2024-01-01T00:00:00Z',
    publishedAt: '2024-01-01T00:00:00Z'
  };

  return createEvidenceRecord({ ...base, ...overrides });
}

test('reconcileEvidenceSet - input validation', () => {
  assert.throws(
    () => reconcileEvidenceSet(null),
    {
      name: 'TypeError',
      message: 'Reconciliation requires an evidence records array.'
    }
  );

  assert.throws(
    () => reconcileEvidenceSet(undefined),
    {
      name: 'TypeError',
      message: 'Reconciliation requires an evidence records array.'
    }
  );

  assert.throws(
    () => reconcileEvidenceSet('not-an-array'),
    {
      name: 'TypeError',
      message: 'Reconciliation requires an evidence records array.'
    }
  );
});

test('reconcileEvidenceSet - empty records array', () => {
  const output = reconcileEvidenceSet([]);

  assert.deepEqual(output, {
    results: [],
    summary: {
      totalKeys: 0,
      agreed: 0,
      conflicted: 0,
      singleSource: 0,
      insufficientData: 0,
      invalid: 0
    }
  });
});

test('reconcileEvidenceSet - handles invalid evidence records', () => {
  const invalidRecord = {
    entity: { symbol: 'AAPL' }, // Missing exchange
    metric: { key: 'revenue' },
    value: 1000
  };

  const output = reconcileEvidenceSet([invalidRecord]);

  assert.equal(output.results.length, 1);
  const result = output.results[0];

  assert.equal(result.status, RECONCILIATION_STATUS.INVALID);
  assert.equal(result.selectedValue, null);
  assert.equal(result.invalidCount, 1);
  assert.equal(result.agreementCount, 0);
  assert.equal(result.conflictCount, 0);
  assert.equal(result.rationale, 'No usable observations remain after evidence validation.');
  assert.equal(output.summary.invalid, 1);
  assert.equal(output.summary.totalKeys, 1);
});

test('reconcileEvidenceSet - handles records with missing/null values (insufficient data)', () => {
  // A record that passes schema validation, but has null value
  const recordWithNullValue = createValidRecord({
    value: null
  });

  // Since value is null, validateEvidenceRecord will return valid: false due to VALUE_REQUIRED
  // Let's check a record that has null value in observation
  const output = reconcileEvidenceSet([recordWithNullValue]);

  assert.equal(output.results.length, 1);
  const result = output.results[0];

  assert.equal(result.status, RECONCILIATION_STATUS.INVALID);
  assert.equal(output.summary.invalid, 1);
});

test('reconcileEvidenceSet - single source default rules', () => {
  const record = createValidRecord({
    source: { provider: 'Bloomberg', id: 'bloomberg-1', url: 'https://bloomberg.com/1' },
    value: 5000
  });

  const output = reconcileEvidenceSet([record]);

  assert.equal(output.results.length, 1);
  const result = output.results[0];

  assert.equal(result.status, RECONCILIATION_STATUS.SINGLE_SOURCE);
  assert.equal(result.selectedValue, 5000);
  assert.equal(result.agreementCount, 1);
  assert.equal(result.conflictCount, 0);
  assert.equal(result.sourceCount, 1);
  assert.equal(output.summary.singleSource, 1);
});

test('reconcileEvidenceSet - single source with custom rules', () => {
  const unverifiedRecord = createValidRecord({
    status: EVIDENCE_STATUS.UNVERIFIED,
    value: 5000
  });

  // Rule 1: allowSelectedValueOnSingleSource = false
  const outputNoAllow = reconcileEvidenceSet([unverifiedRecord], {
    rules: { allowSelectedValueOnSingleSource: false }
  });
  assert.equal(outputNoAllow.results[0].status, RECONCILIATION_STATUS.SINGLE_SOURCE);
  assert.equal(outputNoAllow.results[0].selectedValue, null);

  // Rule 2: singleSourceRequiresVerifiedEvidence = true on UNVERIFIED
  const outputRequireVerifiedUnverified = reconcileEvidenceSet([unverifiedRecord], {
    rules: { singleSourceRequiresVerifiedEvidence: true }
  });
  assert.equal(outputRequireVerifiedUnverified.results[0].status, RECONCILIATION_STATUS.SINGLE_SOURCE);
  assert.equal(outputRequireVerifiedUnverified.results[0].selectedValue, null);

  // Rule 3: singleSourceRequiresVerifiedEvidence = true on VERIFIED
  const verifiedRecord = createValidRecord({
    status: EVIDENCE_STATUS.VERIFIED,
    value: 5000
  });
  const outputRequireVerifiedVerified = reconcileEvidenceSet([verifiedRecord], {
    rules: { singleSourceRequiresVerifiedEvidence: true }
  });
  assert.equal(outputRequireVerifiedVerified.results[0].status, RECONCILIATION_STATUS.SINGLE_SOURCE);
  assert.equal(outputRequireVerifiedVerified.results[0].selectedValue, 5000);
});

test('reconcileEvidenceSet - agreed observations across multiple sources', () => {
  const record1 = createValidRecord({
    source: { provider: 'SEC', id: 'sec-1', url: 'https://sec.gov' },
    value: 10000
  });
  const record2 = createValidRecord({
    source: { provider: 'FactSet', id: 'factset-1', url: 'https://factset.com' },
    value: 10000
  });

  const output = reconcileEvidenceSet([record1, record2]);

  assert.equal(output.results.length, 1);
  const result = output.results[0];

  assert.equal(result.status, RECONCILIATION_STATUS.AGREED);
  assert.equal(result.selectedValue, 10000);
  assert.equal(result.agreementCount, 2);
  assert.equal(result.conflictCount, 0);
  assert.equal(result.sourceCount, 2);
  assert.equal(output.summary.agreed, 1);

  // Test custom rule allowSelectedValueOnAgreement = false
  const outputNoSelect = reconcileEvidenceSet([record1, record2], {
    rules: { allowSelectedValueOnAgreement: false }
  });
  assert.equal(outputNoSelect.results[0].status, RECONCILIATION_STATUS.AGREED);
  assert.equal(outputNoSelect.results[0].selectedValue, null);
});

test('reconcileEvidenceSet - conflicted observations across sources', () => {
  const record1 = createValidRecord({
    source: { provider: 'SEC', id: 'sec-1', url: 'https://sec.gov' },
    value: 10000
  });
  const record2 = createValidRecord({
    source: { provider: 'FactSet', id: 'factset-1', url: 'https://factset.com' },
    value: 10000
  });
  const record3 = createValidRecord({
    source: { provider: 'Bloomberg', id: 'bloomberg-1', url: 'https://bloomberg.com' },
    value: 12000
  });

  const output = reconcileEvidenceSet([record1, record2, record3]);

  assert.equal(output.results.length, 1);
  const result = output.results[0];

  assert.equal(result.status, RECONCILIATION_STATUS.CONFLICTED);
  assert.equal(result.selectedValue, null);
  assert.equal(result.agreementCount, 2);
  assert.equal(result.conflictCount, 1);
  assert.equal(result.sourceCount, 3);
  assert.equal(result.valueGroups.length, 2);
  assert.equal(result.valueGroups[0].value, 10000);
  assert.equal(result.valueGroups[0].observationCount, 2);
  assert.equal(result.valueGroups[1].value, 12000);
  assert.equal(result.valueGroups[1].observationCount, 1);
  assert.equal(result.rationale, '2 observations agree and 1 conflict. No source is silently preferred.');
  assert.equal(output.summary.conflicted, 1);
});

test('reconcileEvidenceSet - multiple keys with summary aggregation', () => {
  // Key 1: Agreed
  const key1Rec1 = createValidRecord({
    entity: { symbol: 'AAPL', exchange: 'NASDAQ' },
    metric: { key: 'revenue' },
    source: { provider: 'SEC', url: 'https://sec.gov' },
    value: 100
  });
  const key1Rec2 = createValidRecord({
    entity: { symbol: 'AAPL', exchange: 'NASDAQ' },
    metric: { key: 'revenue' },
    source: { provider: 'Bloomberg', url: 'https://bloomberg.com' },
    value: 100
  });

  // Key 2: Conflicted
  const key2Rec1 = createValidRecord({
    entity: { symbol: 'AAPL', exchange: 'NASDAQ' },
    metric: { key: 'net_income' },
    source: { provider: 'SEC', url: 'https://sec.gov' },
    value: 50
  });
  const key2Rec2 = createValidRecord({
    entity: { symbol: 'AAPL', exchange: 'NASDAQ' },
    metric: { key: 'net_income' },
    source: { provider: 'Bloomberg', url: 'https://bloomberg.com' },
    value: 60
  });

  // Key 3: Single source
  const key3Rec1 = createValidRecord({
    entity: { symbol: 'GOOGL', exchange: 'NASDAQ' },
    metric: { key: 'revenue' },
    source: { provider: 'SEC', url: 'https://sec.gov' },
    value: 200
  });

  // Key 4: Invalid record
  const key4Invalid = {
    entity: { symbol: 'MSFT' }, // missing exchange
    metric: { key: 'pe_ratio' },
    value: 30
  };

  const records = [key1Rec1, key1Rec2, key2Rec1, key2Rec2, key3Rec1, key4Invalid];
  const output = reconcileEvidenceSet(records);

  assert.equal(output.summary.totalKeys, 4);
  assert.equal(output.summary.agreed, 1);
  assert.equal(output.summary.conflicted, 1);
  assert.equal(output.summary.singleSource, 1);
  assert.equal(output.summary.insufficientData, 0);
  assert.equal(output.summary.invalid, 1);
});
