// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskFeedback } from './TaskFeedback';
import { createFeedbackTask } from '../../lib/feedback/taskFeedback';
import { useExportFeedback } from '../../lib/feedback/useTaskFeedback';
const { burst, create, reset } = vi.hoisted(() => ({ burst: vi.fn(), create: vi.fn(), reset: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: { create } }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('shared feedback UI and export boundary', () => {
  let container, root, media, controllers;
  beforeEach(() => {
    controllers = []; localStorage.clear();
    media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    window.matchMedia = vi.fn(() => media);
    burst.reset = reset; create.mockReturnValue(burst); burst.mockClear(); create.mockClear(); reset.mockClear();
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => { controllers.forEach(controller => controller.dispose()); root.unmount(); }); container.remove(); vi.restoreAllMocks(); });
  const task = () => { const controller = createFeedbackTask('spreadsheet'); controllers.push(controller); return controller; };
  const render = async children => act(async () => root.render(<StrictMode>{children}<TaskFeedback /></StrictMode>));
  it('announces stages and celebrates once across rerenders', async () => {
    await render(null); const controller = task(); let action;
    await act(async () => { action = controller.begin({ stage: 'Reading workbook' }); });
    expect(document.querySelector('[role="status"]').textContent).toContain('Reading workbook');
    expect(document.querySelector('progress')).toBeNull();
    await act(async () => action.success('Your spreadsheet is ready.'));
    await render(null);
    expect(burst).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="status"]').textContent).toBe('Your spreadsheet is ready.');
    expect(document.querySelector('button[aria-pressed]').getAttribute('aria-pressed')).toBe('false');
  });
  it('suppresses confetti with reduced motion and uses static status', async () => {
    media.matches = true; await render(null); const controller = task();
    await act(async () => controller.begin().success('Your PDF is ready.'));
    expect(create).not.toHaveBeenCalled();
    expect(document.querySelector('[data-reduced-motion]').dataset.reducedMotion).toBe('true');
    expect(document.querySelector('[role="status"]').textContent).toBe('Your PDF is ready.');
  });
  it('moves into the active dialog and fullscreen without moving focus', async () => {
    await render(null);
    const workspace = document.createElement('section'); document.body.append(workspace);
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: workspace });
    await act(async () => document.dispatchEvent(new Event('fullscreenchange')));
    expect(workspace.querySelector('.orbit-feedback-dock')).not.toBeNull();
    const dialog = document.createElement('div'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
    const button = document.createElement('button'); dialog.append(button);
    await act(async () => { workspace.append(dialog); button.focus(); });
    expect(dialog.querySelector('.orbit-feedback-dock')).not.toBeNull(); expect(document.activeElement).toBe(button);
    await act(async () => { dialog.remove(); delete document.fullscreenElement; document.dispatchEvent(new Event('fullscreenchange')); });
    workspace.remove();
  });
  it('starts before generator work, blocks duplicate clicks and permits an error retry', async () => {
    let finish, fail = true;
    const generate = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    function Export() {
      const feedback = useExportFeedback('spreadsheet');
      return <button disabled={feedback.busy} onClick={() => feedback.run(async () => { await generate(); if (fail) throw Error('failed'); }, 'xlsx')}>Export workbook</button>;
    }
    await render(<Export />);
    const button = container.querySelector('button');
    await act(async () => { button.click(); button.click(); });
    expect(button.disabled).toBe(true);
    expect(document.querySelector('[role="status"]').textContent).toContain('Preparing your spreadsheet');
    await act(async () => new Promise(resolve => setTimeout(resolve, 10)));
    expect(generate).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(document.querySelector('[data-state="error"]')).not.toBeNull(); expect(button.disabled).toBe(false);
    fail = false;
    await act(async () => { button.click(); await new Promise(resolve => setTimeout(resolve, 10)); });
    await act(async () => finish());
    expect(document.querySelector('[role="status"]').textContent).toBe('Your spreadsheet is ready.');
  });
});
