// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';

describe('domain utils', () => {
  const originalLocation = window.location;

  const setHostname = (hostname) => {
    delete window.location;
    window.location = new URL(`http://${hostname}`);
  };

  const loadDomain = async (hostname) => {
    setHostname(hostname);
    vi.resetModules();
    return await import('./domain.js');
  };

  afterEach(() => {
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  describe('constants', () => {
    it('defines MARKETING_DOMAIN and APP_DOMAIN correctly', async () => {
      const { MARKETING_DOMAIN, APP_DOMAIN } = await loadDomain('localhost');
      expect(MARKETING_DOMAIN).toBe('orbitboard.in');
      expect(APP_DOMAIN).toBe('app.orbitboard.in');
    });
  });

  describe('isProduction', () => {
    it('returns false for localhost', async () => {
      const { isProduction } = await loadDomain('localhost');
      expect(isProduction).toBe(false);
    });

    it('returns false for 127.0.0.1', async () => {
      const { isProduction } = await loadDomain('127.0.0.1');
      expect(isProduction).toBe(false);
    });

    it('returns false for subdomains of localhost', async () => {
      const { isProduction } = await loadDomain('app.localhost');
      expect(isProduction).toBe(false);
    });

    it('returns true for production domain orbitboard.in', async () => {
      const { isProduction } = await loadDomain('orbitboard.in');
      expect(isProduction).toBe(true);
    });

    it('returns true for production subdomain app.orbitboard.in', async () => {
      const { isProduction } = await loadDomain('app.orbitboard.in');
      expect(isProduction).toBe(true);
    });
  });

  describe('isAppSubdomain', () => {
    it('identifies app subdomain in development when hostname starts with app.', async () => {
      const { isAppSubdomain } = await loadDomain('app.localhost');
      expect(isAppSubdomain).toBe(true);
    });

    it('returns false for non-app subdomain in development', async () => {
      const { isAppSubdomain } = await loadDomain('localhost');
      expect(isAppSubdomain).toBe(false);
    });

    it('identifies app subdomain in production when hostname equals APP_DOMAIN', async () => {
      const { isAppSubdomain } = await loadDomain('app.orbitboard.in');
      expect(isAppSubdomain).toBe(true);
    });

    it('returns false for marketing domain in production', async () => {
      const { isAppSubdomain } = await loadDomain('orbitboard.in');
      expect(isAppSubdomain).toBe(false);
    });
  });

  describe('isMarketingDomain', () => {
    it('identifies marketing domain in development for localhost', async () => {
      const { isMarketingDomain } = await loadDomain('localhost');
      expect(isMarketingDomain).toBe(true);
    });

    it('identifies marketing domain in development for 127.0.0.1', async () => {
      const { isMarketingDomain } = await loadDomain('127.0.0.1');
      expect(isMarketingDomain).toBe(true);
    });

    it('returns false for app subdomain in development', async () => {
      const { isMarketingDomain } = await loadDomain('app.localhost');
      expect(isMarketingDomain).toBe(false);
    });

    it('identifies marketing domain in production for MARKETING_DOMAIN', async () => {
      const { isMarketingDomain } = await loadDomain('orbitboard.in');
      expect(isMarketingDomain).toBe(true);
    });

    it('identifies marketing domain in production for www.MARKETING_DOMAIN', async () => {
      const { isMarketingDomain } = await loadDomain('www.orbitboard.in');
      expect(isMarketingDomain).toBe(true);
    });

    it('returns false for app subdomain in production', async () => {
      const { isMarketingDomain } = await loadDomain('app.orbitboard.in');
      expect(isMarketingDomain).toBe(false);
    });
  });

  describe('getAppUrl', () => {
    describe('in development environment', () => {
      it('returns base local app url with default parameter', async () => {
        const { getAppUrl } = await loadDomain('localhost');
        expect(getAppUrl()).toBe('http://app.localhost:5173/');
      });

      it('returns base local app url with empty string parameter', async () => {
        const { getAppUrl } = await loadDomain('localhost');
        expect(getAppUrl('')).toBe('http://app.localhost:5173/');
      });

      it('formats path starting with slash', async () => {
        const { getAppUrl } = await loadDomain('localhost');
        expect(getAppUrl('/dashboard')).toBe('http://app.localhost:5173/dashboard');
      });

      it('adds leading slash if path does not start with slash', async () => {
        const { getAppUrl } = await loadDomain('localhost');
        expect(getAppUrl('settings/profile')).toBe('http://app.localhost:5173/settings/profile');
      });

      it('handles query parameters and hash fragments correctly', async () => {
        const { getAppUrl } = await loadDomain('localhost');
        expect(getAppUrl('/search?q=test#results')).toBe(
          'http://app.localhost:5173/search?q=test#results'
        );
      });
    });

    describe('in production environment', () => {
      it('returns base production app url with default parameter', async () => {
        const { getAppUrl } = await loadDomain('orbitboard.in');
        expect(getAppUrl()).toBe('https://app.orbitboard.in/');
      });

      it('returns base production app url with empty string parameter', async () => {
        const { getAppUrl } = await loadDomain('orbitboard.in');
        expect(getAppUrl('')).toBe('https://app.orbitboard.in/');
      });

      it('formats path starting with slash', async () => {
        const { getAppUrl } = await loadDomain('orbitboard.in');
        expect(getAppUrl('/dashboard')).toBe('https://app.orbitboard.in/dashboard');
      });

      it('adds leading slash if path does not start with slash', async () => {
        const { getAppUrl } = await loadDomain('orbitboard.in');
        expect(getAppUrl('settings/profile')).toBe('https://app.orbitboard.in/settings/profile');
      });

      it('handles query parameters and hash fragments correctly', async () => {
        const { getAppUrl } = await loadDomain('orbitboard.in');
        expect(getAppUrl('/login?redirect=/admin#top')).toBe(
          'https://app.orbitboard.in/login?redirect=/admin#top'
        );
      });
    });
  });

  describe('getMarketingUrl', () => {
    describe('in development environment', () => {
      it('returns base local marketing url with default parameter', async () => {
        const { getMarketingUrl } = await loadDomain('localhost');
        expect(getMarketingUrl()).toBe('http://localhost:5173/');
      });

      it('formats path starting with slash', async () => {
        const { getMarketingUrl } = await loadDomain('localhost');
        expect(getMarketingUrl('/tools')).toBe('http://localhost:5173/tools');
      });

      it('adds leading slash if path does not start with slash', async () => {
        const { getMarketingUrl } = await loadDomain('localhost');
        expect(getMarketingUrl('tools')).toBe('http://localhost:5173/tools');
      });
    });

    describe('in production environment', () => {
      it('returns base production marketing url with default parameter', async () => {
        const { getMarketingUrl } = await loadDomain('orbitboard.in');
        expect(getMarketingUrl()).toBe('https://orbitboard.in/');
      });

      it('formats path starting with slash', async () => {
        const { getMarketingUrl } = await loadDomain('orbitboard.in');
        expect(getMarketingUrl('/pricing')).toBe('https://orbitboard.in/pricing');
      });

      it('adds leading slash if path does not start with slash', async () => {
        const { getMarketingUrl } = await loadDomain('orbitboard.in');
        expect(getMarketingUrl('pricing')).toBe('https://orbitboard.in/pricing');
      });
    });
  });

  describe('redirect helpers', () => {
    it('redirectToApp sets window.location.href to app url', async () => {
      const { redirectToApp } = await loadDomain('localhost');
      redirectToApp('dashboard');
      expect(window.location.href).toBe('http://app.localhost:5173/dashboard');
    });

    it('redirectToMarketing sets window.location.href to marketing url', async () => {
      const { redirectToMarketing } = await loadDomain('localhost');
      redirectToMarketing('tools');
      expect(window.location.href).toBe('http://localhost:5173/tools');
    });
  });
});
