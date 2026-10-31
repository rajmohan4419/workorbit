/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getConsentStatus,
  setConsentStatus,
  initGoogleConsentMode,
  openCookiePreferences,
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_EVENT,
  OPEN_COOKIE_MODAL_EVENT,
} from './cookieConsent';

describe('cookieConsent utility', () => {
  beforeEach(() => {
    localStorage.clear();
    window.dataLayer = [];
    window.gtag = vi.fn();
  });

  it('returns null when no consent has been given', () => {
    expect(getConsentStatus()).toBeNull();
  });

  it('returns granted or essential when stored in localStorage', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'granted');
    expect(getConsentStatus()).toBe('granted');

    localStorage.setItem(COOKIE_CONSENT_KEY, 'essential');
    expect(getConsentStatus()).toBe('essential');

    localStorage.setItem(COOKIE_CONSENT_KEY, 'invalid');
    expect(getConsentStatus()).toBeNull();
  });

  it('initializes Google Consent Mode defaults with denied when no consent is set', () => {
    initGoogleConsentMode();
    expect(window.gtag).toHaveBeenCalledWith(
      'consent',
      'default',
      expect.objectContaining({
        ad_storage: 'denied',
        analytics_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      })
    );
  });

  it('initializes Google Consent Mode defaults with granted when previously accepted', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'granted');
    initGoogleConsentMode();
    expect(window.gtag).toHaveBeenCalledWith(
      'consent',
      'default',
      expect.objectContaining({
        ad_storage: 'granted',
        analytics_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      })
    );
  });

  it('updates consent to granted and dispatches event', () => {
    const listener = vi.fn();
    window.addEventListener(COOKIE_CONSENT_EVENT, listener);

    setConsentStatus('granted');

    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('granted');
    expect(window.gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        ad_storage: 'granted',
        analytics_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      })
    );
    expect(listener).toHaveBeenCalled();
    window.removeEventListener(COOKIE_CONSENT_EVENT, listener);
  });

  it('updates consent to essential only and dispatches event', () => {
    setConsentStatus('essential');

    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('essential');
    expect(window.gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        ad_storage: 'denied',
        analytics_storage: 'denied',
      })
    );
  });

  it('dispatches open cookie modal event', () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_COOKIE_MODAL_EVENT, listener);

    openCookiePreferences();

    expect(listener).toHaveBeenCalled();
    window.removeEventListener(OPEN_COOKIE_MODAL_EVENT, listener);
  });
});
