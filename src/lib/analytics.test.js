/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  trackEvent,
  trackToolUsed,
  trackInvoiceCreated,
  trackExportClicked,
  trackPaywallViewed,
  trackCheckoutStarted,
  trackSubscriptionActive,
} from './analytics';
import * as cookieConsent from './cookieConsent';

describe('Funnel Analytics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.gtag = vi.fn();
  });

  it('drops events when cookie consent is not granted', () => {
    vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue(null);
    const result = trackEvent('tool_used', { slug: 'gst-invoice' });
    expect(result).toBe(false);
    expect(window.gtag).not.toHaveBeenCalled();

    vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue('essential');
    const result2 = trackToolUsed('gst-invoice');
    expect(result2).toBe(false);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('dispatches tool_used when consent is granted', () => {
    vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue('granted');
    const result = trackToolUsed('bank-reconciliation');
    expect(result).toBe(true);
    expect(window.gtag).toHaveBeenCalledWith('event', 'tool_used', { slug: 'bank-reconciliation' });
  });

  it('dispatches invoice_created when consent is granted', () => {
    vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue('granted');
    trackInvoiceCreated('INV-001');
    expect(window.gtag).toHaveBeenCalledWith('event', 'invoice_created', { id: 'INV-001' });

    trackInvoiceCreated();
    expect(window.gtag).toHaveBeenCalledWith('event', 'invoice_created', {});
  });

  it('dispatches export_clicked when consent is granted', () => {
    vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue('granted');
    trackExportClicked('pdf');
    expect(window.gtag).toHaveBeenCalledWith('event', 'export_clicked', { format: 'pdf' });
  });

  it('dispatches paywall_viewed when consent is granted', () => {
    vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue('granted');
    trackPaywallViewed('advanced_exports');
    expect(window.gtag).toHaveBeenCalledWith('event', 'paywall_viewed', { feature: 'advanced_exports' });
  });

  it('dispatches checkout_started when consent is granted', () => {
    vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue('granted');
    trackCheckoutStarted('pro_monthly');
    expect(window.gtag).toHaveBeenCalledWith('event', 'checkout_started', { plan: 'pro_monthly' });
  });

  it('dispatches subscription_active when consent is granted', () => {
    vi.spyOn(cookieConsent, 'getConsentStatus').mockReturnValue('granted');
    trackSubscriptionActive('pro_annual');
    expect(window.gtag).toHaveBeenCalledWith('event', 'subscription_active', { plan: 'pro_annual' });
  });
});
