import { useState, useCallback } from 'react';
import { downloadBlob } from './toolFormat';

/**
 * usePreviewDownload — manages the "preview before download" flow.
 *
 * Usage:
 *   const { preview, triggerPreview, confirmDownload, cancelPreview } = usePreviewDownload();
 *
 *   // Instead of calling downloadBlob directly, call:
 *   triggerPreview(blob, 'output.pdf', 'my-tool', 'application/pdf');
 *
 *   // Render the modal:
 *   <PreviewModal
 *     isOpen={preview.isOpen}
 *     blob={preview.blob}
 *     filename={preview.filename}
 *     mimeType={preview.mimeType}
 *     onConfirm={confirmDownload}
 *     onCancel={cancelPreview}
 *   />
 */
export function usePreviewDownload() {
  const [preview, setPreview] = useState({
    isOpen: false,
    blob: null,
    filename: '',
    mimeType: '',
  });

  /**
   * Open the preview modal.
   * @param {Blob}   blob      — the file blob
   * @param {string} filename  — final filename for the download
   * @param {string} toolSlug  — tool identifier (unused here; kept for API compatibility)
   * @param {string} mimeType  — explicit MIME type (falls back to blob.type)
   */
  const triggerPreview = useCallback((blob, filename, toolSlug, mimeType) => {
    setPreview({
      isOpen: true,
      blob,
      filename,
      mimeType: mimeType || blob?.type || '',
    });
  }, []);

  /** Confirm: download the blob and close the modal. */
  const confirmDownload = useCallback(() => {
    if (preview.blob) {
      // filename is already formatted; pass null for toolSlug to skip re-formatting
      downloadBlob(preview.blob, preview.filename, null);
    }
    setPreview({ isOpen: false, blob: null, filename: '', mimeType: '' });
  }, [preview]);

  /** Cancel: close the modal without downloading. */
  const cancelPreview = useCallback(() => {
    setPreview({ isOpen: false, blob: null, filename: '', mimeType: '' });
  }, []);

  return { preview, triggerPreview, confirmDownload, cancelPreview };
}
