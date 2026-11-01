/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { downloadBlob, money, num, formatINR, formatIndianDenomination } from './toolFormat.js';

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

  it('formats INR currency with Indian digit groupings', () => {
    expect(formatINR(100000)).toBe('₹ 1,00,000');
    expect(formatINR(10000000)).toBe('₹ 1,00,00,000');
    expect(formatINR(0)).toBe('₹ 0');
    expect(formatINR(2500.5, 2)).toBe('₹ 2,500.50');
  });

  it('formats large values using Indian denominations (Lakh / Crore)', () => {
    expect(formatIndianDenomination(150000)).toBe('1.5 Lakh');
    expect(formatIndianDenomination(25000000)).toBe('2.5 Crore');
    expect(formatIndianDenomination(10000000)).toBe('1 Crore');
    expect(formatIndianDenomination(50000)).toBe('50,000');
  });

  it('downloads every time, with no usage limit', () => {
    const blob = new Blob(['sample'], { type: 'text/plain' });
    expect(downloadBlob(blob, 'a.txt')).toBe(true);
    expect(downloadBlob(blob, 'b.txt')).toBe(true);
    expect(localStorage.getItem('orbitboard_tool_usage')).toBeNull();
  });
});

