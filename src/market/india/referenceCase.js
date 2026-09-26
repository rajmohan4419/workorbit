import { createSecurityIdentifier, IDENTIFIER_TYPES } from '../identifiers';

export const MARKET_LAB_REFERENCE_CASE = Object.freeze({
  issuer: 'Reference Indian listed company',
  exchange: 'NSE',
  identifiers: [
    createSecurityIdentifier({
      value: 'REFERENCE',
      type: IDENTIFIER_TYPES.SYMBOL,
      exchange: 'NSE',
      issuer: 'Reference Indian listed company',
      source: 'manual-reference'
    })
  ]
});

/**
 * Reference-case payload for adapter tests and development.
 * It is intentionally not a live company record.
 */
export const REFERENCE_FILING_PAYLOAD = Object.freeze([
  {
    type: 'results',
    issuer: MARKET_LAB_REFERENCE_CASE.issuer,
    identifiers: MARKET_LAB_REFERENCE_CASE.identifiers,
    title: 'Reference quarterly financial results',
    publishedAt: '2026-09-01T10:00:00+05:30',
    url: 'https://orbitboard.in/market-lab/reference-filing',
    provider: 'Reference primary filing feed'
  }
]);
