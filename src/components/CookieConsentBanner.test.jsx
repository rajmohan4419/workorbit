/**
 * @vitest-environment jsdom
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CookieConsentBanner } from './CookieConsentBanner';
import { COOKIE_CONSENT_KEY, openCookiePreferences } from '../lib/cookieConsent';

describe('CookieConsentBanner component', () => {
  let container;
  let root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it('renders banner on first-time load when no consent has been given', async () => {
    await act(async () => {
      root.render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
    });

    // Advance timer for delayed mount animation
    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(container.textContent).toContain('Cookie & Privacy Notice');
    expect(container.textContent).toContain('Accept All');
    expect(container.textContent).toContain('Essential Only');
  });

  it('does not render banner if user previously accepted', async () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'granted');

    await act(async () => {
      root.render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(container.textContent).not.toContain('Cookie & Privacy Notice');
  });

  it('saves granted and hides banner when clicking Accept All', async () => {
    await act(async () => {
      root.render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    const acceptBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Accept All'
    );
    expect(acceptBtn).toBeTruthy();

    await act(async () => {
      acceptBtn.click();
    });

    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('granted');
    expect(container.textContent).not.toContain('Cookie & Privacy Notice');
  });

  it('saves essential and hides banner when clicking Essential Only', async () => {
    await act(async () => {
      root.render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    const essentialBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Essential Only'
    );
    expect(essentialBtn).toBeTruthy();

    await act(async () => {
      essentialBtn.click();
    });

    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('essential');
    expect(container.textContent).not.toContain('Cookie & Privacy Notice');
  });

  it('reopens when openCookiePreferences is called', async () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'granted');

    await act(async () => {
      root.render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(container.textContent).not.toContain('Cookie & Privacy Notice');

    await act(async () => {
      openCookiePreferences();
    });

    expect(container.textContent).toContain('Cookie & Privacy Notice');
  });
});
