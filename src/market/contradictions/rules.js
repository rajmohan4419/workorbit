/**
 * Market Lab — Contradiction Rules
 *
 * Rules describe observable tensions between already-normalized evidence.
 * They do not infer motives and they never manufacture missing evidence.
 */

export const CONTRADICTION_SEVERITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

export const CONTRADICTION_TYPES = Object.freeze({
  GROWTH_VS_CASHFLOW: 'GROWTH_VS_CASHFLOW',
  PROFIT_VS_CASHFLOW: 'PROFIT_VS_CASHFLOW',
  GROWTH_VS_DEBT: 'GROWTH_VS_DEBT',
  PROFIT_VS_DEBT: 'PROFIT_VS_DEBT',
  POSITIVE_NEWS_VS_FINANCIAL_RISK: 'POSITIVE_NEWS_VS_FINANCIAL_RISK',
  PRICE_VS_FUNDAMENTALS: 'PRICE_VS_FUNDAMENTALS'
});

export const DEFAULT_CONTRADICTION_RULES = Object.freeze({
  minimumEvidencePerSide: 1,
  requireVerifiedEvidence: true
});
