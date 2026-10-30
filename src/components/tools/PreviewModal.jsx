import { useState, useEffect, useRef } from 'react';
import { Download, X, ZoomIn, ZoomOut, Eye, FileText } from 'lucide-react';

/**
 * PreviewModal — shows a preview of a blob before the user downloads it.
 *
 * Props:
 *   blob      {Blob}     — the file to preview
 *   filename  {string}   — suggested download filename
 *   mimeType  {string}   — MIME type (falls back to blob.type)
 *   onConfirm {Function} — called when the user confirms the download
 *   onCancel  {Function} — called when the user dismisses the modal
 *   isOpen    {boolean}  — controls visibility
 */
export function PreviewModal({ blob, filename, mimeType, onConfirm, onCancel, isOpen }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [textContent, setTextContent] = useState(null);
  const overlayRef = useRef(null);

  const effectiveMime = mimeType || blob?.type || '';
  const isImage = effectiveMime.startsWith('image/');
  const isPdf = effectiveMime === 'application/pdf';
  const isText =
    effectiveMime.startsWith('text/') ||
    ['application/json', 'text/csv', 'text/plain'].includes(effectiveMime);

  // Create / revoke the object URL when the modal opens or closes.
  useEffect(() => {
    if (!blob || !isOpen) {
      setObjectUrl(null);
      setTextContent(null);
      setZoom(1);
      return;
    }

    const url = URL.createObjectURL(blob);
    setObjectUrl(url);

    if (isText) {
      const reader = new FileReader();
      reader.onload = (e) => setTextContent(e.target.result ?? '');
      reader.readAsText(blob);
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const fileSizeLabel = blob
    ? blob.size < 1024
      ? `${blob.size} B`
      : blob.size < 1024 * 1024
        ? `${(blob.size / 1024).toFixed(1)} KB`
        : `${(blob.size / (1024 * 1024)).toFixed(2)} MB`
    : '';

  return (
    /* Backdrop */
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${filename}`}
      onClick={(e) => { if (e.target === overlayRef.current) onCancel?.(); }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      {/* Modal card */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--orbit-surface,#fff)] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[var(--orbit-border,#e5e7eb)]">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--orbit-border,#e5e7eb)] shrink-0">
          <Eye className="w-4 h-4 text-indigo-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800 truncate" title={filename}>{filename}</p>
            {fileSizeLabel && (
              <p className="text-xs text-stone-400">{fileSizeLabel}</p>
            )}
          </div>

          {/* Zoom controls for images */}
          {isImage && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                aria-label="Zoom out"
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-stone-500 w-10 text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                aria-label="Zoom in"
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={onCancel}
            aria-label="Close preview"
            className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Preview area ── */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-stone-50 min-h-0">
          {isImage && objectUrl && (
            <div className="p-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'center top', transition: 'transform 0.15s ease' }}>
              <img
                src={objectUrl}
                alt={filename}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow"
              />
            </div>
          )}

          {isPdf && objectUrl && (
            <iframe
              src={objectUrl}
              title={filename}
              className="w-full h-[60vh] border-0"
            />
          )}

          {isText && (
            <pre className="w-full h-[60vh] overflow-auto p-5 text-xs font-mono text-stone-700 whitespace-pre-wrap break-words bg-stone-50">
              {textContent ?? 'Loading…'}
            </pre>
          )}

          {!isImage && !isPdf && !isText && (
            <div className="flex flex-col items-center gap-3 py-16 text-stone-400">
              <FileText className="w-14 h-14" />
              <p className="text-sm font-medium">{filename}</p>
              <p className="text-xs">{fileSizeLabel} · {effectiveMime || 'unknown type'}</p>
              <p className="text-xs text-stone-300">No preview available for this file type.</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[var(--orbit-border,#e5e7eb)] shrink-0 bg-[var(--orbit-surface,#fff)]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors shadow"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
