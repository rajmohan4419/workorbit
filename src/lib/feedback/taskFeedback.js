// Presentation only. This module never authorizes downloads or grants entitlements.
let sequence = 0;
const listeners = new Set();
const tasks = new Map();
let snapshot = { tasks: [] };
const publish = () => {
  snapshot = { tasks: [...tasks.values()] };
  listeners.forEach(listener => listener());
};
export const subscribeFeedback = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const getFeedbackSnapshot = () => snapshot;

export const messages = {
  spreadsheet: ['Putting the spreadsheet gremlins to work.', 'Your numbers have entered the workshop.', 'Turning clicks into less paperwork.'],
  document: ['Turning clicks into less paperwork.', 'Your document has entered the workshop.'],
  processing: ['The numbers are lining up nicely.', 'Checking the details. Excel would be jealous.', 'A little less paperwork, a little more coffee.'],
  success: ['Ready! One less thing on your list.', 'Paperwork handled. Main-character energy restored.', 'Done. Your spreadsheet can take a tea break.'],
};

export function createFeedbackTask(context = 'document') {
  let current = { state: 'idle', context };
  const ownListeners = new Set();
  const commit = next => {
    current = next;
    tasks.set(next.id, next);
    // Bound terminal history; active tasks are never discarded.
    const terminal = [...tasks.values()].filter(task => task.state !== 'processing');
    terminal.slice(0, Math.max(0, terminal.length - 8)).forEach(task => tasks.delete(task.id));
    ownListeners.forEach(listener => listener());
    publish();
  };
  return {
    getSnapshot: () => current,
    subscribe: listener => { ownListeners.add(listener); return () => ownListeners.delete(listener); },
    begin({ label = 'Preparing your file', stage = 'Generating locally', progress = null } = {}) {
      if (current.state === 'processing') return null;
      const id = ++sequence;
      commit({ id, context, label, stage, progress: null, state: 'processing', messageIndex: id % (messages[context]?.length || 1) });
      const active = () => current.id === id && current.state === 'processing';
      const update = changes => { if (active()) commit({ ...current, ...changes }); };
      const handle = {
        active,
        stage: stage => update({ stage }),
        progress: (completed, total, stage) => {
          if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0 || completed < 0 || completed > total) return;
          const progress = Math.round(completed / total * 100);
          // Halfway wording exists only while a real measurement is near 50%.
          const halfway = progress >= 45 && progress <= 55;
          update({ progress, stage: stage || current.stage, halfway });
        },
        success: (label, { celebrate = true } = {}) => update({ state: 'success', label, stage: '', celebrate }),
        error: (label = 'Could not complete this action. Please try again.') => update({ state: 'error', label, stage: '', celebrate: false }),
        cancel: (label = 'Cancelled. Your inputs are still here.') => update({ state: 'cancelled', label, stage: '', celebrate: false }),
      };
      if (progress) handle.progress(progress.completed, progress.total);
      return handle;
    },
    dispose() {
      if (current.state === 'processing') {
        commit({ ...current, state: 'cancelled', label: 'Action stopped. Your inputs are unchanged.', stage: '', celebrate: false });
      }
      ownListeners.clear();
    },
  };
}

export function fileReadyLabel(format) {
  return format === 'pdf' ? 'Your PDF is ready.' : format === 'xlsx' ? 'Your spreadsheet is ready.' : 'Your file is ready.';
}
