/**
 * Pure client-side GIF89a encoder with median-cut color quantization and LZW compression.
 * Zero external dependencies. Works directly in all modern browsers.
 */

// Simple median-cut / popularity color quantizer for up to 256 colors
export function quantizeRgba(rgba, maxColors = 256) {
  const pixelCount = rgba.length / 4;
  const colorCounts = new Map();

  // Downsample to 5-bit channels for fast clustering
  for (let i = 0; i < rgba.length; i += 4) {
    // If transparent, map to key -1
    if (rgba[i + 3] < 128) continue;
    const r = rgba[i] >> 3;
    const g = rgba[i + 1] >> 3;
    const b = rgba[i + 2] >> 3;
    const key = (r << 10) | (g << 5) | b;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }

  // Sort by popularity
  const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);
  const palette = [];
  const colorToIndex = new Map();

  for (let i = 0; i < Math.min(maxColors, sorted.length); i++) {
    const key = sorted[i][0];
    const r = ((key >> 10) & 0x1f) << 3;
    const g = ((key >> 5) & 0x1f) << 3;
    const b = (key & 0x1f) << 3;
    palette.push([r, g, b]);
    colorToIndex.set(key, i);
  }

  // Ensure palette has at least 2 colors
  if (palette.length === 0) palette.push([0, 0, 0], [255, 255, 255]);
  while (palette.length < 4) palette.push([0, 0, 0]);

  // Map each pixel to nearest palette index
  const indices = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const a = rgba[offset + 3];

    if (a < 128) {
      indices[i] = 0;
      continue;
    }

    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const existing = colorToIndex.get(key);
    if (existing !== undefined) {
      indices[i] = existing;
    } else {
      // Find closest Euclidean distance
      let minDist = Infinity;
      let bestIdx = 0;
      for (let p = 0; p < palette.length; p++) {
        const pr = palette[p][0];
        const pg = palette[p][1];
        const pb = palette[p][2];
        const dist = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
        if (dist < minDist) {
          minDist = dist;
          bestIdx = p;
        }
      }
      colorToIndex.set(key, bestIdx);
      indices[i] = bestIdx;
    }
  }

  return { palette, indices };
}

// LZW Compression for GIF
function lzwCompress(pixels, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const maxCode = 4096;

  let dict = new Map();
  function resetDict() {
    dict.clear();
    for (let i = 0; i < clearCode; i++) dict.set(String(i), i);
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  }
  resetDict();

  const outBits = [];
  function emit(code, size) {
    for (let b = 0; b < size; b++) {
      outBits.push((code >> b) & 1);
    }
  }

  emit(clearCode, codeSize);

  let prefix = "";
  for (let i = 0; i < pixels.length; i++) {
    const k = pixels[i];
    const key = prefix === "" ? String(k) : prefix + "," + k;
    if (dict.has(key)) {
      prefix = key;
    } else {
      emit(dict.get(prefix), codeSize);
      if (nextCode < maxCode) {
        dict.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      } else {
        emit(clearCode, codeSize);
        resetDict();
      }
      prefix = String(k);
    }
  }
  if (prefix !== "") emit(dict.get(prefix), codeSize);
  emit(eoiCode, codeSize);

  // Convert bitstream to bytes
  const bytes = [];
  for (let i = 0; i < outBits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8 && i + b < outBits.length; b++) {
      byte |= (outBits[i + b] << b);
    }
    bytes.push(byte);
  }
  return bytes;
}

// Assemble full GIF binary
export function createGif(width, height, frames, delayMs = 200, repeat = 0) {
  const bytes = [];
  const writeStr = str => { for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i)); };
  const write16 = val => { bytes.push(val & 0xff, (val >> 8) & 0xff); };

  // 1. Header
  writeStr("GIF89a");

  // 2. Logical Screen Descriptor
  write16(width);
  write16(height);
  bytes.push(0x70, 0x00, 0x00); // No global color table

  // 3. Netscape 2.0 Application Extension (for looping)
  if (repeat >= 0) {
    bytes.push(0x21, 0xFF, 0x0B);
    writeStr("NETSCAPE2.0");
    bytes.push(0x03, 0x01);
    write16(repeat);
    bytes.push(0x00);
  }

  // 4. Frames
  const delayHundredths = Math.max(2, Math.round(delayMs / 10));

  for (const frame of frames) {
    // Graphic Control Extension
    bytes.push(0x21, 0xF9, 0x04, 0x04);
    write16(delayHundredths);
    bytes.push(0x00, 0x00);

    // Image Descriptor
    bytes.push(0x2C);
    write16(0); write16(0); // Left, Top
    write16(width); write16(height);

    // Local Color Table
    const palette = frame.palette;
    const pBits = 7; // 256 colors
    bytes.push(0x80 | pBits);

    for (let i = 0; i < 256; i++) {
      if (i < palette.length) {
        bytes.push(palette[i][0], palette[i][1], palette[i][2]);
      } else {
        bytes.push(0, 0, 0);
      }
    }

    // LZW Data
    const minCodeSize = Math.max(2, pBits + 1);
    bytes.push(minCodeSize);

    const lzwData = lzwCompress(frame.indices, minCodeSize);
    let offset = 0;
    while (offset < lzwData.length) {
      const chunkLen = Math.min(255, lzwData.length - offset);
      bytes.push(chunkLen);
      for (let i = 0; i < chunkLen; i++) bytes.push(lzwData[offset + i]);
      offset += chunkLen;
    }
    bytes.push(0x00); // Block terminator
  }

  // 5. Trailer
  bytes.push(0x3B);

  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

/**
 * Encode an animated GIF from a sequence of HTML5 Image elements or Canvas elements.
 */
export async function encodeGifFromImages(images, { width = 480, height = 360, delayMs = 300, onProgress }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const frames = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    ctx.clearRect(0, 0, width, height);

    // Maintain aspect ratio with black/transparent letterboxing or centered cover
    const scale = Math.min(width / img.width, height / img.height);
    const x = (width - img.width * scale) / 2;
    const y = (height - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    const imgData = ctx.getImageData(0, 0, width, height);
    const { palette, indices } = quantizeRgba(imgData.data, 256);
    frames.push({ palette, indices });

    if (onProgress) onProgress(Math.round(((i + 1) / images.length) * 85));
  }

  if (onProgress) onProgress(90);
  const blob = createGif(width, height, frames, delayMs, 0);
  if (onProgress) onProgress(100);
  return blob;
}

/**
 * Capture and encode video frames into an animated GIF.
 */
export async function encodeGifFromVideo(video, { startTime = 0, endTime = 5, fps = 8, width = 360, onProgress }) {
  const duration = Math.max(0.5, endTime - startTime);
  const totalFrames = Math.min(60, Math.max(2, Math.round(duration * fps)));
  const interval = duration / totalFrames;
  const delayMs = Math.round(1000 / fps);

  // Compute proportional height
  const aspect = (video.videoHeight || 270) / (video.videoWidth || 480);
  const height = Math.round(width * aspect);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const frames = [];

  for (let f = 0; f < totalFrames; f++) {
    const targetTime = startTime + f * interval;
    video.currentTime = targetTime;

    await new Promise(resolve => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked, { once: true });
    });

    ctx.drawImage(video, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const { palette, indices } = quantizeRgba(imgData.data, 256);
    frames.push({ palette, indices });

    if (onProgress) onProgress(Math.round(((f + 1) / totalFrames) * 85));
  }

  if (onProgress) onProgress(92);
  const blob = createGif(width, height, frames, delayMs, 0);
  if (onProgress) onProgress(100);
  return blob;
}

