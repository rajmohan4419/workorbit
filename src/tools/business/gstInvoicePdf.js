import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { amountToWords, calcItem, validateInvoice } from './gstInvoiceEngine.js';
const money = n => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** PDF uses the same validated totals and supply decision as the editor. No network/fonts fetched. */
export async function generateInvoicePDF(input) {
  const { seller, buyer, meta, items, notes = '', signatory = '' } = input;
  const validation = validateInvoice(input);
  if (validation.errors.length) throw new Error(validation.errors.join('\n'));
  const { totals, isInterState } = validation;
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  // Helvetica supports WinAnsi only. Stop before writing rather than silently changing user text.
  const check = (value, label) => {
    if (value == null) return;
    try { regular.encodeText(String(value).replace(/[\r\n]/g, ' ')); }
    catch { throw new Error(`${label} contains characters unsupported by this PDF font. Use Latin/WinAnsi text in this field, or save the browser preview as PDF with a suitable local font.`); }
  };
  for (const [label, object] of [['Seller', seller], ['Buyer', buyer], ['Invoice details', meta]]) for (const [key, value] of Object.entries(object)) if (key !== 'logo') check(value, `${label} ${key}`);
  items.forEach((item, i) => { check(item.description, `Row ${i + 1} description`); check(item.hsn, `Row ${i + 1} HSN`); check(item.unit, `Row ${i + 1} unit`); });
  check(notes, 'Notes'); check(signatory, 'Signatory');
  const ink = rgb(.12,.12,.16), indigo = rgb(.28,.25,.75), white = rgb(1,1,1);
  let page, y;
  function text(value, x, at, size = 9, font = regular, color = ink) { page.drawText(String(value ?? ''), { x, y: at, size, font, color }); }
  function wrap(value, width, size = 9, font = regular) {
    const lines = [];
    for (const paragraph of String(value ?? '').replaceAll('\r', '').split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) { line = next; continue; }
        if (line) { lines.push(line); line = ''; }
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, size) > width && line) { lines.push(line); line = ''; }
          line += char;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  function newPage() {
    page = doc.addPage([595,842]); y = 785;
    page.drawRectangle({ x: 30, y: 802, width: 535, height: 24, color: indigo });
    text('TAX INVOICE', 38, 810, 11, bold, white);
    text(`Page ${doc.getPageCount()}`, 505, 810, 8, regular, white);
    text('Generated locally by OrbitBoard', 30, 20, 7);
  }
  function ensure(height) { if (y - height < 45) newPage(); }
  function block(value, size = 9, font = regular) {
    for (const line of wrap(value, 530, size, font)) { ensure(size + 6); text(line, 30, y, size, font); y -= size + 5; }
    y -= 4;
  }
  newPage();
  block(seller.companyName, 16, bold);
  block(`Invoice: ${meta.invoiceNumber}    Date: ${meta.invoiceDate}    Due: ${meta.dueDate || '-'}`);
  block(`Seller GSTIN: ${seller.gstin}    PAN: ${seller.pan || '-'}`);
  block([seller.address, seller.city, seller.state, seller.pin].filter(Boolean).join(', '));
  block([seller.phone, seller.email].filter(Boolean).join(' | '));
  if (seller.logo?.startsWith('data:image/')) {
    try {
      const data = Uint8Array.from(atob(seller.logo.split(',')[1]), c => c.charCodeAt(0));
      const logo = seller.logo.startsWith('data:image/png') ? await doc.embedPng(data) : await doc.embedJpg(data);
      ensure(48); const size = logo.scaleToFit(70,40); page.drawImage(logo, { x:30, y:y-40, ...size }); y -= 48;
    } catch { throw new Error('Logo cannot be embedded. Upload a valid PNG or JPEG, or remove it before export.'); }
  }
  block(`Bill to: ${buyer.name}`, 11, bold);
  block([buyer.address, buyer.city, buyer.state, buyer.pin].filter(Boolean).join(', '));
  block(`Buyer GSTIN: ${buyer.gstin || 'Not supplied'}    ${[buyer.phone, buyer.email].filter(Boolean).join(' | ')}`);
  block(`Place of supply: ${meta.placeOfSupply}    ${isInterState ? 'Inter-state / IGST' : 'Intra-state / CGST + SGST'}`);
  if (meta.poReference) block(`PO reference: ${meta.poReference}`);
  block('Scope: ordinary domestic supply. Explicit place of supply determines tax split. GSTIN checks are local only; no government verification.', 8);
  validation.warnings.forEach(w => block(`Review: ${w}`, 8));
  const columns = [
    { title:'#', width:24 }, { title:'Description', width:135 }, { title:'HSN', width:48 }, { title:'Qty/unit', width:49 },
    { title:'Rate', width:58 }, { title:'Taxable', width:65 }, { title:'GST%', width:31 }, { title:'Tax', width:56 }, { title:'Amount', width:69 },
  ];
  const starts = []; let x = 30; columns.forEach(c => { starts.push(x); x += c.width; });
  function tableHeader() {
    ensure(35); page.drawRectangle({ x:30, y:y-5, width:535, height:19, color:indigo });
    columns.forEach((c,i) => text(c.title, starts[i]+3, y+1, 7, bold, white)); y -= 23;
  }
  tableHeader();
  items.forEach((item, index) => {
    const c = calcItem(item, isInterState);
    const cells = [index+1, item.description, item.hsn, `${item.qty} ${item.unit}`, money(item.rate), money(c.taxable), item.gstRate, money(c.totalTax), money(c.total)];
    const lines = cells.map((value, i) => wrap(value, columns[i].width-6, 7));
    const count = Math.max(...lines.map(l => l.length));
    if (count * 11 + 6 <= 700 && y - (count * 11 + 6) < 58) { newPage(); tableHeader(); }
    for (let line = 0; line < count; line++) {
      if (y < 58) { newPage(); tableHeader(); }
      if (index % 2 === 0) page.drawRectangle({ x:30, y:y-3, width:535, height:11, color:rgb(.96,.96,.99) });
      lines.forEach((values,i) => text(values[line] || '', starts[i]+3, y, 7, i === 8 ? bold : regular)); y -= 11;
    }
    y -= 6;
  });
  // Keep totals together, with space for words. Further notes paginate in full.
  ensure(190); y -= 12;
  for (const [label, value] of [
    ['Subtotal',totals.subtotal], ['Discount',totals.totalDiscount], ['Taxable',totals.taxableAmount],
    ...(isInterState ? [['IGST',totals.igst]] : [['CGST',totals.cgst],['SGST',totals.sgst]]), ['Round off',totals.roundOff], ['Grand total',totals.grandTotal],
  ]) { text(label,330,y,10,bold); const v = `Rs. ${money(value)}`; text(v,560-bold.widthOfTextAtSize(v,10),y,10,bold); y -= 17; }
  y -= 10; block(`Amount in words: ${amountToWords(totals.grandTotal)}`, 9);
  if (notes) { block('Notes / terms',10,bold); block(notes); }
  ensure(120); block('Bank details',10,bold);
  block(`Bank: ${seller.bankName || '-'} | Account: ${seller.accountNo || '-'} | IFSC: ${seller.ifsc || '-'} | UPI: ${seller.upiId || '-'}`);
  ensure(65); y -= 25;
  page.drawLine({ start:{ x:330,y }, end:{ x:560,y }, thickness:.5, color:ink }); y -= 14;
  // Wrap full signature without clipping long names.
  for (const line of wrap(`Authorised signatory: ${signatory || '-'}`, 230, 8)) { ensure(12); text(line,330,y,8); y -= 12; }
  return new Blob([await doc.save()], { type:'application/pdf' });
}
