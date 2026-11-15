import {describe,it,expect} from 'vitest';
import {sampleInvoice} from './sample.js';
import {validateModel,invoiceTotals,partyLines,ENDORSEMENTS} from './model.js';
describe('invoice shared model',()=>{
 it('requires B2B GSTIN and state consistency; B2C permits NA with conditional details',()=>{
  const b=sampleInvoice();expect(validateModel(b).errors).toEqual([]);b.buyer.gstin='';expect(validateModel(b).errors.join()).toContain('B2B requires');
  b.buyer.gstin='27AAPFU0939F1ZV';b.buyer.state='Karnataka';expect(validateModel(b).errors.join()).toContain('state code');
  const c=sampleInvoice('b2c');c.buyer={country:'IN',gstin:''};expect(validateModel(c).errors).toEqual([]);c.items[0].rate='50000';expect(validateModel(c).errors.join()).toContain('Recipient');
 });
 it('keeps export eligibility and treatment explicit for goods and services',()=>{
  const i=sampleInvoice('export');expect(validateModel(i).errors).toEqual([]);expect(validateModel(i).endorsement).toBe(ENDORSEMENTS.lut);expect(invoiceTotals(i).igst).toBe(0);
  i.export.treatment='igst';expect(validateModel(i).errors.join()).toContain('legally permitted');i.export.igstEligible=true;i.export.notificationReference='Reviewed 27/2023';expect(invoiceTotals(i).igst).toBeGreaterThan(0);
  i.export.kind='services';expect(validateModel(i).errors.join()).toContain('goods/services');i.items[0].kind='services';i.items[0].hsn='998314';expect(validateModel(i).errors).toEqual([]);
 });
 it('validates foreign postcodes, recipient requests and UTGST labels',()=>{
  const e=sampleInvoice('export');e.buyer.pin='123';expect(validateModel(e).errors.join()).toContain('postal code');
  const c=sampleInvoice('b2c');c.buyer={country:'IN',gstin:''};c.meta.recipientRequestsDetails=true;expect(validateModel(c).errors.join()).toContain('Recipient');
  c.seller.state='Ladakh';expect(validateModel(c).secondTax).toBe('UTGST');
 });
 it('uses exact decimal multiplication, discount and split taxes with explicit round off',()=>{
  const i=sampleInvoice();i.currency='INR';i.items=[{...i.items[0],qty:'3',rate:'0.335',discount:'0',gstRate:'18',cessRate:'1'}];
  const t=invoiceTotals(i);expect(t.gross).toBe(1.01);expect(t.cgst).toBe(.09);expect(t.sgst).toBe(.09);expect(t.cess).toBe(.01);expect(t.total).toBe(1);expect(t.roundOff).toBe(-.2);
  i.items[0].rate='oops';expect(validateModel(i).errors.join()).toContain('decimal');
 });
 it('omits empty address lines, validates PIN and blocks unsupported e-invoice mode',()=>{
  const i=sampleInvoice();expect(partyLines(i.seller,true)).not.toContain('');expect(partyLines(i.seller,true)).not.toContain('-');
  i.seller.pin='123';expect(validateModel(i).errors.join()).toContain('PIN');i.seller.pin='400001';i.meta.einvoiceStatus='required';expect(validateModel(i).errors.join()).toContain('IRN');
 });
});
