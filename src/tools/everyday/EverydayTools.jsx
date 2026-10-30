import { useState } from 'react';
import { Field, Result } from '../../components/tools/ToolFields';
import { FileUploadWithDrive } from '../../components/tools/FileUploadWithDrive';
import { money, num, downloadBlob } from '../../lib/toolFormat';
import { csvToXlsx, jsonToXlsx, xlsxToCsv } from '../../engines/spreadsheet';
import { ExportActions } from '../developer/DeveloperTools';

export function Converter({ type }) {
  const configs = {
    length: { units: { mm: 1, cm: 10, m: 1000, km: 1000000, in: 25.4, ft: 304.8, mi: 1609344 }, labels: { mm: 'Millimetres', cm: 'Centimetres', m: 'Metres', km: 'Kilometres', in: 'Inches', ft: 'Feet', mi: 'Miles' } },
    weight: { units: { g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237, t: 1000000 }, labels: { g: 'Grams', kg: 'Kilograms', oz: 'Ounces', lb: 'Pounds', t: 'Tonnes' } },
    time: { units: { s: 1, min: 60, h: 3600, d: 86400 }, labels: { s: 'Seconds', min: 'Minutes', h: 'Hours', d: 'Days' } }
  };
  const cfg = configs[type]; const keys = Object.keys(cfg.units);
  const [value, setValue] = useState('1'); const [from, setFrom] = useState(keys[0]); const [to, setTo] = useState(keys[1] || keys[0]);
  const result = num(value) * cfg.units[from] / cfg.units[to];
  const text = `${value} ${cfg.labels[from]} = ${Number.isFinite(result) ? result.toLocaleString('en-IN', { maximumFractionDigits: 8 }) : 'Invalid'} ${cfg.labels[to]}`;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Value" value={value} onChange={setValue} />
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">From</span>
            <select value={from} onChange={e => setFrom(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
              {keys.map(k => <option key={k} value={k}>{cfg.labels[k]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">To</span>
            <select value={to} onChange={e => setTo(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
              {keys.map(k => <option key={k} value={k}>{cfg.labels[k]}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-4">
        <Result label="Converted value" value={text} highlight />
        <ExportActions content={text} filename={`orbitboard-${type}-conversion.txt`} />
      </div>
    </div>
  );
}

export function TemperatureConverter() {
  const [value, setValue] = useState('25'); const [from, setFrom] = useState('C'); const [to, setTo] = useState('F');
  const toC = v => from === 'C' ? v : from === 'F' ? (v - 32) * 5 / 9 : v - 273.15;
  const c = toC(num(value)); const result = to === 'C' ? c : to === 'F' ? c * 9 / 5 + 32 : c + 273.15;
  const text = `${value} ${from} = ${Number.isFinite(result) ? result.toFixed(6) : 'Invalid'} ${to}`;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Temperature" value={value} onChange={setValue} />
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className="text-xs font-semibold text-stone-700 dark:text-stone-300">From</span>
            <select value={from} onChange={e => setFrom(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
              <option value="C">Celsius</option><option value="F">Fahrenheit</option><option value="K">Kelvin</option>
            </select>
          </label>
          <label className="block"><span className="text-xs font-semibold text-stone-700 dark:text-stone-300">To</span>
            <select value={to} onChange={e => setTo(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 min-h-[44px]">
              <option value="C">Celsius</option><option value="F">Fahrenheit</option><option value="K">Kelvin</option>
            </select>
          </label>
        </div>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-4">
        <Result label="Converted value" value={text} highlight />
        <ExportActions content={text} filename="orbitboard-temperature-conversion.txt" />
      </div>
    </div>
  );
}

export function ImageConverter({ format }) {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState('0.92');
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState('');
  const isJpg = format === 'image/jpeg'; const ext = isJpg ? 'jpg' : 'png';

  const convert = async () => {
    if (!file) { setStatus('Choose an image first.'); return; }
    setStatus('Converting...');
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url;
      });
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (isJpg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(image, 0, 0);
      setPreview(canvas.toDataURL('image/' + (isJpg ? 'jpeg' : 'png'), isJpg ? Number(quality) : undefined));
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/' + (isJpg ? 'jpeg' : 'png'), isJpg ? Number(quality) : undefined));
      if (!blob) throw new Error('Could not create output image');
      const toolSlug = isJpg ? 'png-to-jpg' : 'jpg-to-png';
      downloadBlob(blob, `orbitboard-${toolSlug}.${ext}`, toolSlug);
      setStatus('Done — your converted image is ready.');
    } catch { setStatus('Could not convert this image. Try another file.'); }
    finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <FileUploadWithDrive
          label="Image file"
          accept="image/*"
          file={file}
          onFileSelect={f => { setFile(f); setStatus(''); }}
          onClear={() => { setFile(null); setStatus(''); }}
        />
        {isJpg && (
          <label className="block">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">JPG Quality: {Math.round(Number(quality) * 100)}%</span>
            <input type="range" min="0.5" max="1" step="0.01" value={quality} onChange={e => setQuality(e.target.value)} className="mt-2 w-full" />
          </label>
        )}
        <button onClick={convert} className="rounded-xl bg-accent-600 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-500 min-h-[44px] min-w-[44px]">
          Convert to {ext.toUpperCase()}
        </button>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        {preview && <img src={preview} alt="Converted preview" className="max-h-72 max-w-full rounded-2xl border border-[var(--orbit-border)] object-contain" />}
        {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
      </div>
    </div>
  );
}

export function Percentage() {
  const [value, setValue] = useState('100'), [pct, setPct] = useState('20');
  const amount = num(value) * num(pct) / 100;
  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <Field label="Base value" value={value} onChange={setValue} />
        <Field label="Percentage (%)" value={pct} onChange={setPct} />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        <Result label="Percentage amount" value={`₹ ${money(amount)}`} highlight />
        <Result label="Value after increase" value={`₹ ${money(num(value) + amount)}`} />
      </div>
    </div>
  );
}

export function ImageResizer() {
  const [file, setFile] = useState(null), [width, setWidth] = useState('1200'), [height, setHeight] = useState(''), [quality] = useState('0.9'), [format] = useState('image/jpeg'), [preview, setPreview] = useState(''), [status, setStatus] = useState('');
  const resize = async () => {
    if (!file) { setStatus('Choose an image first.'); return; }
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const targetWidth = Math.max(1, Math.round(Number(width) || image.naturalWidth));
      const targetHeight = height ? Math.max(1, Math.round(Number(height))) : Math.max(1, Math.round(image.naturalHeight * targetWidth / image.naturalWidth));
      const canvas = document.createElement('canvas'); canvas.width = targetWidth; canvas.height = targetHeight;
      const ctx = canvas.getContext('2d'); if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, targetWidth, targetHeight); } ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
      const data = canvas.toDataURL(format, Number(quality)); setPreview(data);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, format, Number(quality)));
      const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
      downloadBlob(blob, 'orbitboard-image-resizer.' + ext, 'image-resizer');
      setStatus('Done — resized image downloaded.');
    } catch { setStatus('Could not resize this image.'); } finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Upload Image"
        accept="image/*"
        file={file}
        onFileSelect={f => { setFile(f); setStatus(''); }}
        onClear={() => { setFile(null); setStatus(''); }}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Width (px)" value={width} onChange={setWidth} />
        <Field label="Height (px, optional)" value={height} onChange={setHeight} placeholder="Auto from aspect ratio" />
      </div>
      <button onClick={resize} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Resize & Download</button>
      {preview && <img src={preview} alt="Resized preview" className="max-h-72 max-w-full rounded-2xl border border-[var(--orbit-border)] object-contain" />}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function SvgToPng() {
  const [input, setInput] = useState('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#111827"/><text x="400" y="235" text-anchor="middle" font-family="Arial" font-size="42" fill="white">OrbitBoard</text></svg>');
  const [scale, setScale] = useState('1'), [preview, setPreview] = useState(''), [status, setStatus] = useState('');
  const convert = async () => {
    try {
      const blob = new Blob([input], { type: 'image/svg+xml' }), url = URL.createObjectURL(blob);
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * Number(scale))); canvas.height = Math.max(1, Math.round(image.naturalHeight * Number(scale)));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/png'); setPreview(data);
      const out = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); downloadBlob(out, 'orbitboard-svg-to-png.png', 'svg-to-png'); setStatus('Done — PNG downloaded.'); URL.revokeObjectURL(url);
    } catch { setStatus('Invalid SVG or conversion failed.'); }
  };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-48 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <Field label="Scale" value={scale} onChange={setScale} />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to PNG</button>
      {preview && <img src={preview} alt="Converted PNG" className="max-h-72 max-w-full rounded-2xl border border-[var(--orbit-border)] object-contain" />}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function ImageMetadataRemover() {
  const [file, setFile] = useState(null), [format] = useState('image/jpeg'), [status, setStatus] = useState('');
  const clean = async () => {
    if (!file) { setStatus('Choose an image first.'); return; }
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(image, 0, 0); const blob = await new Promise(resolve => canvas.toBlob(resolve, format, 0.95));
      const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
      downloadBlob(blob, 'orbitboard-image-metadata-remover.' + ext, 'image-metadata-remover'); setStatus('Done — re-encoded image downloaded.');
    } catch { setStatus('Could not process this image.') } finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select Image"
        accept="image/*"
        file={file}
        onFileSelect={f => { setFile(f); setStatus('') }}
        onClear={() => { setFile(null); setStatus('') }}
      />
      <button onClick={clean} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Remove Metadata & Download</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function ImageCompressor() {
  const [file, setFile] = useState(null), [quality] = useState('0.72'), [format] = useState('image/jpeg'), [status, setStatus] = useState(''), [before, setBefore] = useState(0), [after, setAfter] = useState(0);
  const compress = async () => {
    if (!file) { setStatus('Choose an image first.'); return; }
    setBefore(file.size);
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } ctx.drawImage(image, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, format, Number(quality))); setAfter(blob.size);
      const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
      downloadBlob(blob, 'orbitboard-image-compressor.' + ext, 'image-compressor'); setStatus('Done — compressed image downloaded.');
    } catch { setStatus('Could not compress this image.'); } finally { URL.revokeObjectURL(url); }
  };
  const saved = before && after ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;

  return (
    <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-7 space-y-4">
        <FileUploadWithDrive
          label="Select Image to Compress"
          accept="image/*"
          file={file}
          onFileSelect={f => { setFile(f); setStatus('') }}
          onClear={() => { setFile(null); setStatus('') }}
        />
        <button onClick={compress} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold hover:bg-accent-500 min-h-[44px]">Compress & Download</button>
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-20 h-fit space-y-3">
        {after > 0 && (
          <div className="space-y-3">
            <Result label="Original Size" value={(before / 1024).toFixed(1) + ' KB'} />
            <Result label="Compressed Size" value={(after / 1024).toFixed(1) + ' KB'} />
            <Result label="Saved" value={saved + '%'} highlight />
          </div>
        )}
        {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
      </div>
    </div>
  );
}

export function SpreadsheetFileTool({ type }) {
  const [file, setFile] = useState(null), [text, setText] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const isJson = type === 'json-to-xlsx', isCsv = type === 'csv-to-xlsx';

  const convert = async () => {
    if (!file && !text.trim()) { setStatus(isJson ? 'Paste a JSON array first.' : 'Paste CSV or choose a file first.'); return; }
    setBusy(true); setStatus('Converting locally…');
    try {
      if (type === 'xlsx-to-csv') {
        const csv = await xlsxToCsv(file); setText(csv); setStatus('CSV generated locally.'); return;
      }
      const input = isCsv && file ? await file.text() : text;
      const bytes = isJson ? jsonToXlsx(text) : csvToXlsx(input);
      const finalSlug = isCsv ? 'csv-to-excel' : 'json-to-excel';
      const filename = `orbitboard-${finalSlug}.xlsx`;
      downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename, finalSlug);
      setStatus('Done — XLSX downloaded.');
    } catch (e) { setStatus(e.message || 'Could not convert this spreadsheet.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {type === 'xlsx-to-csv' ? (
        <FileUploadWithDrive
          label="Excel Spreadsheet (.xlsx, .xls)"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          file={file}
          onFileSelect={f => { setFile(f); setText(''); setStatus('') }}
          onClear={() => { setFile(null); setText(''); setStatus('') }}
        />
      ) : (
        <>
          {isCsv && (
            <FileUploadWithDrive
              label="CSV File"
              accept=".csv,text/csv"
              file={file}
              onFileSelect={f => { setFile(f); setText(''); setStatus('') }}
              onClear={() => { setFile(null); setText(''); setStatus('') }}
            />
          )}
          <textarea value={text} onChange={e => { setText(e.target.value); if (isCsv) setFile(null) }} placeholder={isJson ? 'Paste a JSON array of objects…' : 'Paste CSV data or choose a file…'} className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
        </>
      )}
      <button disabled={busy} onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">
        {busy ? 'Converting…' : type === 'xlsx-to-csv' ? 'Convert to CSV' : 'Convert to XLSX'}
      </button>
      {type === 'xlsx-to-csv' && text && (
        <div className="overflow-x-auto no-scrollbar">
          <textarea readOnly value={text} className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={text} filename="orbitboard-data.csv" />
        </div>
      )}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function CsvToJson() {
  const [input, setInput] = useState('name,role\nJohn Doe,Customer Success\nAlex Smith,Developer'), [output, setOutput] = useState(''), [error, setError] = useState('');
  const convert = () => { try { const rows = input.trim().split(/\r?\n/).filter(Boolean).map(row => row.split(',').map(v => v.trim())); if (rows.length < 2) throw new Error('Add a header row and data rows.'); const headers = rows[0]; setOutput(JSON.stringify(rows.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))), null, 2)); setError(''); } catch (e) { setError(e.message); setOutput(''); } };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-52 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to JSON</button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {output && (
        <div className="overflow-x-auto no-scrollbar space-y-3">
          <textarea readOnly value={output} className="w-full h-56 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
          <ExportActions content={output} filename="orbitboard-data.json" />
        </div>
      )}
    </div>
  );
}
