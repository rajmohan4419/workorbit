import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileEvidenceSet } from './reconcile.js';
import { RECONCILIATION_STATUS } from './rules.js';
import { EVIDENCE_KINDS, EVIDENCE_STATUS } from '../evidence/evidenceModel.js';

function makeRecord(overrides = {}) {
  return {
    id: 'ev_1',
    entity: { symbol: 'INFY', exchange: 'NSE' },
    metric: { key: 'REVENUE' },
    value: 1000,
    unit: 'INR',
    period: { end: '2024-03-31' },
    source: { provider: 'NSE', id: 'nse_1', url: 'https://example.com/1' },
    kind: EVIDENCE_KINDS.FACT,
    status: EVIDENCE_STATUS.UNVERIFIED,
    retrievedAt: '2024-04-01T00:00:00Z',
    publishedAt: '2024-04-01T00:00:00Z',
    ...overrides
  };
}

describe('reconcileEvidenceSet', () => {
  it('throws TypeError on non-array input', () => {
    assert.throws(() => reconcileEvidenceSet(null), {
      name: 'TypeError',
      message: 'Reconciliation requires an evidence records array.'
    });

    assert.throws(() => reconcileEvidenceSet(undefined), {
      name: 'TypeError',
      message: 'Reconciliation requires an evidence records array.'
    });

    assert.throws(() => reconcileEvidenceSet('not an array'), {
      name: 'TypeError',
      message: 'Reconciliation requires an evidence records array.'
    });
  });

  it('handles empty evidence set', () => {
    const result = reconcileEvidenceSet([]);
    assert.deepEqual(result, {
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

  it('groups records by evidence key', () => {
    const rec1 = makeRecord({ id: 'ev_1', metric: { key: 'REVENUE' }, value: 1000 });
    const rec2 = makeRecord({ id: 'ev_2', metric: { key: 'NET_INCOME' }, value: 200 });

    const { results, summary } = reconcileEvidenceSet([rec1, rec2]);
    assert.equal(results.length, 2);
    assert.equal(summary.totalKeys, 2);
    assert.equal(summary.singleSource, 2);

    const keys = results.map(r => r.key);
    assert.ok(keys.includes('NSE|INFY|REVENUE|2024-03-31'));
    assert.ok(keys.includes('NSE|INFY|NET_INCOME|2024-03-31'));
  });

  it('returns INVALID status when records fail evidence validation', () => {
    const invalidRecord = makeRecord({
      id: 'ev_invalid',
      source: null // Missing source.provider and source.url
    });

    const { results, summary } = reconcileEvidenceSet([invalidRecord]);
    assert.equal(results[0].status, RECONCILIATION_STATUS.INVALID);
    assert.equal(results[0].selectedValue, null);
    assert.equal(results[0].invalidCount, 1);
    assert.equal(results[0].rationale, 'No usable observations remain after evidence validation.');
    assert.equal(summary.invalid, 1);
  });

  describe('SINGLE_SOURCE status', () => {
    it('allows selected value on single source by default', () => {
      const rec = makeRecord({ id: 'ev_1', value: 500 });
      const { results, summary } = reconcileEvidenceSet([rec]);

      assert.equal(results[0].status, RECONCILIATION_STATUS.SINGLE_SOURCE);
      assert.equal(results[0].selectedValue, 500);
      assert.equal(results[0].agreementCount, 1);
      assert.equal(results[0].conflictCount, 0);
      assert.equal(results[0].sourceCount, 1);
      assert.deepEqual(results[0].sources, ['nse_1|NSE']);
      assert.equal(
        results[0].rationale,
        'Only one usable source observation is available; value is retained with single-source provenance.'
      );
      assert.equal(summary.singleSource, 1);
    });

    it('disallows selected value on single source when allowSelectedValueOnSingleSource is false', () => {
      const rec = makeRecord({ id: 'ev_1', value: 500 });
      const { results } = reconcileEvidenceSet([rec], {
        rules: { allowSelectedValueOnSingleSource: false }
      });

      assert.equal(results[0].status, RECONCILIATION_STATUS.SINGLE_SOURCE);
      assert.equal(results[0].selectedValue, null);
      assert.equal(
        results[0].rationale,
        'Only one usable source observation is available, but policy does not permit selecting it as reconciled.'
      );
    });

    it('handles single source requiring verified evidence', () => {
      const unverifiedRec = makeRecord({ id: 'ev_1', value: 500, status: EVIDENCE_STATUS.UNVERIFIED });
      const verifiedRec = makeRecord({ id: 'ev_2', value: 500, status: EVIDENCE_STATUS.VERIFIED });

      const resUnverified = reconcileEvidenceSet([unverifiedRec], {
        rules: { singleSourceRequiresVerifiedEvidence: true }
      });
      assert.equal(resUnverified.results[0].selectedValue, null);

      const resVerified = reconcileEvidenceSet([verifiedRec], {
        rules: { singleSourceRequiresVerifiedEvidence: true }
      });
      assert.equal(resVerified.results[0].selectedValue, 500);
    });
  });

  describe('AGREED status', () => {
    it('reconciles multiple sources agreeing on value', () => {
      const rec1 = makeRecord({
        id: 'ev_1',
        value: 1000,
        source: { provider: 'NSE', id: 'source_1', url: 'https://example.com/1' }
      });
      const rec2 = makeRecord({
        id: 'ev_2',
        value: 1000,
        source: { provider: 'BSE', id: 'source_2', url: 'https://example.com/2' }
      });

      const { results, summary } = reconcileEvidenceSet([rec1, rec2]);
      assert.equal(results[0].status, RECONCILIATION_STATUS.AGREED);
      assert.equal(results[0].selectedValue, 1000);
      assert.equal(results[0].agreementCount, 2);
      assert.equal(results[0].conflictCount, 0);
      assert.equal(results[0].sourceCount, 2);
      assert.equal(
        results[0].rationale,
        'All usable observations report the same value for the same evidence key.'
      );
      assert.equal(summary.agreed, 1);
    });

    it('disallows selected value on agreement when allowSelectedValueOnAgreement is false', () => {
      const rec1 = makeRecord({ id: 'ev_1', value: 1000 });
      const rec2 = makeRecord({ id: 'ev_2', value: 1000, source: { provider: 'BSE', id: 'bse_1', url: 'https://example.com/2' } });

      const { results } = reconcileEvidenceSet([rec1, rec2], {
        rules: { allowSelectedValueOnAgreement: false }
      });

      assert.equal(results[0].status, RECONCILIATION_STATUS.AGREED);
      assert.equal(results[0].selectedValue, null);
    });

    it('returns CONFLICTED when exactNumericMatch is false', () => {
      const rec1 = makeRecord({ id: 'ev_1', value: 1000 });
      const rec2 = makeRecord({ id: 'ev_2', value: 1000, source: { provider: 'BSE', id: 'bse_1', url: 'https://example.com/2' } });

      const { results } = reconcileEvidenceSet([rec1, rec2], {
        rules: { exactNumericMatch: false }
      });

      assert.equal(results[0].status, RECONCILIATION_STATUS.CONFLICTED);
      assert.equal(results[0].selectedValue, 1000);
    });
  });

  describe('CONFLICTED status', () => {
    it('reconciles conflicting values between multiple sources', () => {
      const rec1 = makeRecord({
        id: 'ev_1',
        value: 1000,
        source: { provider: 'NSE', id: 'source_1', url: 'https://example.com/1' }
      });
      const rec2 = makeRecord({
        id: 'ev_2',
        value: 1000,
        source: { provider: 'BSE', id: 'source_2', url: 'https://example.com/2' }
      });
      const rec3 = makeRecord({
        id: 'ev_3',
        value: 1050,
        source: { provider: 'BLOOMBERG', id: 'source_3', url: 'https://example.com/3' }
      });

      const { results, summary } = reconcileEvidenceSet([rec1, rec2, rec3]);
      assert.equal(results[0].status, RECONCILIATION_STATUS.CONFLICTED);
      assert.equal(results[0].selectedValue, null);
      assert.equal(results[0].agreementCount, 2);
      assert.equal(results[0].conflictCount, 1);
      assert.equal(
        results[0].rationale,
        '2 observations agree and 1 conflict. No source is silently preferred.'
      );

      assert.deepEqual(results[0].valueGroups, [
        {
          value: 1000,
          observationCount: 2,
          sourceCount: 2,
          sources: ['source_1|NSE', 'source_2|BSE']
        },
        {
          value: 1050,
          observationCount: 1,
          sourceCount: 1,
          sources: ['source_3|BLOOMBERG']
        }
      ]);
      assert.equal(summary.conflicted, 1);
    });

    it('formats rationale string correctly when agreementCount is 1', () => {
      const rec1 = makeRecord({
        id: 'ev_1',
        value: 1000,
        source: { provider: 'NSE', id: 'source_1', url: 'https://example.com/1' }
      });
      const rec2 = makeRecord({
        id: 'ev_2',
        value: 1050,
        source: { provider: 'BSE', id: 'source_2', url: 'https://example.com/2' }
      });

      const { results } = reconcileEvidenceSet([rec1, rec2]);
      assert.equal(results[0].status, RECONCILIATION_STATUS.CONFLICTED);
      assert.equal(results[0].agreementCount, 1);
      assert.equal(results[0].conflictCount, 1);
      assert.equal(
        results[0].rationale,
        '1 observation agree and 1 conflict. No source is silently preferred.'
      );
    });
  });

  it('formats observation list accurately', () => {
    const rec = makeRecord({
      id: 'ev_1',
      value: 500,
      unit: 'USD',
      source: { provider: 'SEC', url: 'https://example.com' },
      kind: EVIDENCE_KINDS.FACT,
      status: EVIDENCE_STATUS.VERIFIED,
      publishedAt: '2024-03-15T00:00:00Z',
      retrievedAt: '2024-03-16T00:00:00Z'
    });

    const { results } = reconcileEvidenceSet([rec]);
    assert.equal(results[0].observations.length, 1);
    assert.deepEqual(results[0].observations[0], {
      evidenceId: 'ev_1',
      value: 500,
      unit: 'USD',
      source: { provider: 'SEC', url: 'https://example.com' },
      status: EVIDENCE_STATUS.VERIFIED,
      kind: EVIDENCE_KINDS.FACT,
      publishedAt: '2024-03-15T00:00:00Z',
      retrievedAt: '2024-03-16T00:00:00Z'
    });
  });
});
