// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {PdfTopup} from './PdfTopup';
import {getFeedbackSnapshot} from '../../lib/feedback/taskFeedback';
vi.mock('../../lib/supabase',()=>({supabase:{auth:{getSession:vi.fn().mockResolvedValue({data:{session:{access_token:'synthetic'}}})}}}));
vi.mock('../../lib/razorpay',()=>({loadRazorpayScript:vi.fn().mockResolvedValue(true)}));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
describe('PDF top-up checkout',()=>{
 let root,container,options;
 beforeEach(()=>{
  container=document.createElement('div'); document.body.append(container); root=createRoot(container);
  window.Razorpay=class{constructor(value){options=value;} on(){} open(){}};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({order_id:'order_test',amount:10000,key_id:'public_key',credits:400})}).mockResolvedValueOnce({ok:true,json:async()=>({success:true,payment_captured:true,credits_granted:true})}));
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
 it('does not celebrate checkout callbacks or signature-only responses; retries without a new charge',async()=>{
  let resolveVerify;
  const paid=vi.fn();
  fetch.mockReset().mockResolvedValueOnce({ok:true,json:async()=>({order_id:'order_test',amount:10000,key_id:'public_key',credits:400})})
    .mockImplementationOnce(()=>new Promise(resolve=>{resolveVerify=resolve;}));
  await act(async()=>root.render(<PdfTopup onPaid={paid}/>));
  const form=container.querySelector('form');
  await act(async()=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  expect(fetch).toHaveBeenCalledTimes(1);
  const payment={razorpay_order_id:'order_test',razorpay_payment_id:'pay_test',razorpay_signature:'signature'};
  await act(async()=>{options.handler(payment);options.handler(payment);options.modal.ondismiss();});
  expect(paid).not.toHaveBeenCalled();expect(fetch).toHaveBeenCalledTimes(2);
  expect(getFeedbackSnapshot().tasks.at(-1).state).toBe('processing');
  await act(async()=>resolveVerify({ok:true,json:async()=>({success:true})}));
  expect(paid).not.toHaveBeenCalled();expect(container.textContent).toContain('Retry payment confirmation');
  expect(getFeedbackSnapshot().tasks.at(-1).state).toBe('error');
  fetch.mockResolvedValueOnce({ok:true,json:async()=>({success:true,payment_captured:true,credits_granted:true})});
  await act(async()=>[...container.querySelectorAll('button')].find(button=>button.textContent==='Retry payment confirmation').click());
  expect(paid).toHaveBeenCalledTimes(1);expect(fetch).toHaveBeenCalledTimes(3);
  expect(getFeedbackSnapshot().tasks.at(-1).label).toBe('Payment confirmed. Credits added.');
  await act(async()=>options.handler(payment));expect(paid).toHaveBeenCalledTimes(1);
 });
 it('cancels without celebrating and allows retry with the same amount',async()=>{
  await act(async()=>root.render(<PdfTopup onPaid={vi.fn()}/>));
  await act(async()=>container.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await act(async()=>options.modal.ondismiss());
  expect(getFeedbackSnapshot().tasks.at(-1).state).toBe('cancelled');
  expect(container.querySelector('input').value).toBe('100');
  expect(container.querySelector('button[type="submit"]').disabled).toBe(false);
 });

});
