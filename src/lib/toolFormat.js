// Formatting and download helpers shared by tool modules.
import { isMeteredDocument } from './monetization/documentFormat.js';

export const money = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.max(0, Number(n) || 0));
export const num = v => Math.max(0, Number(v) || 0);

/**
 * Standard comma-separated Indian currency format: e.g. "₹ 1,50,000"
 */
export const formatINR = (n, decimals = 0) => {
  const numVal = Number(n);
  if (isNaN(numVal)) return '₹ 0';
  const isNeg = numVal < 0;
  const absVal = Math.abs(numVal);
  const formatted = absVal.toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
  return `${isNeg ? '- ' : ''}₹ ${formatted}`;
};

/**
 * Compact Indian denomination for large numbers: e.g. "10 Lakh", "1.5 Crore"
 */
export function formatIndianDenomination(numVal) {
  const val = Number(numVal || 0);
  if (isNaN(val)) return '0';
  const isNeg = val < 0;
  const absVal = Math.abs(val);

  let formatted;
  if (absVal >= 10000000) {
    formatted = `${parseFloat((absVal / 10000000).toFixed(2))} Crore`;
  } else if (absVal >= 100000) {
    formatted = `${parseFloat((absVal / 100000).toFixed(2))} Lakh`;
  } else {
    formatted = absVal.toLocaleString('en-IN');
  }
  return isNeg ? `-${formatted}` : formatted;
}

/**
 * Ensures all downloads strictly conform to the pattern:
 * orbitboard-<toolslug>.<format>
 */
export function formatDownloadFilename(toolSlug, formatOrExt) {
  const ext = (formatOrExt || 'dat').replace(/^\./, '').toLowerCase();
  const slug = (toolSlug || 'file').replace(/^orbitboard-/, '');
  return `orbitboard-${slug}.${ext}`;
}

export function directDownloadBlob(blob, filename, toolSlug) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  let finalName = filename || 'download';
  if (toolSlug) {
    const ext = filename?.includes('.') ? filename.split('.').pop() : 'dat';
    finalName = `orbitboard-${toolSlug.replace(/^orbitboard-/, '')}.${ext}`;
  } else if (!finalName.startsWith('orbitboard-')) {
    finalName = `orbitboard-${finalName}`;
  }

  a.download = finalName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function downloadBlob(blob, filename, toolSlug, bypassPreview = false) {
  const metered = isMeteredDocument(filename, blob?.type);
  if ((bypassPreview && !metered) || typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return directDownloadBlob(blob, filename, toolSlug);
  }

  let finalName = filename || 'download';
  if (toolSlug) {
    const ext = filename?.includes('.') ? filename.split('.').pop() : 'dat';
    finalName = `orbitboard-${toolSlug.replace(/^orbitboard-/, '')}.${ext}`;
  } else if (!finalName.startsWith('orbitboard-')) {
    finalName = `orbitboard-${finalName}`;
  }

  const event = new CustomEvent('orbitboard:preview-download', {
    cancelable: true,
    detail: { blob, filename: finalName, toolSlug, mimeType: blob?.type, metered }
  });

  const notPrevented = window.dispatchEvent(event);
  if (notPrevented) {
    // PDF/XLSX must go through the signed-in coordinator, even if preview was bypassed.
    if (metered) return false;
    return directDownloadBlob(blob, filename, toolSlug);
  }
  return true;
}
