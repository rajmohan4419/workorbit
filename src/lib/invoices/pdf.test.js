import {describe,it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {sampleInvoice} from './sample.js';
import {TEMPLATES} from './model.js';
import {generateUpgradedPDF,currencyWords} from './pdf.js';
const fonts={regular:await readFile(new URL('../../assets/invoice-fonts/inter-regular.woff',import.meta.url)),bold:await readFile(new URL('../../assets/invoice-fonts/inter-bold.woff',import.meta.url))};
describe('shared invoice PDF templates',()=>{
 it.each(TEMPLATES.map(t=>[t.id]))('%s renders A4 and handles long multipage items',async template=>{
  const i=sampleInvoice('export');i.template=template;i.items=Array.from({length:35},(_,n)=>({...i.items[0],id:n,description:'Synthetic description with full specifications and package information. '.repeat(5)}));
  const blob=await generateUpgradedPDF(i,{fonts});const pdf=await PDFDocument.load(await blob.arrayBuffer());expect(pdf.getPageCount()).toBeGreaterThan(1);expect(pdf.getPage(0).getSize().width).toBeCloseTo(595.28,1);
 },20000);
 it('uses currency-specific words',()=>{expect(currencyWords(100.25,'USD')).toBe('One Hundred US Dollars and Twenty Five Cents Only');expect(currencyWords(100.25,'INR')).toContain('Paise');});
});
