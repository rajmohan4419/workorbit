/* global process, Buffer */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import createOrderHandler from './create-order.js';
import verifyPaymentHandler from './verify-payment.js';
import crypto from 'crypto';

vi.mock('razorpay', () => {
  return {
    default: class MockRazorpay {
      constructor({ key_id }) {
        if (key_id === 'invalid_key') {
          const err = new Error('Auth failed');
          err.statusCode = 401;
          throw err;
        }
        this.orders = {
          create: vi.fn().mockImplementation(async (params) => {
            if (params.amount < 100) {
              throw new Error('Amount must be at least 100 paise');
            }
            return {
              id: 'order_mock123',
              amount: params.amount,
              currency: params.currency || 'INR',
              receipt: params.receipt || 'rcpt_123',
              status: 'created',
            };
          }),
        };
      }
    },
  };
});

// Helper to create mock req and res objects
function createMockReqRes(options = {}) {
  const req = {
    method: options.method || 'POST',
    headers: options.headers || {},
    body: options.body !== undefined ? options.body : null,
    async *[Symbol.asyncIterator]() {
      if (options.rawBody) {
        yield Buffer.from(options.rawBody);
      }
    },
  };

  let statusCode = 200;
  let headers = {};
  let body = '';

  const res = {
    writeHead: (code, h) => {
      statusCode = code;
      headers = h;
    },
    end: (data) => {
      body = data;
    },
    getStatus: () => statusCode,
    getHeaders: () => headers,
    getBody: () => (body ? JSON.parse(body) : null),
  };

  return { req, res };
}

describe('Razorpay Create Order Endpoint (/api/create-order)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('handles OPTIONS preflight request', async () => {
    const { req, res } = createMockReqRes({ method: 'OPTIONS' });
    await createOrderHandler(req, res);
    expect(res.getStatus()).toBe(204);
  });

  it('rejects non-POST methods with 405', async () => {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await createOrderHandler(req, res);
    expect(res.getStatus()).toBe(405);
    expect(res.getBody()).toEqual({ error: 'Method not allowed' });
  });

  it('returns 401 when Razorpay credentials are missing', async () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    const { req, res } = createMockReqRes({ method: 'POST', body: { amount: 50000 } });
    await createOrderHandler(req, res);
    expect(res.getStatus()).toBe(401);
    expect(res.getBody().error).toContain('missing or invalid');
  });

  it('returns 400 when amount is less than 100 paise', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_mock';
    process.env.RAZORPAY_KEY_SECRET = 'secret_mock';

    const { req, res } = createMockReqRes({ method: 'POST', body: { amount: 50 } });
    await createOrderHandler(req, res);
    expect(res.getStatus()).toBe(400);
    expect(res.getBody().error).toBe('Amount must be at least 100 paise');
  });

  it('returns 400 when amount is missing or not a number', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_mock';
    process.env.RAZORPAY_KEY_SECRET = 'secret_mock';

    const { req, res } = createMockReqRes({ method: 'POST', body: {} });
    await createOrderHandler(req, res);
    expect(res.getStatus()).toBe(400);
    expect(res.getBody().error).toBe('Amount must be at least 100 paise');
  });

  it('creates order successfully for valid amount >= 100 paise', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_mock';
    process.env.RAZORPAY_KEY_SECRET = 'secret_mock';

    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { amount: 50000, currency: 'INR', receipt: 'rcpt_123' },
    });

    await createOrderHandler(req, res);
    expect(res.getStatus()).toBe(200);
    expect(res.getBody()).toEqual({
      order_id: 'order_mock123',
      amount: 50000,
      currency: 'INR',
      receipt: 'rcpt_123',
      status: 'created',
    });
  });

  it('returns 401 if Razorpay authentication fails', async () => {
    process.env.RAZORPAY_KEY_ID = 'invalid_key';
    process.env.RAZORPAY_KEY_SECRET = 'secret_mock';

    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { amount: 50000 },
    });

    await createOrderHandler(req, res);
    expect(res.getStatus()).toBe(401);
  });
});

describe('Razorpay Payment Verification Endpoint (/api/verify-payment)', () => {
  const originalEnv = process.env;
  const SECRET = 'test_secret_12345';

  beforeEach(() => {
    process.env = { ...originalEnv, RAZORPAY_KEY_SECRET: SECRET };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('handles OPTIONS preflight request', async () => {
    const { req, res } = createMockReqRes({ method: 'OPTIONS' });
    await verifyPaymentHandler(req, res);
    expect(res.getStatus()).toBe(204);
  });

  it('returns 405 for non-POST method', async () => {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await verifyPaymentHandler(req, res);
    expect(res.getStatus()).toBe(405);
  });

  it('returns 401 if KEY_SECRET is missing', async () => {
    delete process.env.RAZORPAY_KEY_SECRET;
    const { req, res } = createMockReqRes({ method: 'POST', body: {} });
    await verifyPaymentHandler(req, res);
    expect(res.getStatus()).toBe(401);
  });

  it('returns 400 when missing required payment fields', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { razorpay_order_id: 'order_123' },
    });
    await verifyPaymentHandler(req, res);
    expect(res.getStatus()).toBe(400);
    expect(res.getBody().error).toBe('Missing required payment verification fields');
  });

  it('returns 400 on signature mismatch', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'invalid_signature_hex_value_here_that_is_64_chars_long_0000000',
      },
    });
    await verifyPaymentHandler(req, res);
    expect(res.getStatus()).toBe(400);
    expect(res.getBody().success).toBe(false);
    expect(res.getBody().error).toBe('Invalid payment signature');
  });

  it('returns 200 on valid signature match', async () => {
    const orderId = 'order_ABC123';
    const paymentId = 'pay_XYZ789';
    const validSignature = crypto
      .createHmac('sha256', SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      },
    });

    await verifyPaymentHandler(req, res);
    expect(res.getStatus()).toBe(200);
    expect(res.getBody()).toEqual({
      success: true,
      message: 'Payment verified successfully',
      order_id: orderId,
      payment_id: paymentId,
    });
  });
});
