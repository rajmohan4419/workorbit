import { useState } from 'react';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PdfESign() {
  const [file, setFile] = useState(null);
  const [signature, setSignature] = useState('John Doe');
  const [page, setPage] = useState('1');
  const [position, setPosition] = useState('bottom-right');
  const [size, setSize] = useState('18');
  const [status, setStatus] = useState('');

  const sign = async () => {
    if (!file) {
      setStatus('Choose a PDF first.');
      return;
    }

    setStatus('Adding signature...');
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const pages = pdf.getPages();
      const pageIndex = Math.max(0, Math.min(pages.length - 1, Number(page) - 1));
      const target = pages[pageIndex];
      const font = await pdf.embedFont(StandardFonts.HelveticaOblique);
      const fontSize = Math.max(8, Math.min(72, Number(size) || 18));
      const textWidth = font.widthOfTextAtSize(signature || 'Signature', fontSize);
      const { width, height } = target.getSize();
      const margin = 36;
      const positions = {
        'top-left': [margin, height - margin - fontSize],
        'top-center': [(width - textWidth) / 2, height - margin - fontSize],
        'top-right': [width - margin - textWidth, height - margin - fontSize],
        'middle-left': [margin, (height - fontSize) / 2],
        'middle-center': [(width - textWidth) / 2, (height - fontSize) / 2],
        'middle-right': [width - margin - textWidth, (height - fontSize) / 2],
        'bottom-left': [margin, margin],
        'bottom-center': [(width - textWidth) / 2, margin],
        'bottom-right': [width - margin - textWidth, margin],
      };
      const [x, y] = positions[position];
      target.drawText(signature || 'Signature', { x, y, size: fontSize, font, color: rgb(0.15, 0.15, 0.15) });

      const output = await pdf.save();
      downloadBlob(new Blob([output], { type: 'application/pdf' }), (file.name.replace(/\.pdf$/i, '') || 'document') + '-signed.pdf');
      setStatus('Done — the signed PDF was downloaded.');
    } catch (error) {
      console.error(error);
      setStatus('Could not sign this PDF. Try another document.');
    }
  };

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="text-xs font-medium text-slate-400">PDF file</span>
        <input type="file" accept="application/pdf,.pdf" onChange={e => { setFile(e.target.files?.[0] || null); setStatus(''); }} className="mt-2 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm" />
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Signature name</span>
          <input value={signature} onChange={e => setSignature(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Page number</span>
          <input type="number" min="1" value={page} onChange={e => setPage(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Position</span>
          <select value={position} onChange={e => setPosition(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
            {['top-left','top-center','top-right','middle-left','middle-center','middle-right','bottom-left','bottom-center','bottom-right'].map(item => <option key={item} value={item}>{item.replace('-', ' ')}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-400">Signature size</span>
          <input type="number" min="8" max="72" value={size} onChange={e => setSize(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm" />
        </label>
      </div>

      <button type="button" onClick={sign} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold hover:bg-violet-500">Add signature & download</button>
      {status && <p aria-live="polite" className="text-sm text-slate-400">{status}</p>}

      <p className="text-xs text-slate-500">This adds a visible signature mark to the PDF locally in your browser. It is not a cryptographic digital signature or a certificate-based signature.</p>
    </div>
  );
}
