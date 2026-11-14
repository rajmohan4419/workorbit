import { expect, it, vi } from 'vitest';
import { scheduleFilmScore } from './filmAudio';

it('schedules original cues against the film clock and skips cues that have passed', () => {
  const starts = [];
  const stops = [];
  const destination = {};
  const context = {
    currentTime: 12,
    createOscillator: () => ({
      frequency: { value: 0 },
      connect: node => node,
      start: time => starts.push(time),
      stop: time => stops.push(time),
    }),
    createGain: () => ({
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }),
  };
  scheduleFilmScore(context, destination, 'chhath-puja', 4);
  expect(starts).toEqual([13, 13.52]);
  expect(stops).toHaveLength(2);
  expect(stops[0]).toBeCloseTo(14.2);
  expect(stops[1]).toBeCloseTo(14.72);
});
