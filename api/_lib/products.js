/**
 * Server-side catalogue of payable products. The server is the only source
 * of truth for amounts and currency. Client-supplied amounts are accepted only
 * if they match one of these preset values exactly.
 */
export const PRODUCTS = {
  'support-orbitboard': {
    title: 'OrbitBoard Support',
    currency: 'INR',
    amountsInr: [100, 500, 1000],
  },
};

export const ALLOWED_CURRENCIES = new Set(['INR']);

/**
 * Validate an order request. Returns either { productId, amountPaise, currency }
 * or { error }. Client-supplied notes, receipts and currencies are ignored unless
 * they match the server definition.
 */
export function parseOrderRequest(body) {
  const productId = typeof body?.productId === 'string' ? body.productId : '';
  const product = Object.prototype.hasOwnProperty.call(PRODUCTS, productId)
    ? PRODUCTS[productId]
    : null;
  if (!product) {
    return { error: 'Unknown product' };
  }

  const amountInr = typeof body?.amountInr === 'number' ? body.amountInr : Number.NaN;
  if (!Number.isInteger(amountInr) || !product.amountsInr.includes(amountInr)) {
    return { error: 'Amount is not available for this product' };
  }

  if (body?.currency !== undefined && body.currency !== product.currency) {
    return { error: 'Unsupported currency' };
  }
  if (!ALLOWED_CURRENCIES.has(product.currency)) {
    return { error: 'Unsupported currency' };
  }

  return {
    productId,
    amountPaise: amountInr * 100,
    currency: product.currency,
  };
}
