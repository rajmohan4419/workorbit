import { describe, expect, it } from 'vitest';
import { createFeedbackTask, fileReadyLabel, getFeedbackSnapshot } from './taskFeedback';

describe('truthful feedback lifecycle', () => {
  it('starts immediately, rejects duplicate starts and ignores repeated terminal callbacks', () => {
    const feedback = createFeedbackTask('spreadsheet');
    expect(feedback.getSnapshot().state).toBe('idle');
    const action = feedback.begin({ stage: 'Reading workbook' });
    expect(feedback.getSnapshot()).toMatchObject({ state: 'processing', progress: null, stage: 'Reading workbook' });
    expect(feedback.begin()).toBeNull();
    action.success('Your spreadsheet is ready.');
    action.success('Incorrect second callback');
    action.error();
    expect(feedback.getSnapshot()).toMatchObject({ state: 'success', label: 'Your spreadsheet is ready.' });
  });
  it('only displays halfway for measured progress near 50%; named stages invent no percentage', () => {
    const feedback = createFeedbackTask(); const action = feedback.begin();
    action.stage('Serializing PDF');
    expect(feedback.getSnapshot().progress).toBeNull();
    action.progress(0, 4); action.progress(1, 4);
    expect(feedback.getSnapshot()).toMatchObject({ progress: 25, halfway: false });
    action.progress(2, 4);
    expect(feedback.getSnapshot()).toMatchObject({ progress: 50, halfway: true });
    action.progress(3, 4);
    expect(feedback.getSnapshot()).toMatchObject({ progress: 75, halfway: false });
    action.progress(1, 0); action.progress(5, 4);
    expect(feedback.getSnapshot().progress).toBe(75);
    action.cancel();
  });
  it('permits retries after errors and cancellation; stale callbacks cannot finish the next attempt', () => {
    const feedback = createFeedbackTask(); const first = feedback.begin(); first.error();
    const retry = feedback.begin(); first.success('Wrong attempt');
    expect(feedback.getSnapshot().state).toBe('processing');
    retry.cancel(); expect(feedback.getSnapshot().state).toBe('cancelled');
    const final = feedback.begin(); final.success('Download started.');
    expect(feedback.getSnapshot().label).toBe('Download started.');
  });
  it('stops processing on disposal and separates file readiness from download initiation', () => {
    const feedback = createFeedbackTask(); const action = feedback.begin(); feedback.dispose();
    action.success('Must not happen');
    expect(feedback.getSnapshot().state).toBe('cancelled');
    expect(fileReadyLabel('pdf')).toBe('Your PDF is ready.');
    expect(fileReadyLabel('xlsx')).toBe('Your spreadsheet is ready.');
    expect(getFeedbackSnapshot().tasks.length).toBeLessThanOrEqual(8);
  });
});
