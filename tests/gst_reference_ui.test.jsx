/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassificationInput, GstRateReference } from '../src/components/gst/GstReference';
import * as reference from '../src/lib/gst/reference';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const entry = { code: '6901', kind: 'goods', description: 'Bricks' };
const row = { id: 'g-1', heading: '6901', kind: 'goods', cgst: '9%', sgst: '9%', igst: '18%', description: 'Bricks', condition: '' };
describe('GST lookup interaction', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    vi.spyOn(reference, 'loadGstReference').mockResolvedValue({ codes: [entry], rates: [row], manifest: { capturedOn: '2026-11-14' } });
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });
  it('supports keyboard selection without applying a rate', async () => {
    const select = vi.fn();
    await act(async () => root.render(<ClassificationInput label="HSN" value="6901" onChange={() => {}} onSelect={select} />));
    const input = container.querySelector('input');
    await act(async () => input.focus());
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(select).toHaveBeenCalledWith(entry);
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });
  it('requires explicit acknowledgement and application', async () => {
    const apply = vi.fn();
    await act(async () => root.render(<GstRateReference entry={entry} onApply={apply} />));
    const button = container.querySelector('button');
    expect(button.disabled).toBe(true);
    expect(apply).not.toHaveBeenCalled();
    await act(async () => container.querySelector('input[type="checkbox"]').click());
    expect(button.disabled).toBe(false);
    await act(async () => button.click());
    expect(apply).toHaveBeenCalledWith(18, row);
    expect(container.querySelector('.gst-rate-reference')).toBeNull();
    expect(container.textContent).toContain('18% selected');
    await act(async () => container.querySelector('button').click());
    expect(container.querySelector('input[type="checkbox"]').checked).toBe(false);
  });
  it('shows two best rate entries first and reveals additional choices on hover or click', async () => {
    vi.mocked(reference.loadGstReference).mockResolvedValue({ codes: [entry], rates: [
      { ...row, id: 'related', heading: '69' }, row, { ...row, id: 'exact-two' }, { ...row, id: 'exact-three' },
    ], manifest: { capturedOn: '2026-11-14' } });
    await act(async () => root.render(<GstRateReference entry={entry} onApply={vi.fn()} />));
    expect(container.querySelectorAll('.gst-rate-card')).toHaveLength(2);
    expect(container.textContent).not.toContain('Related heading —');
    const showMore = [...container.querySelectorAll('button')].find(button => button.textContent.startsWith('Show more'));
    await act(async () => showMore.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    expect(container.querySelectorAll('.gst-rate-card')).toHaveLength(4);
    expect(container.textContent).toContain('Related heading —');
  });
  it('does not apply a base rate when a related cess entry exists', async () => {
    vi.mocked(reference.loadGstReference).mockResolvedValue({ codes: [entry], rates: [row, { ...row, id: 'cess', condition: '12% cess' }], manifest: { capturedOn: '2026-11-14' } });
    await act(async () => root.render(<GstRateReference entry={entry} onApply={vi.fn()} />));
    expect(container.textContent).toContain('does not calculate cess');
    expect(container.querySelector('button')).toBeNull();
  });
});
