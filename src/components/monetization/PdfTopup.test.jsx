// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {PdfTopup} from './PdfTopup';
vi.mock('../../lib/supabase',()=>({supabase:{auth:{getSession:vi.fn().mockResolvedValue({data:{session:{access_token:'synthetic'}}})}}}));
vi.mock('../../lib/razorpay',()=>({loadRazorpayScript:vi.fn().mockResolvedValue(true)}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
describe('PDF top-up checkout',()=>{
 let root,container,options;
 beforeEach(()=>{
  container=document.createElement('div'); document.body.append(container); root=createRoot(container);
  window.Razorpay=class{constructor(value){options=value;} on(){} open(){}};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({order_id:'order_test',amount:10000,key_id:'public_key',credits:400})}).mockResolvedValueOnce({ok:true,json:async()=>({success:true})}));
 });
 afterEach(()=>{act(()=>root.unmount());container.remove();vi.unstubAllGlobals();delete window.Razorpay;});
 it('shows the live quote and uses server order data, then confirms payment',async()=>{
  const paid=vi.fn(); await act(async()=>root.render(<PdfTopup onPaid={paid}/>));
  expect(container.textContent).toContain('400 PDF downloads');
  await act(async()=>container.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(options).toMatchObject({order_id:'order_test',amount:10000});
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({purchaseType:'pdf_topup',amountRupees:'100'});
  await act(async()=>options.handler({razorpay_order_id:'order_test',razorpay_payment_id:'pay_test',razorpay_signature:'signature'}));
  expect(paid).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('Payment confirmed');
 });
});
