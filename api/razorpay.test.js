/* global process, Buffer */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import createOrderHandler from './create-order.js';
import verifyPaymentHandler from './verify-payment.js';
import { parseOrderRequest, PRODUCTS } from './_lib/products.js';
import { checkPaymentAgainstOrder } from './_lib/paymentRules.js';

vi.mock('razorpay', () => ({
  default: class MockRazorpay {
    constructor() {
      this.orders = { create: vi.fn(), fetch: vi.fn() };
      this.payments = { fetch: vi.fn() };
    }
  },
}));

function mockReqRes({ method = 'POST', headers = {}, body = null, rawBody = null } = {}) {
  const req = {
    method,
    headers,
    body,
    async *[Symbol.asyncIterator]() {
      if (rawBody !== null) yield Buffer.from(rawBody);
    },
  };
  let status = 200;
  let text = '';
  const res = {
    writeHead: (code) => { status = code; },
    end: (data) => { text = data; },
  };
  return { req, res, status: () => status, json: () => JSON.parse(text || '{}') };
}

describe('parseOrderRequest (server-side price list)', () => {
  it('accepts a listed amount and derives paise on the server', () => {
    const r = parseOrderRequest({ productId: 'support-orbitboard', amountInr: 500 });
    expect(r).toEqual({ productId: 'support-orbitboard', amountPaise: 50000, currency: 'INR' });
  });

  it('rejects amounts that are not in the preset list', () => {
    expect(parseOrderRequest({ productId: 'support-orbitboard', amountInr: 1 }).error).toBeTruthy();
    expect(parseOrderRequest({ productId: 'support-orbitboard', amountInr: 999999 }).error).toBeTruthy();
    expect(parseOrderRequest({ productId: 'support-orbitboard', amountInr: '500' }).error).toBeTruthy();
  });

  it('rejects unknown products, including prototype keys', () => {
    expect(parseOrderRequest({ productId: 'nope', amountInr: 100 }).error).toBeTruthy();
    expect(parseOrderRequest({ productId: '__proto__', amountInr: 100 }).error).toBeTruthy();
  });

  it('rejects currencies other than the product currency', () => {
    expect(parseOrderRequest({ productId: 'support-orbitboard', amountInr: 100, currency: 'USD' }).error).toBeTruthy();
    expect(PRODUCTS['support-orbitboard'].currency).toBe('INR');
  });
});

describe('checkPaymentAgainstOrder', () => {
  const orderRecord = { razorpay_order_id: 'order_1', amount_paise: 50000, currency: 'INR' };
  const goodPayment = { id: 'pay_1', order_id: 'order_1', status: 'captured', amount: 50000, currency: 'INR' };
  const goodOrder = { id: 'order_1', amount: 50000, currency: 'INR' };

  it('accepts a captured payment that matches the stored order', () => {
    const r = checkPaymentAgainstOrder({ orderRecord, orderId: 'order_1', paymentId: 'pay_1', payment: goodPayment, razorpayOrder: goodOrder });
    expect(r.ok).toBe(true);
  });

  it('rejects an unknown order', () => {
    expect(checkPaymentAgainstOrder({ orderRecord: null, orderId: 'order_x', paymentId: 'pay_1', payment: goodPayment }).ok).toBe(false);
  });

  it('rejects a payment for a different order', () => {
    const r = checkPaymentAgainstOrder({ orderRecord, orderId: 'order_1', paymentId: 'pay_1', payment: { ...goodPayment, order_id: 'order_2' } });
    expect(r.ok).toBe(false);
  });

  it('rejects a payment that was not captured', () => {
    const r = checkPaymentAgainstOrder({ orderRecord, orderId: 'order_1', paymentId: 'pay_1', payment: { ...goodPayment, status: 'authorized' } });
    expect(r.ok).toBe(false);
  });

  it('rejects an amount that differs from the stored order', () => {
    const r = checkPaymentAgainstOrder({ orderRecord, orderId: 'order_1', paymentId: 'pay_1', payment: { ...goodPayment, amount: 100 } });
    expect(r.ok).toBe(false);
  });
});

describe('create-order endpoint', () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
    process.env.RAZORPAY_KEY_SECRET = 'secret';
  });
  afterEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  it('returns 405 for non-POST', async () => {
    const { req, res, status } = mockReqRes({ method: 'GET' });
    await createOrderHandler(req, res);
    expect(status()).toBe(405);
  });

  it('returns 400 for an amount outside the price list, before touching any store', async () => {
    const { req, res, status, json } = mockReqRes({ body: { productId: 'support-orbitboard', amountInr: 1 } });
    await createOrderHandler(req, res);
    expect(status()).toBe(400);
    expect(json().error).toBeTruthy();
  });

  it('returns 500 (not 401) when Razorpay credentials are missing', async () => {
    delete process.env.RAZORPAY_KEY_ID;
    const { req, res, status } = mockReqRes({ body: { productId: 'support-orbitboard', amountInr: 100 } });
    await createOrderHandler(req, res);
    expect(status()).toBe(500);
  });
});

describe('verify-payment endpoint', () => {
  const secret = 'test_secret';
  beforeEach(() => { process.env.RAZORPAY_KEY_SECRET = secret; });
  afterEach(() => { delete process.env.RAZORPAY_KEY_SECRET; });

  it('returns 400 when the signature does not match, before any store or network call', async () => {
    const { req, res, status, json } = mockReqRes({
      body: { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'bad' },
    });
    await verifyPaymentHandler(req, res);
    expect(status()).toBe(400);
    expect(json().success).toBe(false);
  });

  it('fails closed on a correctly signed pair when the store is not configured', async () => {
    const good = crypto.createHmac('sha256', secret).update('order_1|pay_1').digest('hex');
    const { req, res, status } = mockReqRes({
      body: { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: good },
    });
    await verifyPaymentHandler(req, res);
    // Store is not configured in tests, so verification must fail closed rather than succeed.
    expect(status()).toBe(500);
  });
});
