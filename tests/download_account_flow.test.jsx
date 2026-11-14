/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalPreviewModal } from '../src/components/tools/PreviewModal';
import * as format from '../src/lib/toolFormat';
import { useAccountSession } from '../src/lib/monetization/useAccountSession';
import { supabase } from '../src/lib/supabase';
vi.mock('../src/lib/monetization/useAccountSession', () => ({ useAccountSession: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn() } } }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const session = { access_token: 'test-token', user: { id: 'owner', email: 'synthetic@example.test' } };

describe('signup-first document download flow', () => {
  let container, root, direct;
  const render = () => act(async () => root.render(<BrowserRouter><GlobalPreviewModal /></BrowserRouter>));
  const request = async (filename = 'report.pdf', type = 'application/pdf') => {
    await act(async () => format.downloadBlob(new Blob(['private financial contents'], { type }), filename, 'gst-invoice-generator'));
  };
  const confirm = async () => { await act(async () => [...document.body.querySelectorAll('button')].find(button => button.textContent.trim() === 'Download').click()); };
  beforeEach(() => {
    vi.mocked(useAccountSession).mockReturnValue({ session, loading: false });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ allowed: true, downloads: 1 }) }));
    URL.createObjectURL = vi.fn(() => 'blob:test'); URL.revokeObjectURL = vi.fn();
    direct = vi.spyOn(format, 'directDownloadBlob').mockReturnValue(true);
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('asks guests to sign up rather than pay, preserves the file, then meters before downloading', async () => {
    vi.mocked(useAccountSession).mockReturnValue({ session: null, loading: false });
    await render(); await request();
    expect(document.body.textContent).toContain('Sign up to download');
    expect(document.body.textContent).not.toContain('View Pricing');
    expect(document.body.querySelector('iframe')).toBeNull();
    expect(fetch).not.toHaveBeenCalled(); expect(direct).not.toHaveBeenCalled();
    vi.mocked(useAccountSession).mockReturnValue({ session, loading: false });
    await render(); await confirm();
    expect(direct).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/downloads');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(options.body)).toMatchObject({ format: 'pdf', toolSlug: 'gst-invoice-generator' });
    expect(options.body).not.toContain('private financial contents');
    expect(options.body).not.toContain('report.pdf');
  });
  it('retains the file after server failure and retries with the same request ID', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: 'metering_unavailable' }) });
    await render(); await request(); await confirm();
    expect(direct).not.toHaveBeenCalled(); expect(document.body.querySelector('[role="alert"]')).not.toBeNull();
    await confirm();
    expect(direct).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body).requestId).toBe(JSON.parse(fetch.mock.calls[1][1].body).requestId);
  });
  it('queues multiple generated files and counts each separately', async () => {
    await render(); await request(); await request('report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(document.body.textContent).toContain('2 files queued');
    await confirm(); await confirm();
    expect(direct).toHaveBeenCalledTimes(2);
    const bodies = fetch.mock.calls.map(([, options]) => JSON.parse(options.body));
    expect(bodies.map(body => body.format)).toEqual(['pdf', 'xlsx']);
    expect(bodies[0].requestId).not.toBe(bodies[1].requestId);
  });
  it('coalesces repeated confirmation clicks while metering is pending', async () => {
    let resolve;
    fetch.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    await render(); await request();
    const button = [...document.body.querySelectorAll('button')].find(element => element.textContent.trim() === 'Download');
    await act(async () => { button.click(); button.click(); });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(direct).not.toHaveBeenCalled();
    await act(async () => resolve({ ok: true, json: async () => ({ allowed: true, downloads: 1 }) }));
    expect(direct).toHaveBeenCalledTimes(1);
  });
  it('does not meter cancellation, and leaves non-document downloads anonymous', async () => {
    await render(); await request();
    await act(async () => [...document.body.querySelectorAll('button')].find(button => button.textContent === 'Cancel').click());
    expect(fetch).not.toHaveBeenCalled();
    vi.mocked(useAccountSession).mockReturnValue({ session: null, loading: false });
    await render(); await request('image.png', 'image/png'); await confirm();
    expect(fetch).not.toHaveBeenCalled(); expect(direct).toHaveBeenCalledTimes(1);
  });
  it('does not fall through to anonymous PDF downloads when no coordinator is mounted', () => {
    expect(format.downloadBlob(new Blob(['x'], { type: 'application/pdf' }), 'file.pdf', null, true)).toBe(false);
    expect(direct).not.toHaveBeenCalled();
  });
  it('renders both preview and account dialogs inside the active fullscreen workspace', async () => {
    const fullscreen = document.createElement('section'); document.body.append(fullscreen);
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: fullscreen });
    try {
      await render(); await request();
      expect(fullscreen.querySelector('[role="dialog"]')).not.toBeNull();
      vi.mocked(useAccountSession).mockReturnValue({ session: null, loading: false });
      await render();
      expect(fullscreen.textContent).toContain('Sign up to download');
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
      await act(async () => document.dispatchEvent(new Event('fullscreenchange')));
      expect(fullscreen.querySelector('[role="dialog"]')).toBeNull();
      expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    } finally { delete document.fullscreenElement; fullscreen.remove(); }
  });
});
