import { describe, it, expect } from 'vitest';
import { computeFrameLayout, validateGifInputs } from './gifLayout';

describe('computeFrameLayout', () => {
  it('fit: a wide image is centred vertically with bands above and below', () => {
    const r = computeFrameLayout({ srcW: 400, srcH: 200, size: 300, mode: 'fit' });
    expect(r.dw).toBe(300);
    expect(r.dh).toBe(150);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(75);
  });

  it('fit: a tall image is centred horizontally', () => {
    const r = computeFrameLayout({ srcW: 200, srcH: 400, size: 300, mode: 'fit' });
    expect(r.dh).toBe(300);
    expect(r.dw).toBe(150);
    expect(r.dx).toBe(75);
  });

  it('crop: takes the centre square of a wide image', () => {
    const r = computeFrameLayout({ srcW: 400, srcH: 200, size: 300, mode: 'crop' });
    expect(r.sx).toBe(100);
    expect(r.sw).toBe(200);
    expect(r.sh).toBe(200);
    expect(r.dw).toBe(300);
  });

  it('stretch: uses the whole source and fills the frame', () => {
    const r = computeFrameLayout({ srcW: 400, srcH: 200, size: 300, mode: 'stretch' });
    expect(r.sw).toBe(400);
    expect(r.sh).toBe(200);
    expect(r.dw).toBe(300);
    expect(r.dh).toBe(300);
  });
});

describe('validateGifInputs', () => {
  const ok = { fileCount: 3, totalBytes: 1000, size: 400, interval: 0.5 };

  it('accepts reasonable inputs', () => {
    expect(validateGifInputs(ok)).toEqual([]);
  });

  it('rejects too few or too many images', () => {
    expect(validateGifInputs({ ...ok, fileCount: 1 })).not.toEqual([]);
    expect(validateGifInputs({ ...ok, fileCount: 61 })).not.toEqual([]);
  });

  it('rejects files over the total size limit', () => {
    expect(validateGifInputs({ ...ok, totalBytes: 41 * 1024 * 1024 })).not.toEqual([]);
  });

  it('rejects out-of-range size and frame time', () => {
    expect(validateGifInputs({ ...ok, size: 50 })).not.toEqual([]);
    expect(validateGifInputs({ ...ok, interval: 0 })).not.toEqual([]);
  });
});
