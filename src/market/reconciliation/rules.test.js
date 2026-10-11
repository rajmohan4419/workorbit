import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { valuesAgree, DEFAULT_RECONCILIATION_RULES } from './rules.js';

describe('valuesAgree', () => {
  it('returns true when all values match exactly with default rules', () => {
    assert.strictEqual(valuesAgree([100, 100]), true);
    assert.strictEqual(valuesAgree([100, 100, 100]), true);
    assert.strictEqual(valuesAgree(['AAPL', 'AAPL']), true);
  });

  it('returns false when values differ', () => {
    assert.strictEqual(valuesAgree([100, 200]), false);
    assert.strictEqual(valuesAgree([100, 100, 101]), false);
    assert.strictEqual(valuesAgree(['AAPL', 'MSFT']), false);
  });

  it('returns false when values array has fewer than 2 items', () => {
    assert.strictEqual(valuesAgree([]), false);
    assert.strictEqual(valuesAgree([100]), false);
  });

  it('returns false when exactNumericMatch rule is set to false', () => {
    const customRule = { ...DEFAULT_RECONCILIATION_RULES, exactNumericMatch: false };
    assert.strictEqual(valuesAgree([100, 100], customRule), false);
  });

  it('uses DEFAULT_RECONCILIATION_RULES when rule parameter is omitted', () => {
    assert.strictEqual(valuesAgree([50, 50]), true);
    assert.strictEqual(valuesAgree([50, 60]), false);
  });
});
