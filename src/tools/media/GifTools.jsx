import { useState, useRef } from 'react';
import { Download, Trash2, Sparkles, Loader2, Video, Film } from 'lucide-react';
import { encodeGifFromImages, encodeGifFromVideo } from '../../engines/gifEncoder';
import { downloadBlob } from '../../lib/toolFormat';
import { FileUploadWithDrive } from '../../components/tools/FileUploadWithDrive';

export function ImageToGif() {
  const [frames, setFrames] = useState([]); // Array of { file, url, img }
  const [delayMs, setDelayMs] = useState(250);
  const [maxWidth, setMaxWidth] = useState(400);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [gifBlob, setGifBlob] = useState(null);
  const [gifUrl, setGifUrl] = useState(null);
  const [status, setStatus] = useState('');

  const handleFiles = async (files) => {
    if (!files || !files.length) return;
    setStatus('Loading frames…');
    const newFrames = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        img.src = url;
      });
      newFrames.push({ file, url, img });
    }

    setFrames(prev => [...prev, ...newFrames]);
    setStatus(`${files.length} frame(s) added.`);
  };

  const removeFrame = (index) => {
    setFrames(prev => {
      const target = prev[index];
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAll = () => {
    frames.forEach(f => f.url && URL.revokeObjectURL(f.url));
    setFrames([]);
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    setGifUrl(null);
    setGifBlob(null);
    setStatus('');
    setProgress(0);
  };

  const generateGif = async () => {
    if (frames.length < 2) {
      setStatus('Please add at least 2 image frames to create an animated GIF.');
      return;
    }
    setBusy(true);
    setProgress(10);
    setStatus('Processing images and quantizing colors…');

    try {
      const images = frames.map(f => f.img);
      const aspect = images[0].naturalHeight / images[0].naturalWidth;
      const height = Math.round(maxWidth * (aspect || 0.75));

      const blob = await encodeGifFromImages(images, {
        width: maxWidth,
        height,
        delayMs: Number(delayMs),
        onProgress: setProgress
      });

      if (gifUrl) URL.revokeObjectURL(gifUrl);
      const url = URL.createObjectURL(blob);
      setGifBlob(blob);
      setGifUrl(url);
      setStatus(`GIF generated successfully! (${(blob.size / 1024).toFixed(1)} KB)`);
    } catch {
      setStatus('Could not generate GIF. Please try smaller images or fewer frames.');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!gifBlob) return;
    downloadBlob(gifBlob, 'orbitboard-image-to-gif.gif', 'image-to-gif');
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      {/* Settings & Upload (Left) */}
      <div className="lg:col-span-7 space-y-6">
        <FileUploadWithDrive
          accept="image/png,image/jpeg,image/webp"
          multiple={true}
          label="Add Image Frames"
          description="Select sequential photos or graphics (JPG, PNG, WebP) from device or Google Drive"
          onFilesSelect={handleFiles}
        />

        {/* Frames Strip */}
        {frames.length > 0 && (
          <div className="rounded-2xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Frames ({frames.length})
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                Clear all
              </button>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
              {frames.map((frame, index) => (
                <div key={index} className="relative group shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-[var(--orbit-border)] bg-white dark:bg-stone-800">
                  <img src={frame.url} alt={`Frame ${index + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1 rounded font-bold">
                    #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFrame(index)}
                    className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove frame"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Animation Speed & Resolution */}
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
            <span>Frame Speed: {delayMs}ms ({(1000 / delayMs).toFixed(1)} FPS)</span>
            <input
              type="range"
              min="50"
              max="1000"
              step="50"
              value={delayMs}
              onChange={e => setDelayMs(e.target.value)}
              className="mt-1"
            />
            <span className="text-[10px] text-stone-400 font-normal">Faster ⟵ ⟶ Slower</span>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
            <span>Max GIF Width: {maxWidth}px</span>
            <input
              type="range"
              min="240"
              max="640"
              step="40"
              value={maxWidth}
              onChange={e => setMaxWidth(e.target.value)}
              className="mt-1"
            />
            <span className="text-[10px] text-stone-400 font-normal">Smaller size ⟵ ⟶ Higher resolution</span>
          </label>
        </div>

        {/* Generate Button */}
        <div>
          <button
            type="button"
            onClick={generateGif}
            disabled={busy || frames.length < 2}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-bold shadow-xs transition"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Encoding GIF ({progress}%)…</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Animated GIF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output & Preview (Right) */}
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-4">
        <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5 shadow-xs text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 text-left">
            GIF Animation Preview
          </p>

          {gifUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-2">
                <img src={gifUrl} alt="Generated Animated GIF" className="max-h-72 max-w-full object-contain rounded-lg" />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={download}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition"
                >
                  <Download size={16} />
                  <span>Download orbitboard-image-to-gif.gif</span>
                </button>
                <p className="text-[11px] text-stone-500">
                  Ready to share on Slack, Discord, websites or social media.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 px-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400">
              <Film size={36} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">Your generated GIF will preview here</p>
              <p className="text-[11px] mt-1 text-stone-400">Add 2 or more frames and click Generate</p>
            </div>
          )}

          {status && (
            <p aria-live="polite" className="mt-3 text-xs font-medium text-stone-700 dark:text-stone-300">
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function VideoToGif() {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(4);
  const [fps, setFps] = useState(8);
  const [targetWidth, setTargetWidth] = useState(360);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [gifBlob, setGifBlob] = useState(null);
  const [gifUrl, setGifUrl] = useState(null);
  const [status, setStatus] = useState('');
  const videoRef = useRef(null);

  const handleVideoSelect = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(selectedFile);
    setVideoUrl(url);
    setGifUrl(null);
    setGifBlob(null);
    setStatus('Video loaded. Adjust trim times and click convert.');
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = Math.round(videoRef.current.duration) || 5;
      setDuration(dur);
      setStartTime(0);
      setEndTime(Math.min(dur, 4));
    }
  };

  const convertVideo = async () => {
    if (!videoRef.current) {
      setStatus('Please select a video file first.');
      return;
    }
    const start = Math.max(0, Number(startTime));
    const end = Math.min(duration || 10, Number(endTime));
    if (end <= start) {
      setStatus('End time must be greater than start time.');
      return;
    }

    setBusy(true);
    setProgress(5);
    setStatus('Extracting video frames and compressing into GIF…');

    try {
      const blob = await encodeGifFromVideo(videoRef.current, {
        startTime: start,
        endTime: end,
        fps: Number(fps),
        width: Number(targetWidth),
        onProgress: setProgress
      });

      if (gifUrl) URL.revokeObjectURL(gifUrl);
      const url = URL.createObjectURL(blob);
      setGifBlob(blob);
      setGifUrl(url);
      setStatus(`Video converted to GIF! (${(blob.size / 1024).toFixed(1)} KB)`);
    } catch {
      setStatus('Error converting video. Ensure your video plays properly in the preview.');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!gifBlob) return;
    downloadBlob(gifBlob, 'orbitboard-video-to-gif.gif', 'video-to-gif');
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      {/* Upload & Controls (Left) */}
      <div className="lg:col-span-7 space-y-6">
        <FileUploadWithDrive
          file={file}
          accept="video/mp4,video/webm,video/quicktime,video/mov"
          multiple={false}
          label="Choose Video Clip"
          description="Upload MP4, WebM, or MOV video from computer or Google Drive"
          onFileSelect={handleVideoSelect}
          onClear={() => {
            setFile(null);
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            setVideoUrl(null);
            if (gifUrl) URL.revokeObjectURL(gifUrl);
            setGifUrl(null);
            setGifBlob(null);
            setStatus('');
          }}
        />

        {videoUrl && (
          <div className="space-y-4 rounded-2xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900/40 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Video Player Preview
            </span>
            <div className="rounded-xl overflow-hidden bg-black max-h-60 flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                onLoadedMetadata={handleLoadedMetadata}
                className="max-h-60 max-w-full"
              />
            </div>

            {/* Trimming Controls */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-stone-700 dark:text-stone-300">
                <span>Start Time (sec): {startTime}s</span>
                <input
                  type="number"
                  min="0"
                  max={Math.max(0, endTime - 0.5)}
                  step="0.5"
                  value={startTime}
                  onChange={e => setStartTime(Number(e.target.value))}
                  className="p-2 rounded-lg border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-stone-700 dark:text-stone-300">
                <span>End Time (sec): {endTime}s</span>
                <input
                  type="number"
                  min={startTime + 0.5}
                  max={duration || 60}
                  step="0.5"
                  value={endTime}
                  onChange={e => setEndTime(Number(e.target.value))}
                  className="p-2 rounded-lg border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </label>
            </div>

            <p className="text-[11px] text-stone-500">
              Selected Clip Length: <strong>{(Math.max(0, endTime - startTime)).toFixed(1)} seconds</strong> (Max 10s recommended)
            </p>
          </div>
        )}

        {/* Quality and Resolution */}
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
            <span>Frame Rate: {fps} FPS</span>
            <select
              value={fps}
              onChange={e => setFps(Number(e.target.value))}
              className="p-2.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
            >
              <option value="5">5 FPS (Smallest file size)</option>
              <option value="8">8 FPS (Recommended smooth)</option>
              <option value="12">12 FPS (High motion)</option>
              <option value="15">15 FPS (Ultra smooth)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
            <span>GIF Width: {targetWidth}px</span>
            <select
              value={targetWidth}
              onChange={e => setTargetWidth(Number(e.target.value))}
              className="p-2.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none"
            >
              <option value="240">240px (Micro thumbnail)</option>
              <option value="360">360px (Standard / Email friendly)</option>
              <option value="480">480px (Sharp HD preview)</option>
            </select>
          </label>
        </div>

        {/* Convert Button */}
        <div>
          <button
            type="button"
            onClick={convertVideo}
            disabled={busy || !videoUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-bold shadow-xs transition"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Converting Video ({progress}%)…</span>
              </>
            ) : (
              <>
                <Video size={16} />
                <span>Convert Video to GIF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output & Preview (Right) */}
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-4">
        <div className="rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-5 shadow-xs text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 text-left">
            GIF Animation Preview
          </p>

          {gifUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-2">
                <img src={gifUrl} alt="Generated Animated GIF" className="max-h-72 max-w-full object-contain rounded-lg" />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={download}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition"
                >
                  <Download size={16} />
                  <span>Download orbitboard-video-to-gif.gif</span>
                </button>
                <p className="text-[11px] text-stone-500">
                  Ready to share on Slack, Discord, websites or social media.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 px-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400">
              <Film size={36} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">Your converted GIF will appear here</p>
              <p className="text-[11px] mt-1 text-stone-400">Upload a video clip and click Convert</p>
            </div>
          )}

          {status && (
            <p aria-live="polite" className="mt-3 text-xs font-medium text-stone-700 dark:text-stone-300">
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

