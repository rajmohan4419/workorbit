export const IDENTIFIER_TYPES = Object.freeze({
  SYMBOL: 'SYMBOL',
  ISIN: 'ISIN',
  LEI: 'LEI',
  FIGI: 'FIGI',
  EXCHANGE_CODE: 'EXCHANGE_CODE'
});

export function createSecurityIdentifier({
  value,
  type,
  exchange = null,
  issuer = null,
  validFrom = null,
  validTo = null,
  source = null
}) {
  if (!value || !type) throw new Error('Identifier value and type are required.');

  return Object.freeze({
    value: String(value).trim(),
    type,
    exchange,
    issuer,
    validFrom,
    validTo,
    source
  });
}

export function identifierKey(identifier) {
  return [
    identifier?.type ?? '',
    identifier?.value ?? '',
    identifier?.exchange ?? ''
  ].join('|').toUpperCase();
}

export function matchIdentifier(left, right) {
  return Boolean(
    left
    && right
    && left.type === right.type
    && String(left.value).trim().toUpperCase() === String(right.value).trim().toUpperCase()
    && (left.exchange ?? null) === (right.exchange ?? null)
  );
}
