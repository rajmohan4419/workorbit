/**
 * Market Lab — Reconciliation Rules
 *
 * Reconciliation is deliberately conservative. A primary source does not
 * automatically override a conflicting observation; that decision belongs to
 * an explicit, documented policy.
 */

export const RECONCILIATION_STATUS = Object.freeze({
  AGREED: 'AGREED',
  CONFLICTED: 'CONFLICTED',
  SINGLE_SOURCE: 'SINGLE_SOURCE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  INVALID: 'INVALID'
});

export const DEFAULT_RECONCILIATION_RULES = Object.freeze({
  exactNumericMatch: true,
  allowSelectedValueOnAgreement: true,
  allowSelectedValueOnSingleSource: true,
  singleSourceRequiresVerifiedEvidence: false
});

export function valuesAgree(values, rule = DEFAULT_RECONCILIATION_RULES) {
  if (!rule.exactNumericMatch || values.length < 2) return false;
  return values.every(value => value === values[0]);
}
