import { getConsentStatus } from './cookieConsent';

const MEASUREMENT_ID = 'G-SLWFZLY8SC';

let loadPromise;

export function loadGoogleAnalytics() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);

    if (typeof document === 'undefined') {
      resolve();
      return;
    }

    const existing = document.querySelector('script[data-orbitboard-ga]');
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    script.dataset.orbitboardGa = 'true';
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Dispatches custom analytics event to Google Analytics via gtag
 * strictly when cookie consent has been granted.
 */
export function trackEvent(name, params = {}) {
  if (getConsentStatus() !== 'granted') return false;
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params);
    return true;
  }
  return false;
}

export function trackToolUsed(slug) {
  return trackEvent('tool_used', { slug });
}

export function trackInvoiceCreated(id) {
  return trackEvent('invoice_created', id ? { id } : {});
}

export function trackExportClicked(format) {
  return trackEvent('export_clicked', { format });
}

export function trackPaywallViewed(feature) {
  return trackEvent('paywall_viewed', { feature });
}

export function trackCheckoutStarted(plan) {
  return trackEvent('checkout_started', { plan });
}

export function trackSubscriptionActive(plan) {
  return trackEvent('subscription_active', { plan });
}
