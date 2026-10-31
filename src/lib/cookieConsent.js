export const COOKIE_CONSENT_KEY = 'orbitboard:cookie-consent';
export const COOKIE_CONSENT_EVENT = 'orbitboard:cookie-consent-changed';
export const OPEN_COOKIE_MODAL_EVENT = 'orbitboard:open-cookie-modal';

export function getConsentStatus() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const val = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (val === 'granted' || val === 'essential') return val;
    return null;
  } catch {
    return null;
  }
}

export function initGoogleConsentMode() {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  const current = getConsentStatus();
  const isGranted = current === 'granted';

  // Google Consent Mode v2 parameters
  window.gtag('consent', 'default', {
    ad_storage: isGranted ? 'granted' : 'denied',
    analytics_storage: isGranted ? 'granted' : 'denied',
    ad_user_data: isGranted ? 'granted' : 'denied',
    ad_personalization: isGranted ? 'granted' : 'denied',
    functionality_storage: 'granted',
    personalization_storage: isGranted ? 'granted' : 'denied',
    security_storage: 'granted',
  });
}

export function setConsentStatus(status) {
  if (typeof window === 'undefined') return;

  const validStatus = status === 'granted' ? 'granted' : 'essential';
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, validStatus);
  } catch (err) {
    console.warn('[OrbitBoard] Unable to persist cookie consent to localStorage', err);
  }

  if (window.gtag) {
    const isGranted = validStatus === 'granted';
    window.gtag('consent', 'update', {
      ad_storage: isGranted ? 'granted' : 'denied',
      analytics_storage: isGranted ? 'granted' : 'denied',
      ad_user_data: isGranted ? 'granted' : 'denied',
      ad_personalization: isGranted ? 'granted' : 'denied',
      personalization_storage: isGranted ? 'granted' : 'denied',
    });
  }

  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_EVENT, { detail: { status: validStatus } })
  );
}

export function openCookiePreferences() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_MODAL_EVENT));
}

