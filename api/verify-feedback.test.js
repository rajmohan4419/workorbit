import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import handler from './verify-payment';
import { getRazorpay, requireAdmin } from './_lib/payments';
vi.mock('./_lib/payments', async importOriginal => ({ ...await importOriginal(), getRazorpay: vi.fn(), requireAdmin: vi.fn() }));
vi.mock('./_lib/entitlements', async importOriginal => ({ ...await importOriginal(), getUserFromRequest: vi.fn().mockResolvedValue({ id: 'owner' }) }));

describe('payment feedback server contract', () => {
  let admin, payment, row, req, res;
  beforeEach(() => {
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'synthetic-secret');
    row = { razorpay_order_id: 'order1', amount_paise: 10000, currency: 'INR', user_id: 'owner', product_id: 'pdf-download-topup' };
    const query = { select: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => ({ data: row })), then: resolve => resolve({ data: [] }) };
    admin = { from: vi.fn(name => name === 'payments' ? { insert: vi.fn().mockResolvedValue({}) } : query), rpc: vi.fn().mockResolvedValue({}) };
    requireAdmin.mockReturnValue(admin);
    payment = { id: 'pay1', order_id: 'order1', status: 'captured', amount: 10000, currency: 'INR' };
    getRazorpay.mockReturnValue({ orders: { fetch: vi.fn(async () => ({ id: 'order1', amount: 10000, currency: 'INR' })) }, payments: { fetch: vi.fn(async () => payment) } });
    req = { method: 'POST', headers: {}, body: { razorpay_order_id: 'order1', razorpay_payment_id: 'pay1', razorpay_signature: crypto.createHmac('sha256', 'synthetic-secret').update('order1|pay1').digest('hex') } };
    res = { writeHead: vi.fn(), end: vi.fn() };
  });
  afterEach(() => vi.unstubAllEnvs());
  it('emits capture and credit completion only after the actual grant resolves', async () => {
    let grant;
    admin.rpc.mockImplementationOnce(() => new Promise(resolve => { grant = resolve; }));
    const verification = handler(req, res);
    await vi.waitFor(() => expect(admin.rpc).toHaveBeenCalledWith('grant_pdf_topup', { p_order_id: 'order1', p_payment_id: 'pay1' }));
    expect(res.end).not.toHaveBeenCalled();
    grant({}); await verification;
    expect(JSON.parse(res.end.mock.calls[0][0])).toMatchObject({ success: true, payment_captured: true, credits_granted: true });
  });
  it('never returns successful feedback if credit fulfilment fails', async () => {
    admin.rpc.mockResolvedValue({ error: new Error('grant unavailable') });
    await handler(req, res);
    expect(JSON.parse(res.end.mock.calls[0][0])).toMatchObject({ success: false });
    expect(JSON.parse(res.end.mock.calls[0][0])).not.toHaveProperty('credits_granted');
  });
  it('rejects a signed but uncaptured payment before the credit grant', async () => {
    payment.status = 'authorized'; await handler(req, res);
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(JSON.parse(res.end.mock.calls[0][0]).success).toBe(false);
  });
  it('does not claim that donation orders grant PDF credits', async () => {
    row.product_id = 'support-orbitboard'; await handler(req, res);
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(JSON.parse(res.end.mock.calls[0][0])).toMatchObject({ success: true, payment_captured: true, credits_granted: false });
  });
});
