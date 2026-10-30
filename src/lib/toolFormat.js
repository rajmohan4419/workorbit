// Formatting and download helpers shared by tool modules.

export const money = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.max(0, Number(n) || 0));
export const num = v => Math.max(0, Number(v) || 0);

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
  if (bypassPreview || typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
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
    detail: { blob, filename: finalName, toolSlug, mimeType: blob?.type }
  });

  const notPrevented = window.dispatchEvent(event);
  if (notPrevented) {
    return directDownloadBlob(blob, filename, toolSlug);
  }
  return true;
}
