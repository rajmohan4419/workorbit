/**
 * How a source image is placed into a square GIF frame.
 *  - fit:     keep the whole image, with empty bands where the shape doesn't match
 *  - crop:    fill the square and cut away the edges
 *  - stretch: fill the square, distorting the image
 * Returns source and destination rectangles for CanvasRenderingContext2D.drawImage.
 */
export const FIT_MODES = [
  { value: 'fit', label: 'Fit (keep the whole image)' },
  { value: 'crop', label: 'Crop (fill the square)' },
  { value: 'stretch', label: 'Stretch (fill, may distort)' },
];

export const GIF_LIMITS = {
  minFrames: 2,
  maxFrames: 60,
  maxTotalBytes: 40 * 1024 * 1024,
  minSize: 100,
  maxSize: 800,
  minInterval: 0.1,
  maxInterval: 5,
};

export function computeFrameLayout({ srcW, srcH, size, mode }) {
  const full = { sx: 0, sy: 0, sw: srcW, sh: srcH };
  if (mode === 'stretch') {
    return { ...full, dx: 0, dy: 0, dw: size, dh: size };
  }
  if (mode === 'crop') {
    const side = Math.min(srcW, srcH);
    return {
      sx: (srcW - side) / 2,
      sy: (srcH - side) / 2,
      sw: side,
      sh: side,
      dx: 0, dy: 0, dw: size, dh: size,
    };
  }
  // fit (default)
  const scale = Math.min(size / srcW, size / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  return { ...full, dx: (size - dw) / 2, dy: (size - dh) / 2, dw, dh };
}

export function validateGifInputs({ fileCount, totalBytes, size, interval }) {
  const errors = [];
  if (fileCount < GIF_LIMITS.minFrames) errors.push(`Choose at least ${GIF_LIMITS.minFrames} images.`);
  if (fileCount > GIF_LIMITS.maxFrames) errors.push(`Use at most ${GIF_LIMITS.maxFrames} images.`);
  if (totalBytes > GIF_LIMITS.maxTotalBytes) errors.push('The images together are larger than 40 MB. Use smaller or fewer images.');
  if (!(size >= GIF_LIMITS.minSize && size <= GIF_LIMITS.maxSize)) errors.push(`Size must be between ${GIF_LIMITS.minSize} and ${GIF_LIMITS.maxSize} pixels.`);
  if (!(interval >= GIF_LIMITS.minInterval && interval <= GIF_LIMITS.maxInterval)) errors.push(`Frame time must be between ${GIF_LIMITS.minInterval} and ${GIF_LIMITS.maxInterval} seconds.`);
  return errors;
}
