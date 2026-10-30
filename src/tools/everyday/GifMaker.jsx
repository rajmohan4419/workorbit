import { useEffect, useState } from 'react';
import { Field } from '../../components/tools/ToolFields';
import { validateGifInputs, FIT_MODES, GIF_LIMITS } from './gifLayout';
import { encodeGifFromImages } from '../../engines/gifEncoder';
import { downloadBlob } from '../../lib/toolFormat';
import { FileUploadWithDrive } from '../../components/tools/FileUploadWithDrive';

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read ${file.name}`)); };
    img.src = url;
  });
}

export function GifMaker() {
  const [files, setFiles] = useState([]);
  const [size, setSize] = useState('400');
  const [interval, setInterval] = useState('0.5');
  const [mode, setMode] = useState('fit');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result]);

  const generate = async () => {
    const numSize = Number(size);
    const numInterval = Number(interval);
    const totalBytes = files.reduce((s, f) => s + f.size, 0);
    const problems = validateGifInputs({ fileCount: files.length, totalBytes, size: numSize, interval: numInterval });
    if (problems.length) { setErrors(problems); return; }

    setBusy(true);
    setErrors([]);
    setResult(null);
    try {
      const images = await Promise.all(files.map(loadImage));
      const blob = await encodeGifFromImages(images, {
        width: numSize,
        height: numSize,
        delayMs: Math.max(20, Math.round(numInterval * 1000)),
      });
      const dataUrl = URL.createObjectURL(blob);
      setResult({ blob, dataUrl, url: dataUrl });
      setBusy(false);
    } catch (err) {
      setBusy(false);
      setErrors([err.message || 'Something went wrong while reading the images.']);
    }
  };

  const download = () => {
    if (!result?.blob) return;
    downloadBlob(result.blob, 'orbitboard-gif-maker.gif', 'gif-maker');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <FileUploadWithDrive
          label={`Add images for the GIF (2 to ${GIF_LIMITS.maxFrames} images)`}
          accept="image/*"
          onFileSelect={f => {
            if (f) {
              setFiles(prev => [...prev, f]);
              setResult(null);
              setErrors([]);
            }
          }}
          onClear={() => {
            setFiles([]);
            setResult(null);
            setErrors([]);
          }}
        />

        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
              <span>{files.length} image(s) queued</span>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-red-500 hover:text-red-600 dark:text-red-400"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span
                  key={f.name + i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-800 dark:text-stone-200"
                >
                  <span className="truncate max-w-[140px]">{i + 1}. {f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    className="text-stone-400 hover:text-red-500"
                    title="Remove frame"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Frame time (seconds)" value={interval} onChange={setInterval} />
        <Field label="Size (pixels, square)" value={size} onChange={setSize} />
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Image placement</span>
          <select value={mode} onChange={e => setMode(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base">
            {FIT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
      </div>

      {errors.map(e => (
        <p key={e} role="alert" className="text-sm text-rose-700 dark:text-rose-300">{e}</p>
      ))}

      <button type="button" onClick={generate} disabled={busy || files.length < 2}
        className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 disabled:opacity-50">
        {busy ? 'Creating GIF…' : 'Create GIF'}
      </button>

      {result && (
        <div className="space-y-3 text-center">
          <img src={result.dataUrl} alt="Your animated GIF preview" className="mx-auto max-w-full rounded-xl border border-[var(--orbit-border)]" />
          <button type="button" onClick={download}
            className="px-5 py-2.5 min-h-[44px] rounded-xl border border-[var(--orbit-border)] text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
            Download GIF
          </button>
        </div>
      )}
    </div>
  );
}
