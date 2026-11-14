// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { trackEvent } from '../lib/analytics';
import { MomentExperience, SharedMoment } from './Moments';

vi.mock('../lib/analytics', () => ({ trackEvent: vi.fn() }));

it('creates an opaque link and reveals its saved translation in a fresh recipient session', async () => {
  const id = '6eb4d6cc-7758-4c62-83be-f7c947112c52';
  let savedGreeting;
  const fetchMock = vi.fn(async (url, options) => {
    const { action, ...data } = JSON.parse(options.body);
    if (url === '/api/translate') return Response.json({ translatedText: 'ಶುಭಾಶಯಗಳು!' });
    if (action === 'create') {
      savedGreeting = data;
      return Response.json({ id }, { status: 201 });
    }
    if (action === 'read' && data.id === id) return Response.json(savedGreeting);
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  document.body.append(container);
  let root = createRoot(container);
  const button = text => Array.from(container.querySelectorAll('button')).find(item => item.textContent.includes(text));
  const type = (placeholder, value) => {
    const input = container.querySelector(`[placeholder="${placeholder}"]`);
    const { set } = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value');
    set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  try {
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/moments/birthday']}>
        <Routes><Route path="/moments/:slug" element={<MomentExperience />} /></Routes>
      </MemoryRouter>);
    });
    await act(async () => {
      type('Sender name', 'Asha');
      type('Recipient name', 'Sam');
      type('Add your wishes (optional)', 'Have a lovely day!');
      const select = container.querySelector('select');
      select.value = 'kn';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => button('Translate wishes').click());
    await act(async () => button('Make a wish').click());
    await act(async () => button('Create share link').click());
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith('moments_share_created', { template: 'birthday', language: 'kn' });
    const link = new URL(container.querySelector('input[readonly]').value);
    expect(link.pathname + link.search + link.hash).toBe(`/moments/shared#${id}`);
    expect(savedGreeting).toEqual({
      slug: 'birthday', sender: 'Asha', recipient: 'Sam', text: 'ಶುಭಾಶಯಗಳು!', language: 'kn',
    });

    await act(async () => type('Recipient name', 'Someone else'));
    expect(container.querySelector('input[readonly]')).toBeNull();

    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => {
      root.render(<MemoryRouter initialEntries={[link.pathname + link.hash]}><SharedMoment /></MemoryRouter>);
    });
    expect(container.textContent).toContain('Dear Sam,');
    expect(container.textContent).toContain('From Asha');
    expect(container.querySelector('[lang="kn"]').textContent).toBe('ಶುಭಾಶಯಗಳು!');
    expect(container.querySelector('a[href="/moments"]').textContent).toContain('Create Your Own Moment');
    expect(container.textContent).toContain('Made with OrbitBoard Moments');
    expect(container.querySelector('canvas')).toBeNull();
    await act(async () => button('Replay').click());
    expect(container.querySelector('[lang="kn"]').textContent).toBe('ಶುಭಾಶಯಗಳು!');
    expect(fetchMock.mock.calls.filter(([, options]) => JSON.parse(options.body).action === 'read')).toHaveLength(1);
    expect(container.querySelector('input, textarea, select')).toBeNull();
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/translate')).toHaveLength(1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
