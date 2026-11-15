import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createFeedbackTask, fileReadyLabel } from './taskFeedback';
import { unlockSound } from './sound';

export function useTaskFeedback(context = 'document') {
  const controller = useMemo(() => createFeedbackTask(context), [context]);
  const status = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => () => controller.dispose(), [controller]);
  return { ...status, begin: controller.begin, busy: status.state === 'processing' };
}

// Wrap the entire generator, before any imports, reads or serialization begin.
export function useExportFeedback(context = 'document') {
  const feedback = useTaskFeedback(context);
  const run = async (generate, format = 'pdf', successLabel) => {
    unlockSound();
    const task = feedback.begin({ label: format === 'xlsx' ? 'Preparing your spreadsheet' : 'Preparing your file', stage: 'Generating locally' });
    if (!task) return false;
    try {
      // Give the immediate feedback a paint before synchronous PDF/XLSX work.
      await new Promise(resolve => setTimeout(resolve, 0));
      if (!task.active()) return false;
      const result = await generate(task);
      if (result === false) throw new Error('Could not open the file preview. Please retry.');
      task.success(successLabel || fileReadyLabel(format));
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') task.cancel('Cancelled. Your inputs are still here.');
      else task.error('Could not generate your file. Your inputs are unchanged. Please try again.');
      return false;
    }
  };
  return { ...feedback, run };
}
