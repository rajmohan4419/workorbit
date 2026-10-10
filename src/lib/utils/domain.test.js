import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MARKETING_DOMAIN,
  APP_DOMAIN,
  checkIsProduction,
  checkIsAppSubdomain,
  checkIsMarketingDomain,
  isProduction,
  isAppSubdomain,
  isMarketingDomain,
  getAppUrl,
  getMarketingUrl,
  redirectToApp,
  redirectToMarketing,
} from './domain.js';

describe('domain utilities', () => {
  describe('constants', () => {
    it('exports expected domain constants', () => {
      assert.equal(MARKETING_DOMAIN, 'orbitboard.in');
      assert.equal(APP_DOMAIN, 'app.orbitboard.in');
    });
  });

  describe('checkIsProduction', () => {
    it('returns true for production hostnames', () => {
      assert.equal(checkIsProduction('orbitboard.in'), true);
      assert.equal(checkIsProduction('app.orbitboard.in'), true);
      assert.equal(checkIsProduction('www.orbitboard.in'), true);
      assert.equal(checkIsProduction('example.com'), true);
    });

    it('returns false for localhost and 127.0.0.1 hostnames', () => {
      assert.equal(checkIsProduction('localhost'), false);
      assert.equal(checkIsProduction('app.localhost'), false);
      assert.equal(checkIsProduction('127.0.0.1'), false);
      assert.equal(checkIsProduction('app.127.0.0.1'), false);
    });

    it('returns false for empty or missing hostnames', () => {
      assert.equal(checkIsProduction(''), false);
      assert.equal(checkIsProduction(undefined), false);
      assert.equal(checkIsProduction(null), false);
    });
  });

  describe('checkIsAppSubdomain', () => {
    it('identifies app subdomain in production mode', () => {
      assert.equal(checkIsAppSubdomain('app.orbitboard.in'), true);
      assert.equal(checkIsAppSubdomain('orbitboard.in'), false);
      assert.equal(checkIsAppSubdomain('www.orbitboard.in'), false);
    });

    it('identifies app subdomain in development mode', () => {
      assert.equal(checkIsAppSubdomain('app.localhost'), true);
      assert.equal(checkIsAppSubdomain('app.127.0.0.1'), true);
      assert.equal(checkIsAppSubdomain('localhost'), false);
      assert.equal(checkIsAppSubdomain('127.0.0.1'), false);
    });
  });

  describe('checkIsMarketingDomain', () => {
    it('identifies marketing domain in production mode', () => {
      assert.equal(checkIsMarketingDomain('orbitboard.in'), true);
      assert.equal(checkIsMarketingDomain('www.orbitboard.in'), true);
      assert.equal(checkIsMarketingDomain('app.orbitboard.in'), false);
      assert.equal(checkIsMarketingDomain('otherdomain.com'), false);
    });

    it('identifies marketing domain in development mode', () => {
      assert.equal(checkIsMarketingDomain('localhost'), true);
      assert.equal(checkIsMarketingDomain('127.0.0.1'), true);
      assert.equal(checkIsMarketingDomain('app.localhost'), false);
      assert.equal(checkIsMarketingDomain('app.127.0.0.1'), false);
    });
  });

  describe('module-level environment exports in Node environment', () => {
    it('defaults environment flags safely when window is undefined', () => {
      assert.equal(isProduction, false);
      assert.equal(isAppSubdomain, false);
      assert.equal(isMarketingDomain, false);
    });
  });

  describe('getAppUrl', () => {
    it('formats development app URLs correctly', () => {
      assert.equal(getAppUrl('', { isProd: false }), 'http://app.localhost:5173/');
      assert.equal(getAppUrl('dashboard', { isProd: false }), 'http://app.localhost:5173/dashboard');
      assert.equal(getAppUrl('/dashboard', { isProd: false }), 'http://app.localhost:5173/dashboard');
      assert.equal(getAppUrl('settings/profile?tab=security#2fa', { isProd: false }), 'http://app.localhost:5173/settings/profile?tab=security#2fa');
    });

    it('formats production app URLs correctly', () => {
      assert.equal(getAppUrl('', { isProd: true }), 'https://app.orbitboard.in/');
      assert.equal(getAppUrl('dashboard', { isProd: true }), 'https://app.orbitboard.in/dashboard');
      assert.equal(getAppUrl('/dashboard', { isProd: true }), 'https://app.orbitboard.in/dashboard');
      assert.equal(getAppUrl('settings/profile?tab=security#2fa', { isProd: true }), 'https://app.orbitboard.in/settings/profile?tab=security#2fa');
    });
  });

  describe('getMarketingUrl', () => {
    it('formats development marketing URLs correctly', () => {
      assert.equal(getMarketingUrl('', { isProd: false }), 'http://localhost:5173/');
      assert.equal(getMarketingUrl('pricing', { isProd: false }), 'http://localhost:5173/pricing');
      assert.equal(getMarketingUrl('/pricing', { isProd: false }), 'http://localhost:5173/pricing');
      assert.equal(getMarketingUrl('about?ref=footer#team', { isProd: false }), 'http://localhost:5173/about?ref=footer#team');
    });

    it('formats production marketing URLs correctly', () => {
      assert.equal(getMarketingUrl('', { isProd: true }), 'https://orbitboard.in/');
      assert.equal(getMarketingUrl('pricing', { isProd: true }), 'https://orbitboard.in/pricing');
      assert.equal(getMarketingUrl('/pricing', { isProd: true }), 'https://orbitboard.in/pricing');
      assert.equal(getMarketingUrl('about?ref=footer#team', { isProd: true }), 'https://orbitboard.in/about?ref=footer#team');
    });
  });

  describe('redirectToApp and redirectToMarketing', () => {
    it('updates window.location.href in redirectToApp', () => {
      const mockWindow = { location: { href: '' } };
      const url = redirectToApp('dashboard', mockWindow);

      assert.equal(typeof url, 'string');
      assert.equal(mockWindow.location.href, url);
    });

    it('updates window.location.href in redirectToMarketing', () => {
      const mockWindow = { location: { href: '' } };
      const url = redirectToMarketing('pricing', mockWindow);

      assert.equal(typeof url, 'string');
      assert.equal(mockWindow.location.href, url);
    });

    it('handles null or missing targetWindow safely', () => {
      assert.doesNotThrow(() => {
        redirectToApp('dashboard', null);
        redirectToMarketing('pricing', null);
      });
    });
  });
});
