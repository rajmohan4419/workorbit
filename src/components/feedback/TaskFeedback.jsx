import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { getFeedbackSnapshot, messages, subscribeFeedback } from '../../lib/feedback/taskFeedback';
import { disposeSound, getSoundPreference, playTone, readSoundPreference, setSoundPreference, stopSound, subscribeSound, unlockSound } from '../../lib/feedback/sound';
import './taskFeedback.css';

export function TaskFeedback() {
  const { tasks } = useSyncExternalStore(subscribeFeedback, getFeedbackSnapshot, getFeedbackSnapshot);
  const task = tasks.filter(item => item.state === 'processing').at(-1) || tasks.at(-1);
  const enabled = useSyncExternalStore(subscribeSound, getSoundPreference, getSoundPreference);
  const [target, setTarget] = useState(null);
  const [reduced, setReduced] = useState(() => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  const [rotation, setRotation] = useState({ id: null, index: 0 });
  const [dismissed, setDismissed] = useState(null);
  const canvas = useRef(null);
  const celebrated = useRef(new Set());
  const started = useRef(new Set());

  useEffect(() => {
    setSoundPreference(readSoundPreference(), false);
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(Boolean(media?.matches));
    media?.addEventListener?.('change', change);
    const interact = () => unlockSound();
    window.addEventListener('pointerdown', interact, { passive: true });
    window.addEventListener('keydown', interact);
    const storage = event => { if (event.key === 'orbitboard:feedback-sound') setSoundPreference(event.newValue === 'on', false); };
    window.addEventListener('storage', storage);
    const relocate = () => {
      const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')];
      setTarget(dialogs.at(-1) || document.fullscreenElement || document.body);
    };
    relocate();
    const observer = new MutationObserver(relocate);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('fullscreenchange', relocate);
    return () => {
      media?.removeEventListener?.('change', change);
      window.removeEventListener('pointerdown', interact);
      window.removeEventListener('keydown', interact);
      window.removeEventListener('storage', storage);
      observer.disconnect(); document.removeEventListener('fullscreenchange', relocate); disposeSound();
    };
  }, []);

  useEffect(() => {
    if (task?.state !== 'processing') return;
    if (!started.current.has(task.id)) { started.current.add(task.id); playTone(); }
    if (task.context === 'payment' || task.context === 'auth' || reduced) return;
    const timer = setInterval(() => setRotation(value => ({ id: task.id, index: value.id === task.id ? value.index + 1 : 1 })), 4200);
    return () => clearInterval(timer);
  }, [task?.id, task?.state, task?.context, reduced]);

  useEffect(() => {
    if (!task || task.state === 'processing') return;
    stopSound();
    if (task.state === 'success' && task.celebrate && !celebrated.current.has(task.id)) {
      celebrated.current.add(task.id); playTone(true);
    }
    const timer = setTimeout(() => setDismissed(task.id), 7000);
    return () => clearTimeout(timer);
  }, [task]);

  // This effect may rerun when a dialog closes or fullscreen changes. The ID guard
  // prevents a second celebration; cleanup cancels a pending dynamic import too.
  const confettiIds = useRef(new Set());
  useEffect(() => {
    if (!target || !task || task.state !== 'success' || !task.celebrate || reduced || confettiIds.current.has(task.id)) return;
    let live = true;
    let burst;
    import('canvas-confetti').then(({ default: confetti }) => {
      if (!live || !canvas.current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      confettiIds.current.add(task.id);
      burst = confetti.create(canvas.current, { resize: false, useWorker: false, disableForReducedMotion: true });
      void burst({ particleCount: 24, spread: 46, startVelocity: 15, gravity: 1.2, ticks: 55, scalar: .65, origin: { x: .5, y: .75 }, colors: ['#7c3aed', '#a78bfa', '#ddd6fe'] });
    }).catch(() => {});
    return () => { live = false; burst?.reset(); };
  }, [task, target, reduced]);

  const active = task && dismissed !== task.id;
  const lighthearted = task && !['payment', 'auth'].includes(task.context);
  const lines = messages[task?.context] || messages.document;
  const messageRotation = rotation.id === task?.id ? rotation.index : 0;
  const detail = task?.state === 'processing'
    ? lighthearted ? (messageRotation ? messages.processing[(messageRotation - 1) % messages.processing.length] : lines[task.messageIndex % lines.length]) : task.stage
    : task?.state === 'success' && lighthearted ? messages.success[task.id % (task.context === 'spreadsheet' ? 3 : 2)] : '';
  return target ? createPortal(
    <div className="orbit-feedback-dock" data-reduced-motion={reduced}>
      <button type="button" className="orbit-feedback-sound" aria-pressed={enabled} onClick={() => { setSoundPreference(!enabled); unlockSound(); }}>
        <span aria-hidden="true">{enabled ? '♪' : '♩'}</span> Sound {enabled ? 'on' : 'off'}
      </button>
      <div className={`orbit-feedback-card ${active ? 'is-visible' : ''}`} data-state={task?.state || 'idle'}>
        <canvas ref={canvas} width="360" height="160" className="orbit-feedback-confetti" aria-hidden="true" />
        <span className="orbit-feedback-icon" aria-hidden="true">
          {task?.state === 'success' && task.celebrate ? <svg viewBox="0 0 24 24"><path className="orbit-feedback-check" d="m6 12 4 4 8-8" /></svg> : task?.state === 'processing' ? <span className="orbit-feedback-spinner" /> : task?.state === 'error' ? '!' : task?.state === 'success' ? 'i' : '−'}
        </span>
        <div className="orbit-feedback-copy">
          <p role="status" aria-live="polite" aria-atomic="true" className="orbit-feedback-label">{active ? `${task.label}${task.state === 'processing' && task.stage ? ` · ${task.stage}` : ''}${task.halfway && task.state === 'processing' ? ' · Halfway there.' : ''}` : ''}</p>
          <p className="orbit-feedback-detail" aria-hidden="true">{active ? detail : ''}</p>
          {active && task.state === 'processing' && task.progress !== null && <progress max="100" value={task.progress} aria-label="Task progress" />}
        </div>
      </div>
    </div>, target
  ) : null;
}
