// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RazorpayCheckout } from './RazorpayCheckout';
import { getFeedbackSnapshot } from '../lib/feedback/taskFeedback';
vi.mock('../lib/razorpay', () => ({ loadRazorpayScript: vi.fn().mockResolvedValue(true) }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('one-time checkout feedback', () => {
  let root, container, options;
  beforeEach(() => {
    vi.stubEnv('VITE_RAZORPAY_KEY_ID', 'synthetic-public');
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    window.Razorpay = class { constructor(value) { options = value; } on() {} open() {} };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ order_id: 'order1', amount: 50000, currency: 'INR' }) }));
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); delete window.Razorpay; });
  it('blocks another checkout, verifies once and retries pending confirmation without another order', async () => {
    const paid = vi.fn();
    await act(async () => root.render(<RazorpayCheckout onSuccess={paid} />));
    await act(async () => { container.querySelector('button').click(); container.querySelector('button').click(); });
    expect(fetch).toHaveBeenCalledTimes(1); expect(container.querySelector('button').disabled).toBe(true);
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    const payment = { razorpay_order_id: 'order1', razorpay_payment_id: 'pay1', razorpay_signature: 'synthetic' };
    await act(async () => { await options.handler(payment); await options.handler(payment); options.modal.ondismiss(); });
    expect(paid).not.toHaveBeenCalled(); expect(fetch).toHaveBeenCalledTimes(2);
    expect(getFeedbackSnapshot().tasks.at(-1).state).toBe('error');
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, payment_captured: true }) });
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Retry payment confirmation').click());
    expect(paid).toHaveBeenCalledTimes(1); expect(fetch).toHaveBeenCalledTimes(3);
    expect(getFeedbackSnapshot().tasks.at(-1).label).toBe('Payment confirmed.');
  });
});
