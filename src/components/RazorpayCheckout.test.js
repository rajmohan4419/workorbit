/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { loadRazorpayScript } from '../lib/razorpay.js';

describe('loadRazorpayScript', () => {
  beforeEach(() => {
    delete window.Razorpay;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    delete window.Razorpay;
    document.body.innerHTML = '';
  });

  it('resolves immediately if window.Razorpay is already present', async () => {
    window.Razorpay = vi.fn();
    const result = await loadRazorpayScript();
    expect(result).toBe(true);
  });

  it('appends Razorpay checkout script tag to document body', async () => {
    const loadPromise = loadRazorpayScript();
    const script = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    expect(script).not.toBeNull();
    expect(script.src).toBe('https://checkout.razorpay.com/v1/checkout.js');

    script.onload();
    const result = await loadPromise;
    expect(result).toBe(true);
  });
});
