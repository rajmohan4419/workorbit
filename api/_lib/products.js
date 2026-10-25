/**
 * Server-side catalogue of payable products. The server is the only source
 * of truth for amounts and currency. Client-supplied amounts are accepted only
 * if they match one of these preset values exactly, or if a direct amount
 * in paise (>= 100) is supplied.
 */
export const PRODUCTS = {
  'support-orbitboard': {
    title: 'OrbitBoard Support',
    currency: 'INR',
    amountsInr: [100, 500, 1000],
  },
  'coffee-orbitboard': {
    title: 'Buy me a Coffee',
    currency: 'INR',
    amountsInr: [49, 99, 199],
  },
};

export const ALLOWED_CURRENCIES = new Set(['INR']);

/**
 * Validate an order request. Returns either { productId, amountPaise, currency, receipt }
 * or { error }.
 */
export function parseOrderRequest(body) {
  // Direct amount in paise support (Minimum amount: 100 paise = 1 INR)
  if (typeof body?.amount === 'number' && Number.isFinite(body.amount)) {
    const amountPaise = Math.round(body.amount);
    if (amountPaise < 100) {
      return { error: 'Amount must be at least 100 paise' };
    }
    const currency = typeof body?.currency === 'string' ? body.currency.toUpperCase() : 'INR';
    if (!ALLOWED_CURRENCIES.has(currency)) {
      return { error: 'Unsupported currency' };
    }
    return {
      productId: typeof body?.productId === 'string' ? body.productId : 'custom',
      amountPaise,
      currency,
      receipt: typeof body?.receipt === 'string' ? body.receipt : undefined,
    };
  }

  // Pre-configured product catalogue selection
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
    receipt: typeof body?.receipt === 'string' ? body.receipt : undefined,
  };
}
