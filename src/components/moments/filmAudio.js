// The original synthesized score and its rendered audio may be reused under CC0 1.0.
// https://creativecommons.org/publicdomain/zero/1.0/
const cues = {
  diwali: [392, 493.88, 587.33, 783.99],
  'chhath-puja': [261.63, 329.63, 392, 523.25],
  christmas: [329.63, 440, 554.37, 659.25],
  birthday: [349.23, 440, 523.25, 698.46],
};

export function openFilmAudio() {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  if (!Audio) return null;
  const context = new Audio();
  const ready = context.resume();
  // Gesture-triggered playback can still be blocked by browser settings.
  ready.catch(() => {});
  return { context, ready };
}

export function scheduleFilmScore(context, destination, slug, elapsed = 0) {
  const notes = cues[slug] ?? [293.66, 369.99, 440, 587.33];
  const starts = [2, 2.46, 5, 5.52];
  const start = context.currentTime;
  notes.forEach((frequency, index) => {
    if (starts[index] < elapsed) return;
    const at = start + starts[index] - elapsed;
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = 'sine';
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(.09, at + .06);
    gain.gain.exponentialRampToValueAtTime(.001, at + 1.15);
    tone.connect(gain).connect(destination);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
    tone.start(at);
    tone.stop(at + 1.2);
  });
}
