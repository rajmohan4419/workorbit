/**
 * src/lib/shareResults.js
 * Privacy-first viral social media share engine and canvas scorecard generator.
 * Zero external dependencies — pure HTML5 Canvas & Web APIs.
 */
import { createContext, useContext } from 'react';

// React Context for live tool share payloads
export const ToolShareContext = createContext({
  sharePayload: null,
  updateSharePayload: () => {},
  openShareModal: () => {},
  isShareModalOpen: false,
  setIsShareModalOpen: () => {},
});

export const useToolShareContext = () => useContext(ToolShareContext);

// Disallowed parameter keys to ensure zero PII leakage
const BLOCKED_PARAM_KEYS = new Set([
  'rawrows', 'rows', 'data', 'account', 'accountnumber', 'bankaccount',
  'gstin', 'pan', 'aadhaar', 'party', 'partyname', 'name', 'customer',
  'customername', 'employeename', 'employeeid', 'phone', 'mobile',
  'email', 'address', 'password', 'token', 'secret', 'jwt'
]);

/**
 * Serializes safe calculator parameters into a shareable URL.
 * Never serializes raw rows, table arrays, or personally identifiable fields.
 *
 * @param {string} slug - Tool slug
 * @param {Record<string, any>} stateParams - Key-value parameters
 * @param {string} [origin] - Optional base origin
 * @returns {string} - Clean shareable URL
 */
export function buildShareableToolUrl(slug, stateParams = {}, origin) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://orbitboard.in');
  const sp = new URLSearchParams();

  if (stateParams && typeof stateParams === 'object') {
    Object.entries(stateParams).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') return;
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (BLOCKED_PARAM_KEYS.has(normalizedKey)) return;

      // Only serialize safe primitive scalars (string, number, boolean)
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        // Exclude massive strings or serialized json
        const strVal = String(val);
        if (strVal.length <= 120 && !strVal.startsWith('{') && !strVal.startsWith('[')) {
          sp.set(key, strVal);
        }
      }
    });
  }

  const query = sp.toString();
  return `${base}/tools/${slug}${query ? `?${query}` : ''}`;
}

/**
 * Returns pre-formatted share intent URLs for major social platforms.
 *
 * @param {object} options
 * @param {string} [options.title] - Social post title
 * @param {string} [options.text] - Social post body
 * @param {string} [options.url] - Deep link URL
 * @returns {object} - Platform URLs
 */
export function getPlatformShareUrls({ title = 'OrbitBoard Result', text = '', url = 'https://orbitboard.in' }) {
  const encodedUrl = encodeURIComponent(url);
  const shareText = text || title;
  const encodedText = encodeURIComponent(shareText);
  const textWithUrl = encodeURIComponent(shareText ? `${shareText}\n\n${url}` : url);

  return {
    whatsapp: `https://api.whatsapp.com/send?text=${textWithUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };
}

/**
 * Generates an offscreen 1200x630 HTML5 Canvas and exports a PNG Blob.
 * Features a high-contrast dark theme, category aura glow, OrbitBoard branding,
 * crisp headline metric, and Bento sub-metrics pills.
 *
 * @param {object} payload
 * @param {string} payload.toolName - Name of the tool (e.g. 'Bank Reconciliation')
 * @param {string} [payload.category] - Tool category (Finance, Business, Developer, Career, Everyday)
 * @param {string} payload.headlineMetric - Primary result (e.g. '94% Match Rate', '₹1,12,500 Tax Saved')
 * @param {Array<{label: string, value: string}>} [payload.subMetrics] - Up to 3 sub-metrics pills
 * @param {string} [payload.shareUrl] - Display URL or reference
 * @returns {Promise<Blob>} - Resolves with image/png Blob
 */
export function generateResultScorecardBlob({
  toolName = 'OrbitBoard Tool',
  category = 'Finance',
  headlineMetric = 'Calculated Result',
  subMetrics = [],
  shareUrl = 'orbitboard.in'
}) {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      // Return dummy blob in non-browser testing environments
      const blob = new Blob(['PNG_SCORECARD_MOCK'], { type: 'image/png' });
      resolve(blob);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      // Graceful fallback for headless/jsdom testing environments without native 2D canvas binaries
      const fallbackBlob = new Blob(['PNG_SCORECARD_MOCK'], { type: 'image/png' });
      resolve(fallbackBlob);
      return;
    }

    // 1. Deep Space Dark Background (#0B0F19)
    ctx.fillStyle = '#0B0F19';
    ctx.fillRect(0, 0, 1200, 630);

    // 2. Radial Category Aura Glow
    const cat = (category || '').toLowerCase();
    let auraColorPrimary = 'rgba(16, 185, 129, 0.28)'; // Emerald (Finance)
    let auraColorSecondary = 'rgba(5, 150, 105, 0.12)';
    let badgeBg = '#064E3B';
    let badgeText = '#34D399';

    if (cat.includes('business')) {
      auraColorPrimary = 'rgba(59, 130, 246, 0.28)'; // Cobalt (Business)
      auraColorSecondary = 'rgba(245, 158, 11, 0.16)'; // Amber accent
      badgeBg = '#1E3A8A';
      badgeText = '#60A5FA';
    } else if (cat.includes('developer')) {
      auraColorPrimary = 'rgba(139, 92, 246, 0.28)'; // Violet (Developer)
      auraColorSecondary = 'rgba(6, 182, 212, 0.16)'; // Cyan
      badgeBg = '#4C1D95';
      badgeText = '#A78BFA';
    } else if (cat.includes('career') || cat.includes('everyday')) {
      auraColorPrimary = 'rgba(244, 63, 94, 0.24)'; // Rose
      auraColorSecondary = 'rgba(99, 102, 241, 0.14)';
      badgeBg = '#881337';
      badgeText = '#FB7185';
    }

    // Top-right aura
    const radialGlow1 = ctx.createRadialGradient(960, 140, 20, 960, 140, 480);
    radialGlow1.addColorStop(0, auraColorPrimary);
    radialGlow1.addColorStop(1, 'rgba(11, 15, 25, 0)');
    ctx.fillStyle = radialGlow1;
    ctx.fillRect(0, 0, 1200, 630);

    // Bottom-left subtle secondary aura
    const radialGlow2 = ctx.createRadialGradient(200, 500, 10, 200, 500, 360);
    radialGlow2.addColorStop(0, auraColorSecondary);
    radialGlow2.addColorStop(1, 'rgba(11, 15, 25, 0)');
    ctx.fillStyle = radialGlow2;
    ctx.fillRect(0, 0, 1200, 630);

    // Helper: Draw rounded rectangle
    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    // 3. Inner Card Container with Sleek Border
    roundRect(40, 40, 1120, 550, 24);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Header Bar: Brand Badge + Category Pill
    // Brand Logo Dot
    const logoX = 80;
    const logoY = 95;
    const logoGrad = ctx.createLinearGradient(logoX - 12, logoY - 12, logoX + 12, logoY + 12);
    logoGrad.addColorStop(0, '#38BDF8');
    logoGrad.addColorStop(1, '#818CF8');
    ctx.fillStyle = logoGrad;
    ctx.beginPath();
    ctx.arc(logoX, logoY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Inner core
    ctx.fillStyle = '#0B0F19';
    ctx.beginPath();
    ctx.arc(logoX, logoY, 5, 0, Math.PI * 2);
    ctx.fill();

    // OrbitBoard Text
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText('ORBITBOARD', logoX + 22, logoY + 7);

    // Category Badge Pill
    const categoryLabel = (category || 'TOOL').toUpperCase();
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const catMetrics = ctx.measureText(categoryLabel);
    const pillW = catMetrics.width + 24;
    const pillH = 26;
    const pillX = logoX + 22 + 155;
    const pillY = logoY - 15;

    roundRect(pillX, pillY, pillW, pillH, 13);
    ctx.fillStyle = badgeBg;
    ctx.fill();
    ctx.strokeStyle = badgeText;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = badgeText;
    ctx.fillText(categoryLabel, pillX + 12, logoY + 3);

    // Tool Name
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#E2E8F0';
    const truncatedToolName = toolName.length > 36 ? toolName.slice(0, 34) + '...' : toolName;
    ctx.fillText(truncatedToolName, 80, 168);

    // Subtle divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 195);
    ctx.lineTo(1120, 195);
    ctx.stroke();

    // 5. Headline Metric
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.letterSpacing = '1px';
    ctx.fillText('LIVE CALCULATION RESULT', 80, 235);

    // Big Headline Typography
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const cleanHeadline = String(headlineMetric || 'Verified Output');
    ctx.fillText(cleanHeadline, 80, 310);

    // 6. Bento Sub-metrics Row (up to 3 pills)
    const validPills = (subMetrics || []).filter(m => m && m.label && m.value).slice(0, 3);
    if (validPills.length > 0) {
      const bentoY = 360;
      const bentoH = 110;
      const bentoTotalW = 1040;
      const gap = 20;
      const bentoW = (bentoTotalW - (gap * (validPills.length - 1))) / validPills.length;

      validPills.forEach((metric, idx) => {
        const curX = 80 + idx * (bentoW + gap);
        roundRect(curX, bentoY, bentoW, bentoH, 16);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Submetric Label
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(String(metric.label).toUpperCase(), curX + 22, bentoY + 38);

        // Submetric Value
        ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#F8FAFC';
        const valStr = String(metric.value);
        const truncatedVal = valStr.length > 20 ? valStr.slice(0, 18) + '...' : valStr;
        ctx.fillText(truncatedVal, curX + 22, bentoY + 80);
      });
    } else {
      // Fallback Bento pill when submetrics are empty (e.g. initial tool state)
      const bentoY = 360;
      const bentoH = 110;
      roundRect(80, bentoY, 1040, bentoH, 16);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const features = ['100% Client-Side Computation', 'Zero Data Logged or Shared', 'Instant High-Precision Engine'];
      features.forEach((feat, i) => {
        const fx = 120 + i * 340;
        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(fx, bentoY + 55, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '500 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#CBD5E1';
        ctx.fillText(feat, fx + 15, bentoY + 61);
      });
    }

    // 7. Footer Bar
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 505);
    ctx.lineTo(1120, 505);
    ctx.stroke();

    // Footer Security Notice
    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Verified on orbitboard.in • 100% Client-Side & Private', 80, 545);

    // Clean URL / Domain Badge on bottom right
    const urlText = shareUrl ? shareUrl.replace(/^https?:\/\//, '') : 'orbitboard.in';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94A3B8';
    const urlMetrics = ctx.measureText(urlText);
    ctx.fillText(urlText, 1120 - urlMetrics.width, 545);

    // Convert Canvas to Blob
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob conversion returned null'));
        }
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Copies a PNG Blob directly to the user's system clipboard using ClipboardItem.
 *
 * @param {Blob} blob - Image PNG blob
 * @returns {Promise<boolean>} - Success state
 */
export async function copyScorecardImageToClipboard(blob) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('Clipboard image writing is not supported in this browser.');
  }

  const item = new ClipboardItem({ 'image/png': blob });
  await navigator.clipboard.write([item]);
  return true;
}

/**
 * Initiates direct browser file download for a generated scorecard Blob.
 *
 * @param {Blob} blob - PNG blob
 * @param {string} filename - Suggested download filename
 */
export function downloadScorecardBlob(blob, filename = 'orbitboard-scorecard.png') {
  if (typeof window === 'undefined' || !blob) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Tests if native navigator.share can share a generated scorecard file.
 *
 * @returns {boolean}
 */
export function canNativeShareScorecard() {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  if (!navigator.canShare) return true;
  try {
    const testFile = new File([''], 'test.png', { type: 'image/png' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Triggers native system share sheet with scorecard image attached.
 *
 * @param {object} options
 * @param {Blob} options.blob
 * @param {string} options.title
 * @param {string} options.text
 * @param {string} options.url
 * @returns {Promise<boolean>}
 */
export async function nativeShareScorecard({ blob, title, text, url }) {
  if (typeof navigator === 'undefined' || !navigator.share) return false;

  const file = new File([blob], `${title || 'result'}-scorecard.png`, { type: 'image/png' });
  const shareData = {
    title: title || 'OrbitBoard Result',
    text: text || 'Calculated on OrbitBoard (100% Client-Side)',
    url: url || (typeof window !== 'undefined' ? window.location.href : 'https://orbitboard.in'),
  };

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    shareData.files = [file];
  }

  await navigator.share(shareData);
  return true;
}

