import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Building2, FileText } from 'lucide-react';
import { downloadBlob } from '../../lib/toolFormat';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ─── Constants ───────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir',
  'Ladakh', 'Chandigarh', 'Dadra & Nagar Haveli', 'Daman & Diu', 'Lakshadweep',
  'Puducherry', 'Andaman & Nicobar Islands',
];

const UNITS = ['Nos', 'Kg', 'Hr', 'Ltr', 'Mtr', 'Pcs', 'Set', 'Box', 'Day', 'Month'];
const GST_RATES = [0, 5, 12, 18, 28];
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const SELLER_KEY = 'orbitboard:gst-seller';
const INVOICE_NUM_KEY = 'orbitboard:gst-invoice-num';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inr(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextInvoiceNum() {
  const prev = parseInt(localStorage.getItem(INVOICE_NUM_KEY) || '0', 10);
  const next = prev + 1;
  localStorage.setItem(INVOICE_NUM_KEY, String(next));
  return `INV-${String(next).padStart(4, '0')}`;
}

// ─── Amount in Words (Indian System) ─────────────────────────────────────────

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWords(n) {
  if (n === 0) return 'Zero';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
  return '';
}

function amountToWords(amount) {
  const n = Math.round(Number(amount) || 0);
  if (n === 0) return 'Zero Rupees Only';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thou = Math.floor((n % 100000) / 1000);
  const rem = n % 1000;

  let words = '';
  if (crore) words += numToWords(crore) + ' Crore ';
  if (lakh) words += numToWords(lakh) + ' Lakh ';
  if (thou) words += numToWords(thou) + ' Thousand ';
  if (rem) words += numToWords(rem);

  return words.trim() + ' Rupees Only';
}

// ─── Default State Factories ──────────────────────────────────────────────────

function defaultSeller() {
  try {
    const saved = JSON.parse(localStorage.getItem(SELLER_KEY) || 'null');
    if (saved) return saved;
  } catch {
    /* ignore localStorage parse error */
  }
  return {
    companyName: '', logo: '', address: '', city: '', state: 'Maharashtra',
    pin: '', gstin: '', pan: '', phone: '', email: '',
    bankName: '', accountNo: '', ifsc: '', upiId: '',
  };
}

function defaultBuyer() {
  return {
    name: '', address: '', city: '', state: 'Maharashtra',
    pin: '', gstin: '', phone: '', email: '',
  };
}

function defaultMeta() {
  const invDate = today();
  return {
    invoiceNumber: nextInvoiceNum(),
    invoiceDate: invDate,
    dueDate: addDays(invDate, 30),
    poReference: '',
    placeOfSupply: 'Maharashtra',
  };
}

function defaultItem(id) {
  return {
    id,
    description: '',
    hsn: '',
    qty: 1,
    unit: 'Nos',
    rate: 0,
    discount: 0,
    gstRate: 18,
  };
}

// ─── Line Item Calculation ────────────────────────────────────────────────────

function calcItem(item, isInterState) {
  const qty = Number(item.qty) || 0;
  const rate = Number(item.rate) || 0;
  const disc = Number(item.discount) || 0;
  const gross = qty * rate;
  const discAmt = gross * (disc / 100);
  const taxable = gross - discAmt;
  const gstRate = Number(item.gstRate) || 0;

  let cgst = 0, sgst = 0, igst = 0;
  if (isInterState) {
    igst = taxable * (gstRate / 100);
  } else {
    cgst = taxable * (gstRate / 100 / 2);
    sgst = taxable * (gstRate / 100 / 2);
  }
  const total = taxable + cgst + sgst + igst;
  return { gross, discAmt, taxable, cgst, sgst, igst, total };
}

// ─── Input Components ─────────────────────────────────────────────────────────

function Field({ label, children, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white ${className}`}
      {...props}
    />
  );
}

function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white resize-none ${className}`}
      {...props}
    />
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-indigo-50 border-b border-indigo-100">
        {Icon && <Icon size={16} className="text-indigo-600" />}
        <h2 className="text-sm font-semibold text-indigo-800">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── PDF Generation ───────────────────────────────────────────────────────────


function sanitizeForPdf(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/₹/g, 'Rs. ')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, '*')
    .split('')
    .map(c => {
      const code = c.charCodeAt(0);
      return (code >= 32 && code <= 255) || code === 10 || code === 13 ? c : ' ';
    })
    .join('');
}

async function generatePDF({ seller, buyer, meta, items, totals, notes, signatory, isInterState }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const indigo = rgb(0.31, 0.275, 0.898);
  const dark = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.45, 0.45, 0.45);
  const white = rgb(1, 1, 1);
  const amber = rgb(0.98, 0.7, 0.1);

  const drawLeft = (text, leftX, yPos, font, size, color) => {
    const s = sanitizeForPdf(String(text ?? ''));
    if (!s) return;
    page.drawText(s, { x: leftX, y: yPos, font, size, color });
  };

  const drawRight = (text, rightX, yPos, font, size, color) => {
    const s = sanitizeForPdf(String(text ?? ''));
    if (!s) return;
    const textWidth = font.widthOfTextAtSize(s, size);
    page.drawText(s, { x: rightX - textWidth, y: yPos, font, size, color });
  };

  // 1. Header band
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: indigo });

  // Company Name & details (Left)
  drawLeft(seller.companyName || 'Company Name', 30, height - 38, fontBold, 18, white);
  drawLeft(`GSTIN: ${seller.gstin || '-'}  |  PAN: ${seller.pan || '-'}`, 30, height - 54, fontReg, 8.5, rgb(0.85, 0.85, 1));
  const contactParts = [seller.phone, seller.email].filter(Boolean).join('  |  ');
  if (contactParts) {
    drawLeft(contactParts, 30, height - 66, fontReg, 8.5, rgb(0.85, 0.85, 1));
  }

  // TAX INVOICE label & invoice meta (Right-aligned to width - 30)
  drawRight('TAX INVOICE', width - 30, height - 38, fontBold, 13, amber);
  drawRight(`No: ${meta.invoiceNumber}`, width - 30, height - 53, fontReg, 8.5, white);
  drawRight(`Date: ${meta.invoiceDate}`, width - 30, height - 65, fontReg, 8.5, white);

  if (seller.logo && seller.logo.startsWith('data:image/')) {
    try {
      const base64Data = seller.logo.split(',')[1];
      const binaryStr = atob(base64Data);
      const imgBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        imgBytes[i] = binaryStr.charCodeAt(i);
      }
      const isPng = seller.logo.startsWith('data:image/png');
      const img = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
      const scaled = img.scaleToFit(50, 45);
      page.drawImage(img, {
        x: width - 210,
        y: height - 68,
        width: scaled.width,
        height: scaled.height,
      });
    } catch {
      /* ignore invalid logo data */
    }
  }

  // 2. Seller Address line (below banner, accounts for multi-line textarea)
  let y = height - 96;

  const sellerAddrLines = [];
  if (seller.address) {
    seller.address.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => sellerAddrLines.push(l));
  }
  const sellerCityStatePin = [
    seller.city,
    seller.pin ? `- ${seller.pin}` : '',
    seller.state
  ].filter(Boolean).join(' ');
  if (sellerCityStatePin) sellerAddrLines.push(sellerCityStatePin);

  sellerAddrLines.forEach(line => {
    drawLeft(line, 30, y, fontReg, 8, gray);
    y -= 11;
  });

  y -= 4;
  // Clean divider
  page.drawLine({ start: { x: 30, y }, end: { x: width - 30, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 15;

  // 3. Bill To (Left) & Invoice Details (Right)
  const billToStartY = y;

  drawLeft('BILL TO', 30, y, fontBold, 9, indigo);
  let buyerY = y - 13;

  drawLeft(buyer.name || '-', 30, buyerY, fontBold, 9.5, dark);
  buyerY -= 12;

  const buyerAddrLines = [];
  if (buyer.address && buyer.address !== '-') {
    buyer.address.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
      if (l !== '-') buyerAddrLines.push(l);
    });
  }
  const buyerCityStatePin = [
    buyer.city,
    buyer.pin ? `- ${buyer.pin}` : '',
    buyer.state
  ].filter(Boolean).join(' ');
  if (buyerCityStatePin) buyerAddrLines.push(buyerCityStatePin);
  if (buyer.gstin) buyerAddrLines.push(`GSTIN: ${buyer.gstin}`);
  if (buyer.phone) buyerAddrLines.push(`Phone: ${buyer.phone}`);

  buyerAddrLines.forEach(line => {
    drawLeft(line, 30, buyerY, fontReg, 8, dark);
    buyerY -= 11;
  });

  // Invoice Details on the right
  let metaY = billToStartY;
  drawLeft('INVOICE DETAILS', 340, metaY, fontBold, 9, indigo);
  metaY -= 13;

  const metaLines = [
    ['Due Date', meta.dueDate || '-'],
    ['PO Ref', meta.poReference || '-'],
    ['Place of Supply', meta.placeOfSupply || '-'],
    ['Supply Type', isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'],
  ];

  metaLines.forEach(([k, v]) => {
    drawLeft(`${k}:`, 340, metaY, fontBold, 8, gray);
    drawLeft(String(v), 425, metaY, fontReg, 8, dark);
    metaY -= 12;
  });

  y = Math.min(buyerY, metaY) - 16;

  // 4. Items Table Header
  page.drawRectangle({ x: 30, y: y - 3, width: width - 60, height: 16, color: indigo });
  const hdrY = y + 3;

  // Table columns: # (left), Desc (left), HSN (left), Qty (right), Rate (right), Taxable (right), GST% (right), Tax (right), Amount (right)
  drawLeft('#', 34, hdrY, fontBold, 7.5, white);
  drawLeft('Description', 52, hdrY, fontBold, 7.5, white);
  drawLeft('HSN', 170, hdrY, fontBold, 7.5, white);
  drawRight('Qty', 245, hdrY, fontBold, 7.5, white);
  drawRight('Rate (Rs)', 305, hdrY, fontBold, 7.5, white);
  drawRight('Taxable', 370, hdrY, fontBold, 7.5, white);
  drawRight('GST%', 410, hdrY, fontBold, 7.5, white);
  drawRight(isInterState ? 'IGST' : 'CGST+SGST', 480, hdrY, fontBold, 7.5, white);
  drawRight('Amount (Rs)', 560, hdrY, fontBold, 7.5, white);

  y -= 17;

  // Item rows
  items.forEach((item, idx) => {
    const calc = calcItem(item, isInterState);
    const rowColor = idx % 2 === 0 ? rgb(0.98, 0.98, 1) : white;
    page.drawRectangle({ x: 30, y: y - 4, width: width - 60, height: 15, color: rowColor });

    const ry = y + 2;
    drawLeft(String(idx + 1), 34, ry, fontReg, 7, dark);
    drawLeft((item.description || '').slice(0, 24), 52, ry, fontReg, 7, dark);
    drawLeft(item.hsn || '-', 170, ry, fontReg, 7, dark);
    drawRight(`${item.qty} ${item.unit}`, 245, ry, fontReg, 7, dark);
    drawRight(inr(item.rate), 305, ry, fontReg, 7, dark);
    drawRight(inr(calc.taxable), 370, ry, fontReg, 7, dark);
    drawRight(`${item.gstRate}%`, 410, ry, fontReg, 7, dark);
    const taxAmt = isInterState ? calc.igst : (calc.cgst + calc.sgst);
    drawRight(inr(taxAmt), 480, ry, fontReg, 7, dark);
    drawRight(inr(calc.total), 560, ry, fontBold, 7, dark);

    y -= 15;
  });

  // 5. Totals
  y -= 6;
  page.drawLine({ start: { x: 30, y }, end: { x: width - 30, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 14;

  const totalsRows = [
    ['Subtotal', inr(totals.subtotal)],
    ...(totals.totalDiscount > 0 ? [['Total Discount', `- Rs. ${inr(totals.totalDiscount)}`]] : []),
    ['Taxable Amount', inr(totals.taxableAmount)],
    ...(isInterState
      ? [['IGST', inr(totals.igst)]]
      : [['CGST', inr(totals.cgst)], ['SGST', inr(totals.sgst)]]),
    ['Round Off', (totals.roundOff >= 0 ? '+' : '') + inr(totals.roundOff)],
  ];

  totalsRows.forEach(([k, v]) => {
    drawLeft(k, 370, y, fontReg, 8, gray);
    drawRight(v, 560, y, fontBold, 8, dark);
    y -= 13;
  });

  // Grand Total band - ample breathing space, perfectly right-aligned
  y -= 5;
  page.drawRectangle({ x: 350, y: y - 5, width: width - 380, height: 22, color: indigo });
  drawLeft('GRAND TOTAL', 362, y + 2, fontBold, 9.5, white);
  drawRight(`Rs. ${inr(totals.grandTotal)}`, 560, y + 2, fontBold, 10, amber);
  y -= 25;

  // Amount in words
  drawLeft(`Amount in Words: ${amountToWords(totals.grandTotal)}`, 30, y, fontReg, 7.5, dark);
  y -= 18;

  // Notes
  if (notes) {
    drawLeft('Notes / Terms:', 30, y, fontBold, 8, indigo);
    y -= 12;
    const noteLines = notes.match(/.{1,90}/g) || [];
    noteLines.slice(0, 4).forEach(line => {
      drawLeft(line, 30, y, fontReg, 7.5, dark);
      y -= 11;
    });
    y -= 6;
  }

  // Bank details footer
  page.drawLine({ start: { x: 30, y }, end: { x: width - 30, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 14;
  const footerSectionStartY = y;

  drawLeft('Bank Details', 30, y, fontBold, 8, indigo);
  let bankY = y - 12;
  [
    `Bank: ${seller.bankName || '-'}`,
    `Account No: ${seller.accountNo || '-'}`,
    `IFSC: ${seller.ifsc || '-'}`,
    `UPI: ${seller.upiId || '-'}`,
  ].forEach(line => {
    drawLeft(line, 30, bankY, fontReg, 7.5, dark);
    bankY -= 11;
  });

  // Signatory (with proper signature line above label)
  if (signatory) {
    const sigBoxRight = width - 30; // 565
    const sigBoxLeft = width - 210; // 385
    const sigLineY = footerSectionStartY - 24;

    page.drawLine({ start: { x: sigBoxLeft, y: sigLineY }, end: { x: sigBoxRight, y: sigLineY }, thickness: 0.5, color: gray });
    drawLeft(`Authorised Signatory: ${signatory}`, sigBoxLeft, sigLineY - 12, fontBold, 8, dark);
  }

  // Footer note
  drawLeft('This is a computer generated invoice.', 30, 20, fontReg, 7, gray);
  drawRight('Generated by OrbitBoard', width - 30, 20, fontReg, 7, gray);

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ─── Live HTML Preview ────────────────────────────────────────────────────────

function InvoicePreview({ seller, buyer, meta, items, totals, notes, signatory, isInterState }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none">
      {/* Header */}
      <div className="bg-indigo-700 px-6 py-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{seller.companyName || 'Your Company'}</h1>
          <p className="text-indigo-200 text-xs mt-0.5">{seller.address}{seller.city ? `, ${seller.city}` : ''}{seller.state ? `, ${seller.state}` : ''}{seller.pin ? ` - ${seller.pin}` : ''}</p>
          <p className="text-indigo-200 text-xs">{seller.gstin ? `GSTIN: ${seller.gstin}` : ''}{seller.pan ? `  |  PAN: ${seller.pan}` : ''}</p>
          <p className="text-indigo-200 text-xs">{seller.phone}{seller.email ? `  |  ${seller.email}` : ''}</p>
        </div>
        <div className="text-right">
          <p className="text-amber-300 font-bold text-lg">TAX INVOICE</p>
          <p className="text-white text-xs">No: {meta.invoiceNumber}</p>
          <p className="text-white text-xs">Date: {meta.invoiceDate}</p>
          {meta.dueDate && <p className="text-indigo-200 text-xs">Due: {meta.dueDate}</p>}
        </div>
      </div>

      {/* Buyer + Meta */}
      <div className="grid grid-cols-2 gap-4 px-6 py-4 bg-indigo-50 border-b border-indigo-100">
        <div>
          <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Bill To</p>
          <p className="font-semibold text-gray-800">{buyer.name || '—'}</p>
          <p className="text-xs text-gray-600">{buyer.address}</p>
          <p className="text-xs text-gray-600">{buyer.city}{buyer.pin ? ` - ${buyer.pin}` : ''}</p>
          <p className="text-xs text-gray-600">{buyer.state}</p>
          {buyer.gstin && <p className="text-xs text-gray-600">GSTIN: {buyer.gstin}</p>}
          {buyer.phone && <p className="text-xs text-gray-600">{buyer.phone}</p>}
        </div>
        <div className="text-right text-xs text-gray-600 space-y-1">
          {meta.poReference && <p><span className="font-medium">PO Ref:</span> {meta.poReference}</p>}
          <p><span className="font-medium">Place of Supply:</span> {meta.placeOfSupply}</p>
          <p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${isInterState ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
              {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
            </span>
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="px-6 py-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-indigo-700 text-white">
              <th className="py-2 px-2 text-left rounded-tl-lg w-6">#</th>
              <th className="py-2 px-2 text-left">Description</th>
              <th className="py-2 px-2 text-left">HSN/SAC</th>
              <th className="py-2 px-2 text-right">Qty</th>
              <th className="py-2 px-2 text-right">Rate (₹)</th>
              <th className="py-2 px-2 text-right">Disc %</th>
              <th className="py-2 px-2 text-right">Taxable</th>
              <th className="py-2 px-2 text-right">GST%</th>
              {isInterState
                ? <th className="py-2 px-2 text-right">IGST</th>
                : <><th className="py-2 px-2 text-right">CGST</th><th className="py-2 px-2 text-right">SGST</th></>
              }
              <th className="py-2 px-2 text-right rounded-tr-lg">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const calc = calcItem(item, isInterState);
              return (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50/30'}>
                  <td className="py-1.5 px-2 text-gray-500">{idx + 1}</td>
                  <td className="py-1.5 px-2 font-medium text-gray-800">{item.description || '—'}</td>
                  <td className="py-1.5 px-2 text-gray-500">{item.hsn || '—'}</td>
                  <td className="py-1.5 px-2 text-right">{item.qty} {item.unit}</td>
                  <td className="py-1.5 px-2 text-right">{inr(item.rate)}</td>
                  <td className="py-1.5 px-2 text-right">{item.discount}%</td>
                  <td className="py-1.5 px-2 text-right">{inr(calc.taxable)}</td>
                  <td className="py-1.5 px-2 text-right">{item.gstRate}%</td>
                  {isInterState
                    ? <td className="py-1.5 px-2 text-right">{inr(calc.igst)}</td>
                    : <><td className="py-1.5 px-2 text-right">{inr(calc.cgst)}</td><td className="py-1.5 px-2 text-right">{inr(calc.sgst)}</td></>
                  }
                  <td className="py-1.5 px-2 text-right font-semibold">{inr(calc.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="px-6 pb-4 flex justify-end">
        <div className="w-72 space-y-1 text-sm">
          {[
            ['Subtotal', inr(totals.subtotal)],
            ['Total Discount', `- ₹${inr(totals.totalDiscount)}`],
            ['Taxable Amount', inr(totals.taxableAmount)],
            ...(isInterState
              ? [['IGST', inr(totals.igst)]]
              : [['CGST', inr(totals.cgst)], ['SGST', inr(totals.sgst)]]),
            ['Round Off', (totals.roundOff >= 0 ? '+' : '') + inr(totals.roundOff)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-gray-600 text-xs">
              <span>{k}</span><span className="font-medium">{v}</span>
            </div>
          ))}
          <div className="flex justify-between items-center bg-indigo-700 text-white rounded-lg px-3 py-2 mt-2">
            <span className="font-bold">GRAND TOTAL</span>
            <span className="font-bold text-amber-300 text-base">₹{inr(totals.grandTotal)}</span>
          </div>
          <p className="text-xs text-gray-500 italic mt-1">{amountToWords(totals.grandTotal)}</p>
        </div>
      </div>

      {/* Notes + Bank + Signatory */}
      <div className="grid grid-cols-2 gap-4 px-6 pb-4 border-t border-gray-100 pt-4">
        <div className="space-y-3">
          {notes && (
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Notes / Terms</p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{notes}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Bank Details</p>
            <p className="text-xs text-gray-600">Bank: {seller.bankName || '—'}</p>
            <p className="text-xs text-gray-600">A/C: {seller.accountNo || '—'}</p>
            <p className="text-xs text-gray-600">IFSC: {seller.ifsc || '—'}</p>
            {seller.upiId && <p className="text-xs text-gray-600">UPI: {seller.upiId}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end justify-end">
          <div className="text-center">
            <div className="border-b border-gray-400 w-40 mb-1 mt-8" />
            <p className="text-xs text-gray-600">{signatory || 'Authorised Signatory'}</p>
          </div>
          <p className="text-xs text-gray-400 mt-4">This is a computer generated invoice.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GstInvoice() {
  const [seller, setSeller] = useState(defaultSeller);
  const [buyer, setBuyer] = useState(defaultBuyer);
  const [meta, setMeta] = useState(defaultMeta);
  const [items, setItems] = useState([defaultItem(1)]);
  const [notes, setNotes] = useState('Payment due within 30 days.\nGoods once sold will not be taken back.');
  const [signatory, setSignatory] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sellerErrors, setSellerErrors] = useState({});
  const [buyerErrors, setBuyerErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const itemIdRef = useRef(2);

  // Persist seller to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(SELLER_KEY, JSON.stringify(seller));
    } catch {
      /* ignore storage write error */
    }
  }, [seller]);

  const isInterState = useMemo(() => seller.state !== buyer.state, [seller.state, buyer.state]);

  const totals = useMemo(() => {
    let subtotal = 0, totalDiscount = 0, taxableAmount = 0, cgst = 0, sgst = 0, igst = 0;
    items.forEach(item => {
      const c = calcItem(item, isInterState);
      subtotal += c.gross;
      totalDiscount += c.discAmt;
      taxableAmount += c.taxable;
      cgst += c.cgst;
      sgst += c.sgst;
      igst += c.igst;
    });
    const rawTotal = taxableAmount + cgst + sgst + igst;
    const grandTotal = Math.round(rawTotal);
    const roundOff = grandTotal - rawTotal;
    return { subtotal, totalDiscount, taxableAmount, cgst, sgst, igst, rawTotal, grandTotal, roundOff };
  }, [items, isInterState]);

  // Seller field helpers
  const setSF = useCallback((key, val) => {
    setSeller(s => ({ ...s, [key]: val }));
    if (key === 'gstin') {
      setSellerErrors(e => ({ ...e, gstin: val && !GSTIN_REGEX.test(val) ? 'Invalid GSTIN format' : '' }));
    }
  }, []);

  const setBF = useCallback((key, val) => {
    setBuyer(b => ({ ...b, [key]: val }));
    if (key === 'state') {
      setMeta(m => ({ ...m, placeOfSupply: val }));
    }
    if (key === 'gstin') {
      setBuyerErrors(e => ({ ...e, gstin: val && !GSTIN_REGEX.test(val) ? 'Invalid GSTIN format' : '' }));
    }
  }, []);

  // Logo upload
  const handleLogoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setSeller(s => ({ ...s, logo: ev.target.result }));
    reader.readAsDataURL(file);
  }, []);

  // Item management
  const addItem = useCallback(() => {
    const id = itemIdRef.current++;
    setItems(prev => [...prev, defaultItem(id)]);
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);
  }, []);

  const updateItem = useCallback((id, key, val) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: val } : i));
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    setGenerating(true);
    try {
      const blob = await generatePDF({ seller, buyer, meta, items, totals, notes, signatory, isInterState });
      downloadBlob(blob, 'orbitboard-gst-invoice.pdf');
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setGenerating(false);
    }
  }, [seller, buyer, meta, items, totals, notes, signatory, isInterState]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <FileText size={22} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">GST Invoice Generator</h1>
            <p className="text-xs text-gray-500">Indian GST compliant professional invoices</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <FileText size={15} />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            <Download size={15} />
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* ── Seller Details ── */}
      <SectionCard icon={Building2} title="Your Company / Seller Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Company Name">
            <Input value={seller.companyName} onChange={e => setSF('companyName', e.target.value)} placeholder="Acme Pvt Ltd" />
          </Field>
          <Field label="Logo (optional)">
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-xs" />
              {seller.logo && <img src={seller.logo} alt="logo" className="h-8 w-8 object-contain rounded" />}
            </div>
          </Field>
          <Field label="GSTIN" error={sellerErrors.gstin}>
            <Input value={seller.gstin} onChange={e => setSF('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} className={sellerErrors.gstin ? 'border-red-400' : ''} />
          </Field>
          <Field label="PAN">
            <Input value={seller.pan} onChange={e => setSF('pan', e.target.value.toUpperCase())} placeholder="AAAAA0000A" maxLength={10} />
          </Field>
          <Field label="Address">
            <Textarea value={seller.address} onChange={e => setSF('address', e.target.value)} rows={2} placeholder="123, Main Street" />
          </Field>
          <Field label="City">
            <Input value={seller.city} onChange={e => setSF('city', e.target.value)} placeholder="Mumbai" />
          </Field>
          <Field label="State">
            <Select value={seller.state} onChange={e => setSF('state', e.target.value)}>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="PIN Code">
            <Input value={seller.pin} onChange={e => setSF('pin', e.target.value)} placeholder="400001" maxLength={6} />
          </Field>
          <Field label="Phone">
            <Input value={seller.phone} onChange={e => setSF('phone', e.target.value)} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Email">
            <Input type="email" value={seller.email} onChange={e => setSF('email', e.target.value)} placeholder="info@acme.com" />
          </Field>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Bank Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Bank Name">
              <Input value={seller.bankName} onChange={e => setSF('bankName', e.target.value)} placeholder="HDFC Bank" />
            </Field>
            <Field label="Account No">
              <Input value={seller.accountNo} onChange={e => setSF('accountNo', e.target.value)} placeholder="123456789012" />
            </Field>
            <Field label="IFSC Code">
              <Input value={seller.ifsc} onChange={e => setSF('ifsc', e.target.value.toUpperCase())} placeholder="HDFC0001234" />
            </Field>
            <Field label="UPI ID">
              <Input value={seller.upiId} onChange={e => setSF('upiId', e.target.value)} placeholder="acme@upi" />
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* ── Buyer + Invoice Meta ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={Building2} title="Bill To / Buyer Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Buyer Name">
              <Input value={buyer.name} onChange={e => setBF('name', e.target.value)} placeholder="XYZ Corp Pvt Ltd" />
            </Field>
            <Field label="GSTIN (optional)" error={buyerErrors.gstin}>
              <Input value={buyer.gstin} onChange={e => setBF('gstin', e.target.value.toUpperCase())} placeholder="27AAAAA0000A1Z5" maxLength={15} className={buyerErrors.gstin ? 'border-red-400' : ''} />
            </Field>
            <Field label="Address">
              <Textarea value={buyer.address} onChange={e => setBF('address', e.target.value)} rows={2} placeholder="456, Park Avenue" />
            </Field>
            <Field label="City">
              <Input value={buyer.city} onChange={e => setBF('city', e.target.value)} placeholder="Pune" />
            </Field>
            <Field label="State">
              <Select value={buyer.state} onChange={e => setBF('state', e.target.value)}>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="PIN Code">
              <Input value={buyer.pin} onChange={e => setBF('pin', e.target.value)} placeholder="411001" maxLength={6} />
            </Field>
            <Field label="Phone">
              <Input value={buyer.phone} onChange={e => setBF('phone', e.target.value)} placeholder="+91 99887 76655" />
            </Field>
            <Field label="Email">
              <Input type="email" value={buyer.email} onChange={e => setBF('email', e.target.value)} placeholder="buyer@xyz.com" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={FileText} title="Invoice Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Invoice Number">
              <Input value={meta.invoiceNumber} onChange={e => setMeta(m => ({ ...m, invoiceNumber: e.target.value }))} />
            </Field>
            <Field label="Invoice Date">
              <Input type="date" value={meta.invoiceDate} onChange={e => setMeta(m => ({ ...m, invoiceDate: e.target.value }))} />
            </Field>
            <Field label="Due Date">
              <Input type="date" value={meta.dueDate} onChange={e => setMeta(m => ({ ...m, dueDate: e.target.value }))} />
            </Field>
            <Field label="PO Reference">
              <Input value={meta.poReference} onChange={e => setMeta(m => ({ ...m, poReference: e.target.value }))} placeholder="PO-2024-001" />
            </Field>
            <Field label="Place of Supply">
              <Select value={meta.placeOfSupply} onChange={e => setMeta(m => ({ ...m, placeOfSupply: e.target.value }))}>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Supply Type">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isInterState ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                {isInterState ? '⚡ Inter-State — IGST' : '✓ Intra-State — CGST + SGST'}
              </div>
            </Field>
          </div>
        </SectionCard>
      </div>

      {/* ── Line Items ── */}
      <SectionCard icon={FileText} title="Line Items">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="py-2 px-2 text-left font-semibold w-8">#</th>
                <th className="py-2 px-2 text-left font-semibold">Description</th>
                <th className="py-2 px-2 text-left font-semibold w-24">HSN/SAC</th>
                <th className="py-2 px-2 text-right font-semibold w-16">Qty</th>
                <th className="py-2 px-2 text-left font-semibold w-20">Unit</th>
                <th className="py-2 px-2 text-right font-semibold w-24">Rate (₹)</th>
                <th className="py-2 px-2 text-right font-semibold w-16">Disc%</th>
                <th className="py-2 px-2 text-right font-semibold w-24">Taxable</th>
                <th className="py-2 px-2 text-right font-semibold w-20">GST%</th>
                {isInterState
                  ? <th className="py-2 px-2 text-right font-semibold w-24">IGST</th>
                  : <><th className="py-2 px-2 text-right font-semibold w-20">CGST</th><th className="py-2 px-2 text-right font-semibold w-20">SGST</th></>
                }
                <th className="py-2 px-2 text-right font-semibold w-24">Amount</th>
                <th className="py-2 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const calc = calcItem(item, isInterState);
                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-1.5 px-2 text-gray-400">{idx + 1}</td>
                    <td className="py-1.5 px-2">
                      <Input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Service / Product description" className="w-full" />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input value={item.hsn} onChange={e => updateItem(item.id, 'hsn', e.target.value)} placeholder="998314" className="w-full" />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input type="number" min="0" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} className="w-full text-right" />
                    </td>
                    <td className="py-1.5 px-2">
                      <Select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} className="w-full">
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </Select>
                    </td>
                    <td className="py-1.5 px-2">
                      <Input type="number" min="0" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)} className="w-full text-right" />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input type="number" min="0" max="100" value={item.discount} onChange={e => updateItem(item.id, 'discount', e.target.value)} className="w-full text-right" />
                    </td>
                    <td className="py-1.5 px-2 text-right font-medium text-gray-700">{inr(calc.taxable)}</td>
                    <td className="py-1.5 px-2">
                      <Select value={item.gstRate} onChange={e => updateItem(item.id, 'gstRate', Number(e.target.value))} className="w-full">
                        {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                      </Select>
                    </td>
                    {isInterState
                      ? <td className="py-1.5 px-2 text-right text-gray-600">{inr(calc.igst)}</td>
                      : <><td className="py-1.5 px-2 text-right text-gray-600">{inr(calc.cgst)}</td><td className="py-1.5 px-2 text-right text-gray-600">{inr(calc.sgst)}</td></>
                    }
                    <td className="py-1.5 px-2 text-right font-semibold text-indigo-700">₹{inr(calc.total)}</td>
                    <td className="py-1.5 px-2">
                      <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button onClick={addItem} className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
          <Plus size={15} /> Add Item
        </button>

        {/* Totals Summary */}
        <div className="mt-6 flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            {[
              ['Subtotal', `₹${inr(totals.subtotal)}`],
              ['Total Discount', `- ₹${inr(totals.totalDiscount)}`],
              ['Taxable Amount', `₹${inr(totals.taxableAmount)}`],
              ...(isInterState
                ? [['IGST', `₹${inr(totals.igst)}`]]
                : [['CGST', `₹${inr(totals.cgst)}`], ['SGST', `₹${inr(totals.sgst)}`]]),
              ['Round Off', (totals.roundOff >= 0 ? '+' : '') + `₹${inr(totals.roundOff)}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-gray-600 text-xs border-b border-gray-50 pb-1">
                <span>{k}</span><span className="font-medium">{v}</span>
              </div>
            ))}
            <div className="flex justify-between items-center bg-indigo-700 text-white rounded-xl px-4 py-2.5 mt-2">
              <span className="font-bold">GRAND TOTAL</span>
              <span className="font-bold text-amber-300 text-lg">₹{inr(totals.grandTotal)}</span>
            </div>
            <p className="text-xs text-gray-500 italic">{amountToWords(totals.grandTotal)}</p>
          </div>
        </div>
      </SectionCard>

      {/* ── Notes + Signatory ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SectionCard icon={FileText} title="Notes / Terms & Conditions">
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            className="w-full"
            placeholder="Payment terms, return policy, etc."
          />
        </SectionCard>
        <SectionCard icon={Building2} title="Authorised Signatory">
          <Field label="Signatory Name">
            <Input value={signatory} onChange={e => setSignatory(e.target.value)} placeholder="John Doe, Director" />
          </Field>
          <p className="text-xs text-gray-400 mt-3">Name appears on the invoice below the signature line.</p>
        </SectionCard>
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-3 flex-wrap">
        <button
          onClick={() => setShowPreview(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          <FileText size={15} />
          {showPreview ? 'Hide Preview' : 'Show Live Preview'}
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          <Download size={15} />
          {generating ? 'Generating PDF…' : 'Download PDF'}
        </button>
      </div>

      {/* ── Live HTML Preview ── */}
      {showPreview && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Live Invoice Preview</h2>
          <InvoicePreview
            seller={seller}
            buyer={buyer}
            meta={meta}
            items={items}
            totals={totals}
            notes={notes}
            signatory={signatory}
            isInterState={isInterState}
          />
        </div>
      )}
    </div>
  );
}
