import { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Copy, Check, Download, Image as ImageIcon, Share2, Sparkles, Loader2
} from 'lucide-react';
import {
  getPlatformShareUrls,
  generateResultScorecardBlob,
  copyScorecardImageToClipboard,
  downloadScorecardBlob,
  canNativeShareScorecard,
  nativeShareScorecard,
  buildShareableToolUrl,
} from '../../lib/shareResults';

// Platform icons as clean SVG components
function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.64C9.36 7.64 9.09 7.7 8.87 7.94C8.64 8.18 8 8.78 8 10C8 11.22 8.89 12.4 9.01 12.56C9.14 12.73 10.75 15.21 13.22 16.28C13.81 16.53 14.27 16.69 14.62 16.8C15.22 16.99 15.76 16.96 16.2 16.9C16.68 16.82 17.68 16.29 17.89 15.71C18.1 15.13 18.1 14.63 18.04 14.53C17.98 14.43 17.81 14.37 17.56 14.25C17.3 14.12 16.06 13.51 15.83 13.42C15.6 13.34 15.43 13.3 15.27 13.55C15.1 13.79 14.62 14.37 14.47 14.53C14.33 14.7 14.18 14.72 13.93 14.59C13.67 14.47 12.85 14.2 11.88 13.33C11.12 12.65 10.6 11.82 10.45 11.57C10.31 11.31 10.44 11.18 10.57 11.05C10.69 10.93 10.83 10.75 10.96 10.6C11.09 10.45 11.13 10.35 11.22 10.18C11.3 10 11.26 9.85 11.2 9.72C11.13 9.6 10.65 8.42 10.45 7.94C10.25 7.47 10.05 7.53 9.9 7.53C9.76 7.53 9.64 7.64 9.53 7.64Z" />
    </svg>
  );
}

function TwitterIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 0 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.4 9.74v-8.37H5.06v8.37h2.8z" />
    </svg>
  );
}

function TelegramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

/**
 * Interactive Share Result Modal & Scorecard Generator
 */
export function ShareResultModal({
  isOpen,
  onClose,
  tool,
  sharePayload = null,
}) {
  if (!isOpen) return null;

  return (
    <ShareResultModalDialog
      onClose={onClose}
      tool={tool}
      sharePayload={sharePayload}
    />
  );
}

function ShareResultModalDialog({
  onClose,
  tool,
  sharePayload = null,
}) {
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copyImageError, setCopyImageError] = useState(false);

  // 3D Tilt interactive state
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const previewRef = useRef(null);

  // Resolved parameters
  const resolvedToolName = tool?.name || 'OrbitBoard Tool';
  const resolvedCategory = tool?.category || 'Everyday';
  const slug = tool?.slug || 'tools';

  // Derived headline and submetrics from live payload or fallback
  const headline = sharePayload?.headlineMetric || `${resolvedToolName} Report`;
  const subMetrics = useMemo(() => {
    if (sharePayload?.subMetrics && Array.isArray(sharePayload.subMetrics)) {
      return sharePayload.subMetrics;
    }
    return [
      { label: 'Platform', value: '100% Client-Side' },
      { label: 'Security', value: 'Zero Data Stored' },
      { label: 'Engine', value: 'Instant & Private' },
    ];
  }, [sharePayload]);

  // Deep-link URL construction
  const deepLinkUrl = useMemo(() => {
    return buildShareableToolUrl(slug, sharePayload?.queryParams || {});
  }, [slug, sharePayload]);

  const socialShareText = useMemo(() => {
    if (sharePayload?.summaryText) {
      return `${sharePayload.summaryText} — calculated with zero data leaks on OrbitBoard.`;
    }
    return `Check out my ${resolvedToolName} result on OrbitBoard (${headline}) — 100% client-side and privacy-first!`;
  }, [sharePayload, resolvedToolName, headline]);

  const platformUrls = useMemo(() => {
    return getPlatformShareUrls({
      title: `${resolvedToolName} Result | OrbitBoard`,
      text: socialShareText,
      url: deepLinkUrl,
    });
  }, [resolvedToolName, socialShareText, deepLinkUrl]);

  // Render canvas scorecard on mount
  useEffect(() => {
    let active = true;
    let objectUrl = '';

    generateResultScorecardBlob({
      toolName: resolvedToolName,
      category: resolvedCategory,
      headlineMetric: headline,
      subMetrics,
      shareUrl: deepLinkUrl,
    })
      .then((generatedBlob) => {
        if (!active) return;
        setBlob(generatedBlob);
        objectUrl = URL.createObjectURL(generatedBlob);
        setPreviewUrl(objectUrl);
        setIsGenerating(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Scorecard generation failed:', err);
        setIsGenerating(false);
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resolvedToolName, resolvedCategory, headline, subMetrics, deepLinkUrl]);

  // 3D Tilt handlers
  const handleMouseMove = (e) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rx = ((y - centerY) / centerY) * -9; // max 9 deg
    const ry = ((x - centerX) / centerX) * 9;
    setTilt({ rx, ry });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  // Copy Link Action
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(deepLinkUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // fallback
    }
  };

  // Copy Image Action
  const handleCopyImage = async () => {
    if (!blob) return;
    try {
      await copyScorecardImageToClipboard(blob);
      setCopiedImage(true);
      setCopyImageError(false);
      setTimeout(() => setCopiedImage(false), 2200);
    } catch (err) {
      console.warn('Image clipboard copy failed, falling back to download:', err);
      setCopyImageError(true);
      downloadScorecardBlob(blob, `${slug}-scorecard.png`);
      setTimeout(() => setCopyImageError(false), 3000);
    }
  };

  // Download Card Action
  const handleDownloadImage = () => {
    if (!blob) return;
    downloadScorecardBlob(blob, `${slug}-scorecard.png`);
  };

  // Native Share Action
  const hasNativeShare = canNativeShareScorecard();
  const handleNativeShare = async () => {
    if (!blob) return;
    try {
      await nativeShareScorecard({
        blob,
        title: `${resolvedToolName} Result`,
        text: socialShareText,
        url: deepLinkUrl,
      });
    } catch {
      // User dismissed or unsupported
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-[var(--orbit-border)] bg-stone-900 text-stone-100 shadow-2xl p-5 sm:p-7 space-y-6 ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-500/20 text-accent-400 flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <div>
              <h2 id="share-modal-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Share Result Scorecard
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  <Sparkles size={11} /> 100% Client-Side
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Share your verified calculation to social media or copy as an image.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Scorecard Preview with 3D Tilt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-400 px-1">
            <span>Visual Scorecard (1200 × 630)</span>
            <span className="text-[11px] text-stone-500">Zero PII • Client-Side Generated</span>
          </div>
          <div
            ref={previewRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: 1000 }}
            className="relative overflow-hidden rounded-2xl border border-stone-800 bg-[#0B0F19] p-1.5 shadow-xl transition-transform duration-200"
          >
            <div
              style={{
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                transition: tilt.rx === 0 && tilt.ry === 0 ? 'transform 0.4s ease-out' : 'transform 0.05s ease-out',
              }}
              className="relative w-full aspect-[1200/630] rounded-xl overflow-hidden bg-stone-950 flex items-center justify-center"
            >
              {isGenerating ? (
                <div className="flex flex-col items-center gap-2.5 text-stone-400">
                  <Loader2 size={28} className="animate-spin text-accent-400" />
                  <span className="text-xs font-medium">Generating high-contrast card...</span>
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`${resolvedToolName} Scorecard`}
                  className="w-full h-full object-contain select-none pointer-events-none"
                />
              ) : (
                <div className="text-xs text-stone-500">Preview not available</div>
              )}
            </div>
          </div>
        </div>

        {/* One-Click Social Share Buttons */}
        <div className="space-y-2.5">
          <span className="block text-xs font-semibold text-stone-300">Share Directly To:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* WhatsApp */}
            <a
              href={platformUrls.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold transition active:scale-[0.98]"
            >
              <WhatsAppIcon size={16} />
              <span>WhatsApp</span>
            </a>

            {/* X (Twitter) */}
            <a
              href={platformUrls.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold transition active:scale-[0.98]"
            >
              <TwitterIcon size={14} />
              <span>X (Twitter)</span>
            </a>

            {/* LinkedIn */}
            <a
              href={platformUrls.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0A66C2]/15 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/30 text-[#60A5FA] text-xs font-semibold transition active:scale-[0.98]"
            >
              <LinkedInIcon size={16} />
              <span>LinkedIn</span>
            </a>

            {/* Telegram */}
            <a
              href={platformUrls.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/30 text-[#38BDF8] text-xs font-semibold transition active:scale-[0.98]"
            >
              <TelegramIcon size={16} />
              <span>Telegram</span>
            </a>
          </div>
        </div>

        {/* Visual & Clipboard Actions */}
        <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
          {/* Copy Image Button */}
          <button
            type="button"
            onClick={handleCopyImage}
            disabled={!blob || isGenerating}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition shadow-md active:scale-[0.98] cursor-pointer"
          >
            {copiedImage ? (
              <>
                <Check size={16} className="text-white" />
                <span>Scorecard Copied to Clipboard!</span>
              </>
            ) : copyImageError ? (
              <>
                <Download size={16} />
                <span>Downloaded PNG (Clipboard restricted)</span>
              </>
            ) : (
              <>
                <ImageIcon size={16} />
                <span>Copy Image (Paste to Social)</span>
              </>
            )}
          </button>

          {/* Download Card Button */}
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={!blob || isGenerating}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-750 disabled:opacity-50 text-stone-200 hover:text-white text-xs sm:text-sm font-semibold transition active:scale-[0.98] cursor-pointer"
          >
            <Download size={16} />
            <span>Download Card (PNG)</span>
          </button>
        </div>

        {/* Native Mobile Share Button */}
        {hasNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            disabled={!blob || isGenerating}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-accent-500/30 bg-accent-950/30 text-accent-300 hover:bg-accent-950/50 text-xs font-semibold transition cursor-pointer"
          >
            <Share2 size={15} />
            <span>Open System Share Sheet (Mobile)</span>
          </button>
        )}

        {/* Deep-link Shareable URL Box */}
        <div className="space-y-1.5 pt-2 border-t border-stone-800">
          <label className="block text-xs font-semibold text-stone-300">
            Shareable Deep-Link URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={deepLinkUrl}
              className="flex-1 rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-2.5 text-xs font-mono text-stone-300 select-all outline-none focus:border-accent-500"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-white transition shrink-0 cursor-pointer active:scale-[0.98]"
            >
              {copiedLink ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-stone-500">
            Recipients can view the verified metrics or run their own calculation locally.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable Share Result trigger button for placement inside output cards.
 */
export function ShareResultButton({
  onClick,
  label = 'Share Result',
  size = 'md',
  className = '',
}) {
  const isSm = size === 'sm';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition shadow-xs active:scale-[0.98] cursor-pointer ${
        isSm
          ? 'px-3 py-1.5 text-xs border border-accent-500/40 bg-accent-500/10 hover:bg-accent-500/20 text-accent-600 dark:text-accent-300'
          : 'px-4 py-2.5 text-xs sm:text-sm border border-[var(--orbit-border)] bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-850 text-stone-800 dark:text-stone-200 hover:border-accent-400'
      } ${className}`}
    >
      <Share2 size={isSm ? 13 : 15} />
      <span>{label}</span>
    </button>
  );
}

export default ShareResultModal;

