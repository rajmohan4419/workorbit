const KEY = 'orbitboard:feedback-sound';
let context;
let nodes = [];
let interaction = false;
let enabled = false;
const listeners = new Set();
export function readSoundPreference() {
  try { enabled = localStorage.getItem(KEY) === 'on'; } catch { enabled = false; }
  return enabled;
}
export const getSoundPreference = () => enabled;
export const subscribeSound = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export function stopSound() {
  nodes.forEach(node => { try { node.stop(); node.disconnect(); } catch { /* already stopped */ } });
  nodes = [];
}
export function setSoundPreference(value, persist = true) {
  enabled = value === true;
  if (persist) { try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch { /* optional preference */ } }
  if (!enabled) stopSound();
  listeners.forEach(listener => listener());
}
export function unlockSound() {
  interaction = true;
  if (!enabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    context ||= new Audio();
    void context.resume().catch(() => {});
  } catch { /* Audio must never block an action. */ }
}
export function playTone(success = false) {
  if (!enabled || !interaction || !context || context.state !== 'running') return;
  try {
    stopSound();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    const now = context.currentTime;
    oscillator.frequency.setValueAtTime(success ? 660 : 440, now);
    oscillator.frequency.exponentialRampToValueAtTime(success ? 880 : 520, now + .10);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(.025, now + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); nodes = nodes.filter(node => node !== oscillator); };
    nodes = [oscillator]; oscillator.start(now); oscillator.stop(now + .17);
  } catch { /* Optional decoration. */ }
}
export function disposeSound() {
  stopSound(); interaction = false;
  if (context) { void context.close().catch(() => {}); context = undefined; }
}
