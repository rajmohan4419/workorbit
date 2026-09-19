import { PDFDocument } from 'pdf-lib';

export async function loadPdf(file) {
  return PDFDocument.load(await file.arrayBuffer());
}

export async function mergePdfFiles(files) {
  const output = await PDFDocument.create();
  for (const file of files) {
    const source = await loadPdf(file);
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach(page => output.addPage(page));
  }
  return output.save();
}

export async function extractPdfPages(file, pageNumbers) {
  const source = await loadPdf(file);
  const output = await PDFDocument.create();
  const indexes = pageNumbers.map(number => number - 1);
  const pages = await output.copyPages(source, indexes);
  pages.forEach(page => output.addPage(page));
  return output.save();
}

export async function splitPdfPages(file) {
  const source = await loadPdf(file);
  const results = [];
  for (let index = 0; index < source.getPageCount(); index += 1) {
    const output = await PDFDocument.create();
    const [page] = await output.copyPages(source, [index]);
    output.addPage(page);
    results.push(await output.save());
  }
  return results;
}

export async function reorderPdfPages(file, pageOrder) {
  const source = await loadPdf(file);
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, pageOrder.map(number => number - 1));
  pages.forEach(page => output.addPage(page));
  return output.save();
}

export async function createTextPdf(text) {
  const output = await PDFDocument.create();
  const pageWidth = 595, pageHeight = 842, margin = 42, fontSize = 10, lineHeight = 14;
  let page = output.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  const font = await output.embedFont('Helvetica');
  const lines = String(text).split(/\r?\n/);
  for (const line of lines) {
    if (y < margin) { page = output.addPage([pageWidth, pageHeight]); y = pageHeight - margin; }
    page.drawText(line.slice(0, 110), { x: margin, y, size: fontSize, font });
    y -= lineHeight;
  }
  return output.save();
}

export async function optimizePdf(file) {
  const source = await loadPdf(file);
  return source.save({ useObjectStreams: true, addDefaultPage: false });
}

export async function createEditedPdf(file, pages) {
  const source = await loadPdf(file);
  const output = await PDFDocument.create();
  const indexes = pages.map(page => page.number - 1);
  const copied = await output.copyPages(source, indexes);
  copied.forEach((page, index) => {
    page.setRotation({ angle: pages[index].rotation });
    output.addPage(page);
  });
  return output.save();
}
