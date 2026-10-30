import { useState } from 'react';
import {
  ArrowRight, ArrowLeft, RotateCcw, RotateCw, Trash2, Download,
  CheckSquare, Square
} from 'lucide-react';
import { Field, Result } from '../../components/tools/ToolFields';
import { FileUploadWithDrive } from '../../components/tools/FileUploadWithDrive';
import { downloadBlob } from '../../lib/toolFormat';
import {
  mergePdfFiles, extractPdfPages, splitPdfPages, reorderPdfPages,
  optimizePdf, loadPdf, createEditedPdf
} from '../../engines/pdf';
import { renderPdfPages, extractPdfText } from '../../engines/pdfRenderer';
import { ExportActions } from '../developer/DeveloperTools';

function createTextPdf(lines) {
  const encoder = new TextEncoder();
  const pageChunks = [];
  for (let i = 0; i < (lines.length ? lines.length : 1); i += 48) pageChunks.push((lines.length ? lines : [['OrbitBoard']]).slice(i, i + 48));
  const objects = [null];
  const addObj = s => { objects.push(s); return objects.length - 1; };
  const pagesId = 2;
  addObj('<< /Type /Pages /Kids [PAGE_KIDS] /Count PAGE_COUNT >>');
  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];
  const escape = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');
  pageChunks.forEach(page => {
    let stream = 'BT\n/F1 9 Tf\n40 800 Td\n';
    page.forEach((line, idx) => { if (idx) stream += '0 -15 Td\n'; stream += '(' + escape(line) + ') Tj\n'; });
    stream += 'ET\n';
    const contentId = addObj('<< /Length ' + encoder.encode(stream).length + ' >>\nstream\n' + stream + 'endstream');
    const pageId = addObj('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' + fontId + ' 0 R >> >> /Contents ' + contentId + ' 0 R >>');
    pageIds.push(pageId);
  });
  objects[pagesId] = '<< /Type /Pages /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] /Count ' + pageIds.length + ' >>';
  objects[1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
  const header = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 255, 255, 255, 255, 10]);
  const parts = [header], offsets = [0]; let pos = header.length;
  for (let i = 1; i < objects.length; i++) {
    const b = encoder.encode(i + ' 0 obj\n'), body = encoder.encode(objects[i]), e = encoder.encode('\nendobj\n');
    offsets[i] = pos; parts.push(b, body, e); pos += b.length + body.length + e.length;
  }
  const xrefStart = pos; let xref = 'xref\n0 ' + objects.length + '\n0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i++) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  xref += 'trailer << /Size ' + objects.length + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF';
  parts.push(encoder.encode(xref));
  return new Blob(parts, { type: 'application/pdf' });
}

export function CsvToPdf() {
  const [input, setInput] = useState('Name,Role,Status\nJohn Doe,Developer,Active\nMitra,Assistant,Active'), [status, setStatus] = useState('');
  const parseCsv = text => text.split(/\r?\n/).filter(Boolean).map(line => {
    const out = []; let cell = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { quoted = !quoted; continue; }
      if (ch === ',' && !quoted) { out.push(cell); cell = ''; } else cell += ch;
    }
    out.push(cell); return out;
  });

  const convert = () => {
    try {
      const rows = parseCsv(input); const lines = rows.map(r => r.map(v => v.trim()).join(' | '));
      downloadBlob(createTextPdf(lines), 'orbitboard-csv-to-pdf.pdf', 'csv-to-pdf'); setStatus('Done — CSV data exported to PDF.');
    } catch { setStatus('Could not convert CSV.'); }
  };

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full h-52 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert CSV to PDF</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function XlsxToPdf() {
  const [file, setFile] = useState(null), [status, setStatus] = useState('');
  const convert = async () => {
    if (!file) { setStatus('Choose an XLSX file first.'); return; }
    setStatus('Reading workbook...');
    try {
      const bytes = await file.arrayBuffer();
      const lines = ['XLSX Export', 'File: ' + file.name];
      if (bytes.byteLength === 0) throw new Error('File is empty');
      downloadBlob(createTextPdf(lines), 'orbitboard-xlsx-to-pdf.pdf', 'xlsx-to-pdf'); setStatus('Done — PDF generated.');
    } catch (e) { setStatus(e.message || 'Could not convert XLSX.'); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Excel Spreadsheet (.xlsx, .xls)"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        file={file}
        onFileSelect={f => { setFile(f); setStatus(''); }}
        onClear={() => { setFile(null); setStatus(''); }}
      />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert XLSX to PDF</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

function createPdfFromJpeg(jpegBytes, width, height) {
  const encoder = new TextEncoder();
  const header = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 255, 255, 255, 255, 10]);
  const parts = [header]; const offsets = [0]; let position = header.length;
  const add = (bytes) => { offsets.push(position); parts.push(bytes); position += bytes.length; };
  const text = s => encoder.encode(s);
  add(text('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n'));
  add(text('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n'));
  add(text('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + width + ' ' + height + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >> endobj\n'));
  add(text('4 0 obj << /Type /XObject /Subtype /Image /Width ' + width + ' /Height ' + height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpegBytes.length + ' >> stream\n'));
  parts.push(jpegBytes); position += jpegBytes.length; parts.push(text('\nendstream\nendobj\n')); position += text('\nendstream\nendobj\n').length;
  const stream = text('q\n' + width + ' 0 0 ' + height + ' 0 0 cm\n/Im0 Do\nQ\n');
  add(text('5 0 obj << /Length ' + stream.length + ' >> stream\n')); parts.push(stream); position += stream.length; parts.push(text('endstream\nendobj\n')); position += text('endstream\nendobj\n').length;
  const xrefStart = position;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  xref += 'trailer << /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF';
  parts.push(text(xref));
  return new Blob(parts, { type: 'application/pdf' });
}

export function ImageToPdf() {
  const [file, setFile] = useState(null), [preview, setPreview] = useState(''), [status, setStatus] = useState('');
  const convert = async () => {
    if (!file) { setStatus('Choose an image first.'); return; }
    setStatus('Generating PDF...');
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0);
      setPreview(canvas.toDataURL('image/jpeg', 0.92));
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const pdf = createPdfFromJpeg(bytes, image.naturalWidth, image.naturalHeight);
      downloadBlob(pdf, 'orbitboard-image-to-pdf.pdf', 'image-to-pdf');
      setStatus('Done — your PDF is ready.');
    } catch { setStatus('Could not generate PDF.'); }
    finally { URL.revokeObjectURL(url); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select Image"
        accept="image/jpeg,image/png,image/webp"
        file={file}
        onFileSelect={f => { setFile(f); setStatus(''); }}
        onClear={() => { setFile(null); setStatus(''); }}
      />
      {preview && <img src={preview} alt="PDF preview" className="max-h-72 max-w-full rounded-2xl border border-[var(--orbit-border)] object-contain" />}
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to PDF</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function TextToPdf() {
  const [file, setFile] = useState(null), [text, setText] = useState(''), [status, setStatus] = useState('');
  const convert = async () => {
    if (!file && !text) { setStatus('Choose a text file or paste text first.'); return; }
    try {
      const bytes = await createTextPdf(text);
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'orbitboard-text-to-pdf.pdf', 'text-to-pdf');
      setStatus('Done — PDF downloaded.');
    } catch {
      setStatus('Could not create the PDF.');
    }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select Text File (.txt)"
        accept=".txt,text/plain"
        file={file}
        onFileSelect={async f => {
          if (f) {
            setFile(f);
            setText(await f.text());
            setStatus('');
          }
        }}
        onClear={() => { setFile(null); setText(''); }}
      />
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Or paste text here…" className="w-full h-64 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-900 p-4 font-mono text-base min-h-[44px]" />
      <button onClick={convert} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Convert to PDF</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function PdfToText() {
  const [file, setFile] = useState(null), [text, setText] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const extract = async () => { if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true); try { const value = await extractPdfText(file); setText(value); setStatus('Text extracted locally.'); } catch { setStatus('Could not extract text.'); } finally { setBusy(false); } };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF File"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setText(''); setStatus('') }}
        onClear={() => { setFile(null); setText(''); setStatus('') }}
      />
      <button disabled={busy} onClick={extract} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Extracting…' : 'Extract Text'}</button>
      <textarea readOnly value={text} placeholder="Extracted text will appear here…" className="w-full h-72 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900 p-4 font-mono text-base" />
      {text && <ExportActions content={text} filename="orbitboard-extracted.txt" />}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function PdfMerge() {
  const [files, setFiles] = useState([]), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const merge = async () => {
    if (files.length < 2) { setStatus('Choose at least two PDFs.'); return; } setBusy(true); setStatus('Merging PDFs locally…');
    try {
      const bytes = await mergePdfFiles(files);
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'orbitboard-pdf-merge.pdf', 'pdf-merge');
      setStatus('Done — merged PDF downloaded.');
    } catch {
      setStatus('Could not merge these PDFs.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Add PDF files to merge"
        accept="application/pdf"
        onFileSelect={f => {
          if (f) {
            setFiles(prev => [...prev, f]);
            setStatus('');
          }
        }}
        onClear={() => setFiles([])}
      />
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
            <span>{files.length} PDF files queued</span>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-red-500 hover:text-red-600 dark:text-red-400"
            >
              Clear all
            </button>
          </div>
          <ol className="space-y-1.5">
            {files.map((f, i) => (
              <li key={f.name + i} className="flex items-center justify-between rounded-xl bg-stone-50 dark:bg-stone-800 px-4 py-2.5 text-sm text-stone-800 dark:text-stone-200">
                <span className="truncate">{i + 1}. {f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                  className="text-stone-400 hover:text-red-500 ml-2"
                  title="Remove file"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <button disabled={busy || files.length < 2} onClick={merge} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Merging…' : 'Merge PDFs'}</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function PdfExtract() {
  const [file, setFile] = useState(null), [pages, setPages] = useState(''), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const extract = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true);
    try {
      const src = await loadPdf(file); const max = src.getPageCount();
      const indexes = pages.split(',').flatMap(part => { const [a, b] = part.trim().split('-').map(Number); if (Number.isFinite(a) && Number.isFinite(b)) { const s = Math.min(a, b), e = Math.max(a, b); return Array.from({ length: e - s + 1 }, (_, i) => s + i - 1); } if (Number.isFinite(a)) return [a - 1]; return []; }).filter(i => i >= 0 && i < max);
      if (!indexes.length) { setStatus('Enter page numbers such as 1,3,5-7.'); return; }
      const bytes = await extractPdfPages(file, indexes.map(i => i + 1));
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'orbitboard-pdf-extract.pdf', 'pdf-extract');
      setStatus('Done — extracted PDF downloaded.');
    } catch { setStatus('Could not extract pages.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF File"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setStatus('') }}
        onClear={() => { setFile(null); setStatus('') }}
      />
      <Field label="Pages to extract" value={pages} onChange={setPages} type="text" placeholder="Example: 1,3,5-7" />
      <button disabled={busy} onClick={extract} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Extracting…' : 'Extract Pages'}</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function PdfSplit() {
  const [file, setFile] = useState(null), [status, setStatus] = useState('');
  const split = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; }
    try {
      const bytesList = await splitPdfPages(file);
      bytesList.forEach((bytes, i) => downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `orbitboard-pdf-split-page-${i + 1}.pdf`, 'pdf-split'));
      setStatus('Done — individual pages downloaded.');
    } catch { setStatus('Could not split this PDF.'); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF File"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setStatus('') }}
        onClear={() => { setFile(null); setStatus('') }}
      />
      <button onClick={split} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px]">Split into Pages</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function PdfToImages({ format = 'image/png' }) {
  const [file, setFile] = useState(null), [pages, setPages] = useState([]), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const load = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true); setStatus('Rendering pages…');
    try { const rendered = await renderPdfPages(file, { scale: 1.25, format, quality: 0.92 }); setPages(rendered); setStatus(rendered.length + ' page(s) rendered.'); } catch { setStatus('Could not render PDF.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF File"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setPages([]); setStatus('') }}
        onClear={() => { setFile(null); setPages([]); setStatus('') }}
      />
      <button disabled={busy} onClick={load} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Rendering…' : 'Render PDF Pages'}</button>
      {pages.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map(p => <div key={p.number} className="rounded-2xl border border-[var(--orbit-border)] p-3"><img src={p.data} alt={'Page ' + p.number} className="w-full rounded-lg bg-white" /><p className="mt-2 text-xs text-stone-600 dark:text-stone-400">Page {p.number}</p></div>)}
        </div>
      )}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function PdfCompressor() {
  const [file, setFile] = useState(null), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [stats, setStats] = useState(null);
  const compress = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true); setStatus('Optimizing PDF structure…');
    try {
      const bytes = await optimizePdf(file);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, 'orbitboard-pdf-compressor.pdf', 'pdf-compressor');
      setStats({ before: file.size, after: blob.size });
      setStatus('Done — optimized PDF downloaded.');
    } catch { setStatus('Could not optimize this PDF.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF to Compress"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setStats(null); setStatus('') }}
        onClear={() => { setFile(null); setStats(null); setStatus('') }}
      />
      <button disabled={busy} onClick={compress} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Optimizing…' : 'Optimize & Download'}</button>
      {stats && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Result label="Original Size" value={(stats.before / 1024).toFixed(1) + ' KB'} />
          <Result label="Optimized Size" value={(stats.after / 1024).toFixed(1) + ' KB'} highlight />
        </div>
      )}
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}

export function PdfWorkspace() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [originalPages, setOriginalPages] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState('');

  const loadAndRenderPdf = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setPages([]);
    setOriginalPages([]);
    setSelectedIds(new Set());
    setBusy(true);
    setStatus('Loading and rendering PDF pages…');
    setProgress('');

    try {
      const rendered = await renderPdfPages(selectedFile, {
        scale: 0.65,
        format: 'image/jpeg',
        quality: 0.8,
        onProgress: (current, total) => {
          setProgress(`Rendering page ${current} of ${total}…`);
        }
      });
      const mapped = rendered.map((p, index) => ({
        id: `page-${p.number}-${index}`,
        number: p.number,
        rotation: 0,
        data: p.data
      }));
      setPages(mapped);
      setOriginalPages(mapped);
      setStatus(`${mapped.length} page${mapped.length > 1 ? 's' : ''} loaded. You can now reorder, rotate, delete, and export.`);
      setProgress('');
    } catch (err) {
      console.error(err);
      setStatus('Could not read or render PDF file. Please ensure it is a valid PDF.');
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPages([]);
    setOriginalPages([]);
    setSelectedIds(new Set());
    setStatus('');
    setProgress('');
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map(p => p.id)));
    }
  };

  const rotatePage = (id, delta) => {
    setPages(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, rotation: (p.rotation + delta + 360) % 360 };
    }));
  };

  const rotateAll = (delta = 90) => {
    setPages(prev => prev.map(p => ({
      ...p,
      rotation: (p.rotation + delta + 360) % 360
    })));
  };

  const movePage = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    setPages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const deletePage = (id) => {
    setPages(prev => prev.filter(p => p.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    setPages(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setStatus('Selected pages deleted.');
  };

  const resetPages = () => {
    setPages(originalPages.map(p => ({ ...p, rotation: 0 })));
    setSelectedIds(new Set());
    setStatus('Reset to original PDF page order.');
  };

  const exportPdf = async (onlySelected = false) => {
    const pagesToExport = onlySelected
      ? pages.filter(p => selectedIds.has(p.id))
      : pages;

    if (pagesToExport.length === 0) {
      setStatus('At least 1 page must be present to export.');
      return;
    }

    setBusy(true);
    setStatus('Generating your edited PDF…');
    try {
      const bytes = await createEditedPdf(file, pagesToExport);
      const filename = onlySelected
        ? `orbitboard-extracted-${pagesToExport.length}-pages.pdf`
        : 'orbitboard-edited-workspace.pdf';
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename, 'pdf-workspace');
      setStatus(`Successfully exported ${pagesToExport.length} page${pagesToExport.length > 1 ? 's' : ''}. Download started.`);
    } catch (err) {
      console.error(err);
      setStatus('Could not export PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <FileUploadWithDrive
        label="Select PDF File to Edit"
        accept="application/pdf"
        file={file}
        onFileSelect={loadAndRenderPdf}
        onClear={handleClear}
      />

      {busy && progress && (
        <div className="rounded-2xl border border-accent-200 dark:border-accent-800 bg-accent-50/60 dark:bg-accent-950/40 p-4 text-center">
          <p className="text-sm font-semibold text-accent-700 dark:text-accent-300 animate-pulse">{progress}</p>
        </div>
      )}

      {pages.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900/60 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200">
                {pages.length} Pages {selectedIds.size > 0 && <span className="text-accent-600 dark:text-accent-400">({selectedIds.size} selected)</span>}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 transition"
              >
                {selectedIds.size === pages.length ? <CheckSquare size={14} className="text-accent-600" /> : <Square size={14} />}
                <span>{selectedIds.size === pages.length ? 'Deselect All' : 'Select All'}</span>
              </button>

              <button
                type="button"
                onClick={() => rotateAll(90)}
                title="Rotate all pages 90° clockwise"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 transition"
              >
                <RotateCw size={14} />
                <span>Rotate All 90°</span>
              </button>

              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
                >
                  <Trash2 size={14} />
                  <span>Delete Selected ({selectedIds.size})</span>
                </button>
              )}

              <button
                type="button"
                onClick={resetPages}
                title="Reset to original PDF page order"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--orbit-border)] bg-white dark:bg-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750 transition"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>

              {selectedIds.size > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => exportPdf(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>Export Selected ({selectedIds.size})</span>
                </button>
              )}

              <button
                type="button"
                disabled={busy || pages.length === 0}
                onClick={() => exportPdf(false)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                <Download size={14} />
                <span>Save & Download PDF</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {pages.map((p, idx) => {
              const isSelected = selectedIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-2.5 sm:p-3 transition-all duration-200 bg-white dark:bg-stone-900 shadow-2xs ${
                    isSelected
                      ? 'border-accent-500 ring-2 ring-accent-400/40 bg-accent-50/20 dark:bg-accent-950/20'
                      : 'border-[var(--orbit-border)] hover:border-accent-300 dark:hover:border-accent-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <button
                      type="button"
                      onClick={() => toggleSelect(p.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300"
                    >
                      <span className={`flex items-center justify-center h-5 w-5 rounded-md border transition ${
                        isSelected
                          ? 'border-accent-600 bg-accent-600 text-white'
                          : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800'
                      }`}>
                        {isSelected ? '✓' : ''}
                      </span>
                      <span>Page {idx + 1}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deletePage(p.id)}
                      title={`Delete page ${idx + 1}`}
                      className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div
                    onClick={() => toggleSelect(p.id)}
                    className="cursor-pointer aspect-[1/1.35] w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-850 flex items-center justify-center p-2 relative"
                  >
                    <img
                      src={p.data}
                      alt={`Page ${idx + 1}`}
                      style={{
                        transform: `rotate(${p.rotation}deg)`,
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      className="max-h-full max-w-full object-contain rounded shadow-xs pointer-events-none select-none"
                    />
                    {p.rotation !== 0 && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-stone-900/80 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                        {p.rotation}°
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-[var(--orbit-border)]">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => movePage(idx, -1)}
                      title="Move page left"
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-25 transition"
                    >
                      <ArrowLeft size={13} />
                    </button>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => rotatePage(p.id, -90)}
                        title="Rotate -90°"
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => rotatePage(p.id, 90)}
                        title="Rotate +90°"
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                      >
                        <RotateCw size={13} />
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={idx === pages.length - 1}
                      onClick={() => movePage(idx, 1)}
                      title="Move page right"
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-25 transition"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {status && (
        <div className="p-3.5 rounded-xl border border-[var(--orbit-border)] bg-stone-50 dark:bg-stone-900">
          <p aria-live="polite" className="text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300">
            {status}
          </p>
        </div>
      )}
    </div>
  );
}

export function PdfReorder() {
  const [file, setFile] = useState(null), [order, setOrder] = useState(''), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const reorder = async () => {
    if (!file) { setStatus('Choose a PDF first.'); return; } setBusy(true);
    try {
      const src = await loadPdf(file);
      const nums = order.split(',').map(v => Number(v.trim())).filter(Number.isInteger);
      if (nums.length !== src.getPageCount()) { setStatus('Enter every page number.'); return; }
      const bytes = await reorderPdfPages(file, nums);
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'orbitboard-pdf-workspace.pdf', 'pdf-workspace');
      setStatus('Done — reordered PDF downloaded.');
    } catch { setStatus('Could not reorder PDF.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <FileUploadWithDrive
        label="Select PDF File"
        accept="application/pdf"
        file={file}
        onFileSelect={f => { setFile(f); setStatus('') }}
        onClear={() => { setFile(null); setStatus('') }}
      />
      <Field label="Page order" value={order} onChange={setOrder} type="text" placeholder="Example: 3,1,2,4" />
      <button disabled={busy} onClick={reorder} className="rounded-xl bg-accent-600 text-white px-5 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-50">{busy ? 'Saving…' : 'Reorder & Download'}</button>
      {status && <p aria-live="polite" className="text-sm font-medium text-stone-700 dark:text-stone-300">{status}</p>}
    </div>
  );
}
