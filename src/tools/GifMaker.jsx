import { useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, CheckCircle2, Download, GripVertical, ImagePlus,
  LoaderCircle, RotateCcw, Trash2, UploadCloud, X
} from 'lucide-react';

const GIFSHOT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.4.5/gifshot.min.js';
let gifshotPromise;

function loadGifshot() {
  if (typeof window !== 'undefined' && window.gifshot) return Promise.resolve(window.gifshot);
  if (gifshotPromise) return gifshotPromise;

  gifshotPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-orbitboard-gifshot]');
    const script = existing || document.createElement('script');
    const handleLoad = () => window.gifshot ? resolve(window.gifshot) : reject(new Error('The GIF encoder loaded but did not initialise.'));
    const handleError = () => reject(new Error('Could not load the GIF encoder. Check your connection and try again.'));
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (!existing) {
      script.src = GIFSHOT_URL;
      script.async = true;
      script.dataset.orbitboardGifshot = 'true';
      document.head.appendChild(script);
    }
  }).catch(error => {
    gifshotPromise = null;
    throw error;
  });

  return gifshotPromise;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read ' + file.name + '.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('One of the selected images could not be decoded.'));
    image.src = src;
  });
}

async function prepareFrame(src, width, height) {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not prepare the image frames.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const drawHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  context.drawImage(image, Math.round((width - drawWidth) / 2), Math.round((height - drawHeight) / 2), drawWidth, drawHeight);
  return canvas.toDataURL('image/png');
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function GifMaker() {
  const inputRef = useRef(null);
  const dragIndexRef = useRef(null);
  const [frames, setFrames] = useState([]);
  const [interval, setInterval] = useState('0.4');
  const [width, setWidth] = useState('480');
  const [quality, setQuality] = useState('10');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gifUrl, setGifUrl] = useState('');
  const [gifSize, setGifSize] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const totalBytes = frames.reduce((sum, frame) => sum + frame.file.size, 0);

  const addFiles = async (fileList) => {
    setError('');
    setNotice('');
    setGifUrl('');
    const selected = Array.from(fileList || []);
    const allowed = selected.filter(file => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type));
    const oversized = allowed.filter(file => file.size > 15 * 1024 * 1024);
    const usable = allowed.filter(file => file.size <= 15 * 1024 * 1024);
    if (oversized.length) setNotice('Skipped ' + oversized.length + ' file(s) larger than 15 MB.');
    if (allowed.length !== selected.length) setNotice((prev) => [prev, 'Only JPG, PNG, WebP and GIF files are supported.'].filter(Boolean).join(' '));
    if (frames.length + usable.length > 25) {
      setError('You can use up to 25 frames per GIF.');
      return;
    }
    const remainingBudget = 50 * 1024 * 1024 - totalBytes;
    const accepted = [];
    let used = 0;
    for (const file of usable) {
      if (used + file.size > remainingBudget) continue;
      used += file.size;
      accepted.push(file);
    }
    if (accepted.length < usable.length) setNotice('Some files were skipped to keep the total upload size under 50 MB.');
    try {
      const next = await Promise.all(accepted.map(async file => ({
        id: (window.crypto?.randomUUID?.() || (Date.now() + '-' + Math.random())),
        file,
        preview: await readFileAsDataUrl(file)
      })));
      setFrames(current => [...current, ...next]);
    } catch (readError) {
      setError(readError.message || 'Could not read the selected images.');
    }
  };

  const removeFrame = (id) => {
    setFrames(current => current.filter(frame => frame.id !== id));
    setGifUrl('');
  };

  const moveFrame = (from, to) => {
    setFrames(current => {
      if (to < 0 || to >= current.length) return current;
      const next = current.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setGifUrl('');
  };

  const generate = async () => {
    if (frames.length < 2) {
      setError('Add at least two images to create an animation.');
      return;
    }
    const seconds = Number(interval);
    const outputWidth = Number(width);
    const encoderQuality = Number(quality);
    if (!Number.isFinite(seconds) || seconds < 0.1 || seconds > 3) {
      setError('Frame duration must be between 0.1 and 3 seconds.');
      return;
    }
    if (!Number.isInteger(outputWidth) || outputWidth < 240 || outputWidth > 1000) {
      setError('Output width must be between 240 and 1,000 pixels.');
      return;
    }

    setBusy(true);
    setProgress(0);
    setError('');
    setNotice('');
    setGifUrl('');
    try {
      const firstImage = await loadImage(frames[0].preview);
      const ratio = firstImage.naturalHeight / firstImage.naturalWidth;
      const canvasWidth = ratio > 1 ? Math.min(outputWidth, Math.floor(1000 / ratio)) : outputWidth;
      const canvasHeight = Math.max(1, Math.min(1000, Math.round(canvasWidth * ratio)));
      const images = [];
      for (let index = 0; index < frames.length; index += 1) {
        images.push(await prepareFrame(frames[index].preview, canvasWidth, canvasHeight));
        setProgress(Math.round(((index + 1) / frames.length) * 25));
      }
      const gifshot = await loadGifshot();
      await new Promise((resolve, reject) => {
        gifshot.createGIF({
          images,
          interval: seconds,
          gifWidth: canvasWidth,
          gifHeight: canvasHeight,
          quality: encoderQuality,
          progressCallback: value => setProgress(25 + Math.round(Math.max(0, Math.min(1, value)) * 74))
        }, result => {
          if (result.error || !result.image) {
            reject(new Error(result.errorMsg || 'The GIF could not be generated. Try fewer images or a smaller width.'));
            return;
          }
          const comma = result.image.indexOf(',');
          const binary = atob(result.image.slice(comma + 1));
          const bytes = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
          const blob = new Blob([bytes], { type: 'image/gif' });
          setGifSize(blob.size);
          setGifUrl(URL.createObjectURL(blob));
          setProgress(100);
          resolve();
        });
      });
    } catch (generationError) {
      setError(generationError.message || 'Something went wrong while generating the GIF.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFrames([]);
    setGifUrl('');
    setGifSize(0);
    setProgress(0);
    setError('');
    setNotice('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,.75fr)]">
        <section className="space-y-4">
          <div
            onDragOver={event => event.preventDefault()}
            onDrop={event => { event.preventDefault(); addFiles(event.dataTransfer.files); }}
            className="rounded-2xl border-2 border-dashed border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900/60 p-6 sm:p-8 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-700 dark:bg-accent-950/60 dark:text-accent-300">
              <UploadCloud size={24} />
            </div>
            <h3 className="mt-3 text-base font-bold text-stone-900 dark:text-stone-100">Drop your images here</h3>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">JPG, PNG, WebP or GIF · up to 25 frames · 15 MB per image</p>
            <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-500">
              <ImagePlus size={17} /> Choose images
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={event => { addFiles(event.target.files); event.target.value = ''; }}
            />
            <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">Files stay on this device. Nothing is uploaded to OrbitBoard.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100">Frames <span className="text-sm font-medium text-stone-500">({frames.length}/25)</span></h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Drag to reorder, or use the arrow controls.</p>
            </div>
            {frames.length > 0 && <button type="button" onClick={reset} disabled={busy} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800"><RotateCcw size={14} /> Clear all</button>}
          </div>

          {frames.length === 0 ? (
            <div className="rounded-xl border border-[var(--orbit-border)] bg-white/70 px-4 py-8 text-center text-sm text-stone-500 dark:bg-stone-900/40 dark:text-stone-400">Your selected images will appear here in playback order.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {frames.map((frame, index) => (
                <div
                  key={frame.id}
                  draggable={!busy}
                  onDragStart={() => { dragIndexRef.current = index; }}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => { event.preventDefault(); if (dragIndexRef.current !== null) moveFrame(dragIndexRef.current, index); dragIndexRef.current = null; }}
                  className="group overflow-hidden rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900"
                >
                  <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-800">
                    <img src={frame.preview} alt={frame.file.name} className="h-full w-full object-contain" />
                    <span className="absolute left-2 top-2 rounded-md bg-stone-950/75 px-2 py-1 text-[10px] font-bold text-white">FRAME {index + 1}</span>
                    <span className="absolute right-2 top-2 rounded-md bg-stone-950/75 p-1 text-white"><GripVertical size={14} /></span>
                  </div>
                  <div className="space-y-2 p-2.5">
                    <p className="truncate text-xs font-semibold text-stone-800 dark:text-stone-200" title={frame.file.name}>{frame.file.name}</p>
                    <p className="text-[11px] text-stone-500">{formatBytes(frame.file.size)}</p>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex gap-1">
                        <button type="button" aria-label={'Move frame ' + (index + 1) + ' up'} onClick={() => moveFrame(index, index - 1)} disabled={busy || index === 0} className="tap-target rounded-lg border border-[var(--orbit-border)] text-stone-600 hover:bg-stone-100 disabled:opacity-30 dark:text-stone-300 dark:hover:bg-stone-800"><ArrowUp size={14} /></button>
                        <button type="button" aria-label={'Move frame ' + (index + 1) + ' down'} onClick={() => moveFrame(index, index + 1)} disabled={busy || index === frames.length - 1} className="tap-target rounded-lg border border-[var(--orbit-border)] text-stone-600 hover:bg-stone-100 disabled:opacity-30 dark:text-stone-300 dark:hover:bg-stone-800"><ArrowDown size={14} /></button>
                      </div>
                      <button type="button" aria-label={'Remove ' + frame.file.name} onClick={() => removeFrame(frame.id)} disabled={busy} className="tap-target rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {frames.length > 0 && <p className="text-xs text-stone-500 dark:text-stone-400">{frames.length} frames · {formatBytes(totalBytes)} selected</p>}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--orbit-border)] bg-white p-4 sm:p-5 dark:bg-stone-900">
            <h3 className="font-bold text-stone-900 dark:text-stone-100">Animation settings</h3>
            <div className="mt-4 space-y-4">
              <label className="block space-y-1.5">
                <span className="flex items-center justify-between text-sm font-medium text-stone-700 dark:text-stone-300"><span>Frame duration</span><strong>{Number(interval).toFixed(1)} sec</strong></span>
                <input type="range" min="0.1" max="3" step="0.1" value={interval} onChange={event => { setInterval(event.target.value); setGifUrl(''); }} className="w-full accent-accent-600" />
                <span className="block text-xs text-stone-500">How long each image stays visible.</span>
              </label>
              <label className="block space-y-1.5">
                <span className="flex items-center justify-between text-sm font-medium text-stone-700 dark:text-stone-300"><span>Output width</span><strong>{width} px</strong></span>
                <input type="range" min="240" max="1000" step="40" value={width} onChange={event => { setWidth(event.target.value); setGifUrl(''); }} className="w-full accent-accent-600" />
              </label>
              <label className="block space-y-1.5">
                <span className="flex items-center justify-between text-sm font-medium text-stone-700 dark:text-stone-300"><span>Encoder quality</span><strong>{quality}/20</strong></span>
                <input type="range" min="1" max="20" step="1" value={quality} onChange={event => { setQuality(event.target.value); setGifUrl(''); }} className="w-full accent-accent-600" />
                <span className="block text-xs text-stone-500">Lower values preserve more colour detail and may create larger files.</span>
              </label>
            </div>
            <button type="button" onClick={generate} disabled={busy || frames.length < 2} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-3 text-sm font-bold text-white hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <><LoaderCircle size={17} className="animate-spin" /> Creating GIF…</> : <><ImagePlus size={17} /> Generate GIF</>}
            </button>
            {busy && <div className="mt-3" role="status" aria-live="polite"><div className="mb-1 flex justify-between text-xs text-stone-500"><span>Preparing animation</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"><div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: progress + '%' }} /></div></div>}
          </div>

          <div className="rounded-2xl border border-[var(--orbit-border)] bg-stone-50 p-4 dark:bg-stone-900/60">
            <h3 className="font-bold text-stone-900 dark:text-stone-100">Privacy first</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">Your images are decoded, resized and encoded on your device. They are not sent to OrbitBoard or stored on a server.</p>
            <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-stone-400">The GIF encoder script is fetched from cdnjs only when you generate an animation.</p>
          </div>
        </aside>
      </div>

      {(error || notice) && <div className="space-y-2" aria-live="polite">{error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><X size={17} className="mt-0.5 shrink-0" />{error}</div>}{notice && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{notice}</div>}</div>}

      {gifUrl && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-6 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200"><CheckCircle2 size={18} /> Your GIF is ready</div><p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">{formatBytes(gifSize)} · {frames.length} frames · {width}px wide</p></div>
            <a href={gifUrl} download="orbitboard-animation.gif" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"><Download size={17} /> Download GIF</a>
          </div>
          <div className="mt-5 rounded-xl border border-emerald-200 bg-white p-3 text-center dark:border-emerald-900 dark:bg-stone-950"><img src={gifUrl} alt="Preview of the generated animated GIF" className="mx-auto max-h-[420px] max-w-full rounded-lg object-contain" /></div>
        </section>
      )}
    </div>
  );
}
