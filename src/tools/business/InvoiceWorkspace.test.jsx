/** @vitest-environment jsdom */
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {InvoiceWorkspace} from './InvoiceWorkspace.jsx';
import {sampleInvoice} from '../../lib/invoices/sample.js';
import {invoiceTotals} from '../../lib/invoices/model.js';
vi.mock('../../lib/supabase.js',()=>({supabase:null}));
vi.mock('./gstInvoicePdf.js',()=>({generateInvoicePDF:vi.fn(async()=>new Blob(['pdf'],{type:'application/pdf'}))}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
describe('focused invoice editor',()=>{
 let root,container;
 const click=async name=>{const button=[...container.querySelectorAll('button')].find(b=>b.textContent===name);expect(button).toBeTruthy();await act(async()=>button.click());};
 beforeEach(()=>{localStorage.clear();container=document.createElement('div');document.body.append(container);root=createRoot(container);URL.createObjectURL=vi.fn(()=>'blob:preview');URL.revokeObjectURL=vi.fn();});
 afterEach(()=>{act(()=>root.unmount());container.remove();vi.clearAllMocks();});
 it('retains stored data, calculates the live preview and reveals validation only on review',async()=>{
  const invoice=sampleInvoice('b2b');invoice.buyer.name='';
  localStorage.setItem('orbitboard:invoice-draft-v2',JSON.stringify({requestId:'existing-draft',invoice}));
  await act(async()=>root.render(<InvoiceWorkspace/>));
  const review=container.querySelector('[aria-label="Invoice validation"]');
  expect(review.querySelector('ul')).toBeNull();
  expect(container.querySelector('.invoice-paper').textContent).toContain(invoice.seller.companyName);
  expect(container.querySelector('.invoice-paper-balance').textContent).toContain(invoiceTotals(invoice).balance.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}));
  await click('Review invoice');expect(review.textContent).toContain('Recipient name is required');
  await click('Save draft');expect(JSON.parse(localStorage.getItem('orbitboard:invoice-draft-v2')).requestId).toBe('existing-draft');
 });
 it('changes design without replacing particulars and supports mobile view selection',async()=>{
  await act(async()=>root.render(<InvoiceWorkspace/>));
  await click('Change design');await click('Classic Ledger');
  expect(container.querySelector('.paper-ledger')).not.toBeNull();
  expect(JSON.parse(localStorage.getItem('orbitboard:invoice-draft-v2')).invoice.meta.invoiceNumber).toBe('INV-0017');
  await click('Live preview');expect(container.querySelector('.view-preview')).not.toBeNull();
 });
 it('opens PDF preview without account access and closes with Escape',async()=>{
  await act(async()=>root.render(<InvoiceWorkspace/>));
  await click('Preview PDF');expect(container.querySelector('[role="dialog"] iframe').getAttribute('src')).toBe('blob:preview');
  await act(async()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  expect(container.querySelector('[role="dialog"]')).toBeNull();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
 });
 it('blocks incomplete finalization while keeping the draft editable',async()=>{
  await act(async()=>root.render(<InvoiceWorkspace/>));
  await click('Finalize and download');
  expect(container.querySelector('[aria-label="Invoice validation"] ul')).not.toBeNull();
  expect(container.querySelector('[aria-label="Invoice number"]').disabled).toBe(false);
 });
});
