import { describe, it, expect } from 'vitest';
import { isPassOrderRequest, parsePassOrderRequest } from './passOrders.js';

describe('isPassOrderRequest', () => {
  it('treats a body with planId as a pass order', () => {
    expect(isPassOrderRequest({ planId: 'pro_pass_90d' })).toBe(true);
  });

  it('leaves donation bodies on the donation path', () => {
    expect(isPassOrderRequest({ productId: 'support-orbitboard', amountInr: 500 })).toBe(false);
    expect(isPassOrderRequest(null)).toBe(false);
  });
});

describe('parsePassOrderRequest', () => {
  it('accepts a well-formed plan id and trims whitespace', () => {
    expect(parsePassOrderRequest({ planId: '  pro_pass_90d ' })).toEqual({ planId: 'pro_pass_90d' });
  });

  it('rejects anything that is not a plain plan id', () => {
    for (const planId of ['', 'Pro_Pass', 'pro pass', "x'; drop table plans;--", 42, undefined]) {
      expect(parsePassOrderRequest({ planId })).toEqual({ error: 'Unknown plan' });
    }
  });

  it('never accepts a client-supplied amount', () => {
    const parsed = parsePassOrderRequest({ planId: 'pro_pass_90d', amountInr: 1 });
    expect(parsed).toEqual({ planId: 'pro_pass_90d' });
    expect(parsed.amountPaise).toBeUndefined();
  });
});
