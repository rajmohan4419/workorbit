import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, X, ZoomIn, ZoomOut, Eye, FileText } from 'lucide-react';
import { directDownloadBlob } from '../../lib/toolFormat';
import { documentFormat, isMeteredDocument } from '../../lib/monetization/documentFormat';
import { authorizeDocumentDownload } from '../../lib/monetization/downloads';
import { useAccountSession } from '../../lib/monetization/useAccountSession';
import { DownloadAccountForm } from '../monetization/DownloadAccountForm';
import { OverlayPortal } from './OverlayPortal';

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
export function PreviewModal({ blob, filename, mimeType, onConfirm, onCancel, isOpen, busy = false, error = '', queueLength = 1 }) {
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
    if (!blob || !isOpen) return;

    let active = true;
    const url = URL.createObjectURL(blob);

    Promise.resolve().then(() => {
      if (active) {
        setObjectUrl(url);
      }
    });

    if (isText) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (active) setTextContent(e.target.result ?? '');
      };
      reader.readAsText(blob);
    }

    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [blob, isOpen, isText]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel, busy]);

  if (!isOpen) return null;

  const fileSizeLabel = blob
    ? blob.size < 1024
      ? `${blob.size} B`
      : blob.size < 1024 * 1024
        ? `${(blob.size / 1024).toFixed(1)} KB`
        : `${(blob.size / (1024 * 1024)).toFixed(2)} MB`
    : '';

  return (
    <OverlayPortal>
    {/* Backdrop */}
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${filename}`}
      onClick={(e) => { if (e.target === overlayRef.current && !busy) onCancel?.(); }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      {/* Modal card */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--orbit-surface,#fff)] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[var(--orbit-border,#e5e7eb)] modal-elastic-enter will-change-transform">

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
            disabled={busy}
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
        {error && <p role="alert" className="px-5 py-2 text-sm text-red-700">{error}</p>}
        {queueLength > 1 && <p className="px-5 py-2 text-xs text-stone-600">{queueLength} files queued. Each confirmed PDF/XLSX file counts as one download.</p>}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[var(--orbit-border,#e5e7eb)] shrink-0 bg-[var(--orbit-surface,#fff)]">
          <button
            disabled={busy}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors shadow"
          >
            <Download className="w-4 h-4" />
            {busy ? 'Recording download…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
    </OverlayPortal>
  );
}

export function GlobalPreviewModal() {
  const [queue, setQueue] = useState([]);
  const { session, loading } = useAccountSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const inFlight = useRef(false);
  const data = queue[0];

  useEffect(() => {
    const handleEvent = (e) => {
      e.preventDefault();
      const { blob, filename, mimeType, toolSlug } = e.detail;
      const routeSlug = window.location.pathname.startsWith('/tools/') ? window.location.pathname.split('/')[2] : null;
      setQueue(items => [...items, { blob, filename, mimeType, toolSlug: toolSlug || routeSlug, requestId: crypto.randomUUID() }]);
    };
    window.addEventListener('orbitboard:preview-download', handleEvent);
    return () => window.removeEventListener('orbitboard:preview-download', handleEvent);
  }, []);

  const handleConfirm = async () => {
    if (!data?.blob || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      if (isMeteredDocument(data.filename, data.mimeType)) {
        await authorizeDocumentDownload({ requestId: data.requestId, format: documentFormat(data.filename, data.mimeType || ''), toolSlug: data.toolSlug });
      }
      directDownloadBlob(data.blob, data.filename, null);
      setQueue(items => items.slice(1));
      window.dispatchEvent(new CustomEvent('orbitboard:download-recorded'));
    } catch (err) {
      setError(err.message);
      if (err.code === 'sign_in_required') setAuthRequired(true);
    } finally { inFlight.current = false; setBusy(false); }
  };

  const handleCancel = useCallback(() => {
    if (inFlight.current) return;
    setQueue([]); setError(''); setAuthRequired(false);
  }, []);

  if (!data) return null;
  const metered = isMeteredDocument(data.filename, data.mimeType);
  if (metered && (loading || !session || session.user?.is_anonymous || authRequired)) return <DownloadAccountDialog loading={loading} error={error} onCancel={handleCancel} onSignedIn={() => { setAuthRequired(false); setError(''); }} />;

  return (
    <PreviewModal
      isOpen
      blob={data.blob}
      filename={data.filename}
      mimeType={data.mimeType}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      busy={busy}
      error={error}
      queueLength={queue.length}
    />
  );
}

function DownloadAccountDialog({ loading, error, onCancel, onSignedIn }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (panel.current.querySelector('input') || panel.current.querySelector('button'))?.focus();
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
      if (event.key === 'Tab') {
        const fields = [...panel.current.querySelectorAll('input, button, a[href]')].filter(field => !field.disabled);
        const first = fields[0], last = fields.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const element = panel.current;
    element.addEventListener('keydown', key);
    return () => { element.removeEventListener('keydown', key); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, [onCancel]);
  return <OverlayPortal><div ref={panel} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Account required for document download">
    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-stone-900 shadow-xl">
      <button type="button" onClick={onCancel} aria-label="Close download sign-up" className="float-right min-h-11 px-3">✕</button>
      {loading ? <p role="status">Checking account…</p> : <DownloadAccountForm onSignedIn={onSignedIn} />}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="button" onClick={onCancel} className="mt-4 text-sm underline">Continue using tools without downloading</button>
    </div>
  </div></OverlayPortal>;
}
