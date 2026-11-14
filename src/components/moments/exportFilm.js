import { drawFilmScene, FILM_SECONDS, greetingOpacity } from './filmFrames';
import { scheduleFilmScore } from './filmAudio';

const WIDTH = 720;
const HEIGHT = 960;
const SCENE_HEIGHT = 405;
const TEXT_WIDTH = 602;
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter() : null;

export function filmExportAvailable() {
  return typeof MediaRecorder === 'function' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    typeof MediaRecorder.isTypeSupported === 'function';
}

function createRecorder(stream, withAudio) {
  const candidates = withAudio
    ? ['video/mp4;codecs=avc1.42001f,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['video/mp4;codecs=avc1.42001f', 'video/mp4', 'video/webm;codecs=vp8', 'video/webm'];
  for (const mimeType of candidates) {
    if (!MediaRecorder.isTypeSupported(mimeType)) continue;
    try {
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
      recorder.start();
      return recorder;
    } catch {
      // A browser can advertise a container that cannot record these tracks.
    }
  }
  throw new Error('Video export is unavailable in this browser.');
}

function wrapLines(ctx, text) {
  return text.split(/\r?\n/).flatMap(paragraph => {
    const lines = [];
    let line = '';
    for (const word of paragraph.split(/(\s+)/u).filter(Boolean)) {
      if (ctx.measureText(line + word).width <= TEXT_WIDTH) {
        line += word;
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = '';
      if (!word.trim()) continue;
      const letters = segmenter ? Array.from(segmenter.segment(word), part => part.segment) : Array.from(word);
      for (const letter of letters) {
        if (line && ctx.measureText(line + letter).width > TEXT_WIDTH) {
          lines.push(line);
          line = '';
        }
        line += letter;
      }
    }
    lines.push(line.trimEnd());
    return lines;
  });
}

function planText(ctx, greeting, fontFamily) {
  const parts = [
    { text: greeting.recipient ? `Dear ${greeting.recipient},` : '', baseSize: 25, color: '#ffdbad' },
    { text: greeting.text, baseSize: 36, color: '#fff6e9' },
    { text: greeting.sender ? `From ${greeting.sender}` : '', baseSize: 25, color: '#ead7db' },
  ].filter(part => part.text);
  for (const scale of [1, .9, .8, .7, .6]) {
    const blocks = parts.map(part => {
      const size = Math.round(part.baseSize * scale);
      const font = `${size}px ${fontFamily}`;
      ctx.font = font;
      return { ...part, font, lineHeight: size * 1.55, lines: wrapLines(ctx, part.text) };
    });
    const height = blocks.reduce((total, block) => total + block.lines.length * block.lineHeight + 14, 0);
    if (height <= 416) return { blocks, height };
  }
  throw new Error('This greeting is too long for a readable video. You can still share its link.');
}

function drawCard(ctx, greeting, layout, time) {
  ctx.fillStyle = '#1a1121';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  ctx.translate(0, 78);
  drawFilmScene(ctx, WIDTH, SCENE_HEIGHT, greeting.slug, time);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffdbad';
  ctx.font = '600 27px system-ui, sans-serif';
  ctx.fillText(greeting.title, WIDTH / 2, 41);
  ctx.font = '21px system-ui, sans-serif';
  ctx.fillText('Made with OrbitBoard Moments', WIDTH / 2, HEIGHT - 29);

  ctx.globalAlpha = greetingOpacity(time);
  let y = 493 + (416 - layout.height) / 2;
  for (const { color, font, lines, lineHeight } of layout.blocks) {
    ctx.fillStyle = color;
    ctx.font = font;
    for (const line of lines) {
      ctx.fillText(line, WIDTH / 2, y + lineHeight / 2);
      y += lineHeight;
    }
    y += 14;
  }
  ctx.globalAlpha = 1;
}

export async function exportFilm({ greeting, fontFamily, audio, signal }) {
  let stream;
  let sound;
  try {
    if (!filmExportAvailable()) throw new Error('Video export is unavailable in this browser.');
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Video export is unavailable in this browser.');
    const layout = planText(ctx, greeting, fontFamily);
    drawCard(ctx, greeting, layout, 0);
    stream = canvas.captureStream(24);
    if (audio) {
      await audio.ready;
      sound = audio.context.createMediaStreamDestination();
      sound.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    }
    if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');

    const recorder = createRecorder(stream, Boolean(audio));
    const blob = await new Promise((resolve, reject) => {
      const chunks = [];
      let frame;
      const stop = () => {
        cancelAnimationFrame(frame);
        signal.removeEventListener('abort', stop);
        document.removeEventListener('visibilitychange', visibilityChanged);
        if (recorder.state !== 'inactive') recorder.stop();
      };
      const visibilityChanged = () => {
        if (!document.hidden) return;
        stop();
        reject(new Error('Keep this page open and visible while the video is being prepared.'));
      };
      recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      recorder.onstop = () => {
        if (signal.aborted) reject(new DOMException('Export cancelled', 'AbortError'));
        else if (!chunks.length) reject(new Error('The browser could not record this greeting.'));
        else resolve(new Blob(chunks, { type: chunks[0].type || recorder.mimeType }));
      };
      recorder.onerror = () => {
        stop();
        reject(new Error('The browser could not record this greeting.'));
      };
      const started = performance.now();
      signal.addEventListener('abort', stop, { once: true });
      document.addEventListener('visibilitychange', visibilityChanged);
      try {
        if (audio) scheduleFilmScore(audio.context, sound, greeting.slug);
      } catch (error) {
        stop();
        reject(error);
        return;
      }
      function render(now) {
        const elapsed = Math.min(FILM_SECONDS, (now - started) / 1000);
        try {
          drawCard(ctx, greeting, layout, elapsed);
        } catch (error) {
          stop();
          reject(error);
          return;
        }
        if (elapsed < FILM_SECONDS) frame = requestAnimationFrame(render);
        else stop();
      }
      frame = requestAnimationFrame(render);
    });
    const format = blob.type.startsWith('video/mp4') ? 'mp4' : blob.type.startsWith('video/webm') ? 'webm' : null;
    if (!format) throw new Error('The browser returned an unsupported video format.');
    return { blob, format };
  } finally {
    stream?.getTracks().forEach(track => track.stop());
    sound?.disconnect();
    if (audio) void audio.context.close().catch(() => {});
  }
}
