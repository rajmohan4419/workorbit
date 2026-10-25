/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { downloadBlob, money, num } from './toolFormat.js';

describe('toolFormat', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('formats money and numbers', () => {
    expect(money(10000)).toBe('10,000');
    expect(money(0)).toBe('0');
    expect(num(42)).toBe(42);
    expect(num(-5)).toBe(0);
  });

  it('downloads every time, with no usage limit', () => {
    const blob = new Blob(['sample'], { type: 'text/plain' });
    expect(downloadBlob(blob, 'a.txt')).toBe(true);
    expect(downloadBlob(blob, 'b.txt')).toBe(true);
    expect(localStorage.getItem('orbitboard_tool_usage')).toBeNull();
  });
});
