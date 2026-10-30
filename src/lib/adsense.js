/**
 * AdSense is loaded only on pages that meet the publisher policy:
 * a live tool with a working tool, a guide, and enough written content to stand alone.
 * Coming-soon pages, missing-tool pages, redirects and loading shells never load ads.
 */
export const ADSENSE_CLIENT = 'ca-pub-9160921653901381';

const MIN_INTRO_CHARS = 60;
const MIN_HOW_STEPS = 3;
const MIN_FAQ_ITEMS = 3;

export function isAdEligible({ tool, info, hasTool }) {
  if (!tool || tool.status !== 'live' || !hasTool) return false;
  if (!info) return false;
  if (typeof info.intro !== 'string' || info.intro.trim().length < MIN_INTRO_CHARS) return false;
  if (!Array.isArray(info.how) || info.how.length < MIN_HOW_STEPS) return false;
  if (!Array.isArray(info.faq) || info.faq.length < MIN_FAQ_ITEMS) return false;
  return true;
}

let loaded = false;

export function loadAdSense() {
  if (loaded || typeof document === 'undefined') return;
  if (document.querySelector('script[data-orbitboard-adsense]')) {
    loaded = true;
    return;
  }
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.dataset.orbitboardAdsense = 'true';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(script);
  loaded = true;
}
