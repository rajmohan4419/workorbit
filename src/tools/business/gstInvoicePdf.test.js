import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateInvoicePDF } from './gstInvoicePdf.js';
const fonts = { regular:readFileSync(new URL('../../assets/invoice-fonts/inter-regular.woff', import.meta.url)), bold:readFileSync(new URL('../../assets/invoice-fonts/inter-bold.woff', import.meta.url)) };
const generate = input => generateInvoicePDF(input, {fonts});
const invoice = { seller: { companyName:'Synthetic seller', address:'Synthetic road', state:'Maharashtra', gstin:'27AAPFU0939F1ZV' }, buyer:{ name:'Synthetic buyer', address:'Synthetic street', state:'Maharashtra' }, meta:{ invoiceNumber:'SYNTHETIC-001', invoiceDate:'2026-10-01', placeOfSupply:'Karnataka' }, items:[{ description:'Synthetic service',hsn:'998314',qty:1,unit:'Hr',rate:1000,discount:0,gstRate:18 }] };
describe('invoice PDF reliability', () => {
  it('paginates long descriptions, many rows and notes', async () => {
    const blob = await generate({ ...invoice, items:Array.from({length:80},()=>({...invoice.items[0], description:'Full untruncated synthetic description. '.repeat(8)})),notes:'Synthetic terms. '.repeat(500) });
    const doc = await PDFDocument.load(await blob.arrayBuffer());
    expect(doc.getPageCount()).toBeGreaterThan(3);
  }, 20000);
  it('rejects unsupported scripts explicitly instead of deleting them', async () => {
    await expect(generate({...invoice,notes:'தமிழ்'})).rejects.toThrow(/Notes contains characters unsupported/);
  });
  it('rejects invalid export data before creating a document', async () => {
    await expect(generate({...invoice,items:[{...invoice.items[0],rate:Infinity}]})).rejects.toThrow(/finite/);
  });
});
