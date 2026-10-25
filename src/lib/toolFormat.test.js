/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { downloadBlob, money, num } from './toolFormat.js';

describe('toolFormat', () => {
  beforeEach(() => {
    localStorage.clear();
    // mock URL createObjectURL and revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
    window.history.pushState({}, '', '/tools/pdf-merge');
  });

  it('formats money and numbers properly', () => {
    expect(money(10000)).toBe('10,000');
    expect(money(0)).toBe('0');
    expect(num(42)).toBe(42);
    expect(num(-5)).toBe(0);
  });

  it('allows 1st free download on a tool and records usage', () => {
    const blob = new Blob(['sample'], { type: 'text/plain' });
    const success = downloadBlob(blob, 'test.txt');
    expect(success).toBe(true);

    const usage = JSON.parse(localStorage.getItem('orbitboard_tool_usage') || '{}');
    expect(usage['pdf-merge']).toBe(1);
  });

  it('blocks 2nd download and dispatches orbitboard:require-pro event', () => {
    localStorage.setItem('orbitboard_tool_usage', JSON.stringify({ 'pdf-merge': 1 }));

    const requireProListener = vi.fn();
    window.addEventListener('orbitboard:require-pro', requireProListener);

    const blob = new Blob(['sample'], { type: 'text/plain' });
    const success = downloadBlob(blob, 'second.txt');

    expect(success).toBe(false);
    expect(requireProListener).toHaveBeenCalledTimes(1);
    expect(requireProListener.mock.calls[0][0].detail.toolSlug).toBe('pdf-merge');
  });

  it('allows unlimited downloads when Pro is active', () => {
    localStorage.setItem('orbitboard_tool_usage', JSON.stringify({ 'pdf-merge': 5 }));
    localStorage.setItem('orbitboard_pro_session', JSON.stringify({
      isPro: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    }));

    const requireProListener = vi.fn();
    window.addEventListener('orbitboard:require-pro', requireProListener);

    const blob = new Blob(['sample'], { type: 'text/plain' });
    const success = downloadBlob(blob, 'pro.txt');

    expect(success).toBe(true);
    expect(requireProListener).not.toHaveBeenCalled();
  });
});
