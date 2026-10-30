import { describe, it, expect } from 'vitest';
import { quantizeRgba, createGif } from './gifEncoder.js';

describe('gifEncoder', () => {
  it('quantizes RGBA pixels and produces a palette and pixel indices', () => {
    // 2x2 image (4 pixels)
    // Pixel 0: Red (255, 0, 0, 255)
    // Pixel 1: Blue (0, 0, 255, 255)
    // Pixel 2: Red (255, 0, 0, 255)
    // Pixel 3: Green (0, 255, 0, 255)
    const rgba = new Uint8Array([
      255, 0, 0, 255,
      0, 0, 255, 255,
      255, 0, 0, 255,
      0, 255, 0, 255,
    ]);

    const { palette, indices } = quantizeRgba(rgba, 16);
    expect(palette.length).toBeGreaterThanOrEqual(4);
    expect(indices.length).toBe(4);
    // Pixel 0 and Pixel 2 should map to the same palette index
    expect(indices[0]).toBe(indices[2]);
  });

  it('generates a valid GIF89a binary blob', async () => {
    const width = 4;
    const height = 4;
    const palette = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 255],
    ];
    const indices = new Uint8Array(16).fill(0);
    indices[5] = 1;
    indices[10] = 2;

    const frames = [
      { palette, indices },
      { palette, indices },
    ];

    const blob = createGif(width, height, frames, 100, 0);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/gif');

    const buffer = new Uint8Array(await blob.arrayBuffer());
    // GIF89a magic signature: 'G' 'I' 'F' '8' '9' 'a'
    const header = String.fromCharCode(...buffer.slice(0, 6));
    expect(header).toBe('GIF89a');

    // GIF Logical Screen Descriptor width & height (little-endian)
    const encodedWidth = buffer[6] | (buffer[7] << 8);
    const encodedHeight = buffer[8] | (buffer[9] << 8);
    expect(encodedWidth).toBe(width);
    expect(encodedHeight).toBe(height);

    // GIF trailer ends with 0x3B (';')
    expect(buffer[buffer.length - 1]).toBe(0x3B);
  });
});

