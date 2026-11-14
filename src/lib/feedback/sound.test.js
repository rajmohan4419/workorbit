// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { disposeSound, playTone, readSoundPreference, setSoundPreference, unlockSound } from './sound';

describe('optional local sound', () => {
  let oscillator, createOscillator, audio;
  beforeEach(() => {
    localStorage.clear(); disposeSound(); setSoundPreference(false);
    oscillator = { type: '', frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    createOscillator = vi.fn(() => oscillator);
    audio = { state: 'running', currentTime: 0, createOscillator, createGain: () => ({ gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }), resume: vi.fn().mockResolvedValue(), close: vi.fn().mockResolvedValue() };
    window.AudioContext = class { constructor() { return audio; } };
  });
  afterEach(() => { disposeSound(); delete window.AudioContext; vi.restoreAllMocks(); });
  it('defaults off and never starts an AudioContext from playback alone', () => {
    expect(readSoundPreference()).toBe(false); playTone(); unlockSound(); playTone();
    expect(createOscillator).not.toHaveBeenCalled();
  });
  it('persists explicit opt-in, waits for interaction, and prevents overlapping tones', () => {
    setSoundPreference(true); expect(localStorage.getItem('orbitboard:feedback-sound')).toBe('on');
    expect(readSoundPreference()).toBe(true); playTone(); expect(createOscillator).not.toHaveBeenCalled();
    unlockSound(); playTone(); playTone(true);
    expect(createOscillator).toHaveBeenCalledTimes(2);
    expect(oscillator.stop).toHaveBeenCalled();
    setSoundPreference(false); playTone(); expect(createOscillator).toHaveBeenCalledTimes(2);
  });
  it('ignores audio and storage errors', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked'); });
    window.AudioContext = class { constructor() { throw Error('unsupported'); } };
    expect(() => { setSoundPreference(true); unlockSound(); playTone(); }).not.toThrow();
  });
});
