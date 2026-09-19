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
