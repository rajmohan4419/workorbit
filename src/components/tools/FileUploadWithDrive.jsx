import { useState, useRef } from 'react';
import { Upload, HardDrive, Link as LinkIcon, Check, AlertCircle, Loader2, X, ExternalLink } from 'lucide-react';

export function FileUploadWithDrive({
  accept = '*/*',
  multiple = false,
  label = 'Select File',
  description = 'Upload from your device or import directly from Google Drive',
  onFileSelect,
  onFilesSelect,
  className = ''
}) {
  const [mode, setMode] = useState('local'); // 'local' | 'gdrive'
  const [driveUrl, setDriveUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedNames, setSelectedNames] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError('');
    setSelectedNames(files.map(f => f.name));
    if (multiple && onFilesSelect) {
      onFilesSelect(files);
    } else if (onFileSelect) {
      onFileSelect(files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    setError('');
    setSelectedNames(files.map(f => f.name));
    if (multiple && onFilesSelect) {
      onFilesSelect(files);
    } else if (onFileSelect) {
      onFileSelect(files[0]);
    }
  };

  const extractDriveId = (url) => {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  url.match(/id=([a-zA-Z0-9_-]+)/) ||
                  url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleDriveImport = async (e) => {
    e?.preventDefault();
    if (!driveUrl.trim()) {
      setError('Please enter a Google Drive share link.');
      return;
    }
    const fileId = extractDriveId(driveUrl.trim());
    if (!fileId) {
      setError('Invalid Google Drive URL. Use a link like: https://drive.google.com/file/d/.../view');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use direct Google Drive export/download endpoint
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const response = await fetch(directUrl);
      if (!response.ok) {
        throw new Error('Could not fetch file directly. Ensure the file sharing is set to "Anyone with the link can view".');
      }
      const blob = await response.blob();
      const filename = `gdrive-file-${fileId.slice(0, 6)}.${blob.type.split('/')[1] || 'bin'}`;
      const file = new File([blob], filename, { type: blob.type });

      setSelectedNames([file.name]);
      if (multiple && onFilesSelect) {
        onFilesSelect([file]);
      } else if (onFileSelect) {
        onFileSelect(file);
      }
      setDriveUrl('');
    } catch (err) {
      setError(err.message || 'Google Drive CORS policy blocked direct client fetch. Please download the file or make sure link sharing is set to Anyone with link.');
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedNames([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onFileSelect) onFileSelect(null);
    if (onFilesSelect) onFilesSelect([]);
  };

  return (
    <div className={`rounded-2xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 sm:p-5 shadow-xs transition-colors ${className}`}>
      {/* Tab Switcher: Local Upload vs Google Drive */}
      <div className="flex items-center justify-between gap-3 mb-4 border-b border-[var(--orbit-border)] pb-3">
        <div>
          <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">{label}</h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{description}</p>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-[var(--orbit-border)]">
          <button
            type="button"
            onClick={() => setMode('local')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'local' 
                ? 'bg-white dark:bg-stone-900 text-accent-700 dark:text-accent-400 shadow-2xs' 
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Upload size={13} />
            <span>Local Upload</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('gdrive')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'gdrive' 
                ? 'bg-white dark:bg-stone-900 text-accent-700 dark:text-accent-400 shadow-2xs' 
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <span className="w-3.5 h-3.5 flex items-center justify-center font-black text-[10px] text-amber-500">▲</span>
            <span>Google Drive</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Local File Drag & Drop */}
      {mode === 'local' && (
        <div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-200 dark:border-stone-700 hover:border-accent-400 dark:hover:border-accent-500 rounded-2xl p-6 text-center cursor-pointer transition bg-stone-50/50 dark:bg-stone-800/30 hover:bg-accent-50/20 group"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-accent-50 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Upload size={22} />
            </div>
            <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
              Click to browse {multiple ? 'files' : 'a file'} or drag & drop here
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Supports: {accept === '*/*' ? 'All supported file types' : accept}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Mode 2: Google Drive Link Import */}
      {mode === 'gdrive' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <span className="font-bold shrink-0 text-sm">💡</span>
            <div>
              <p className="font-semibold">Importing from Google Drive</p>
              <p className="mt-0.5 opacity-90">
                In Google Drive, right-click your file → <strong>Share</strong> → change to <strong>"Anyone with the link"</strong>, then paste the URL below.
              </p>
            </div>
          </div>

          <form onSubmit={handleDriveImport} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <LinkIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="url"
                value={driveUrl}
                onChange={(e) => { setDriveUrl(e.target.value); setError(''); }}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--orbit-border)] bg-[var(--orbit-canvas)] dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-accent-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-xs font-bold transition disabled:opacity-50 shrink-0 min-h-[42px]"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Importing…</span>
                </>
              ) : (
                <>
                  <span>Import from Drive</span>
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between pt-1">
            <a
              href="https://drive.google.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent-700 dark:text-accent-400 hover:underline font-semibold"
            >
              <span>Open Google Drive in new tab</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Selected File Badge */}
      {selectedNames.length > 0 && (
        <div className="mt-3 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2 truncate">
            <Check size={14} className="shrink-0 text-emerald-600" />
            <span className="font-semibold truncate">
              {selectedNames.length === 1 ? selectedNames[0] : `${selectedNames.length} files selected (${selectedNames.join(', ')})`}
            </span>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg text-emerald-700 dark:text-emerald-300 ml-2 shrink-0"
            title="Clear file"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
          <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
export default FileUploadWithDrive;

