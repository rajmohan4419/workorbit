import {describe,expect,it,vi} from 'vitest';
import {fulfilPayment} from './payments';
function store({product='pdf-download-topup',grantError=null}={}) {
 const query={update:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),neq:vi.fn().mockReturnThis(),select:vi.fn().mockReturnThis(),then:resolve=>resolve({data:[]}),maybeSingle:vi.fn().mockResolvedValue({data:{user_id:'owner',product_id:product}})};
 return {from:vi.fn(name=>name==='payments'?{insert:vi.fn().mockResolvedValue({error:{code:'23505'}})}:query),rpc:vi.fn().mockResolvedValue({error:grantError})};
}
describe('captured PDF payment fulfilment',()=>{
 it('retries credit grants even when the payment was already recorded',async()=>{
   const admin=store();
   const result = await fulfilPayment(admin,{orderId:'order1',paymentId:'pay1',amountPaise:10000,currency:'INR',source:'webhook'});
   expect(result.creditsGranted).toBe(true);
   expect(admin.rpc).toHaveBeenCalledWith('grant_pdf_topup',{p_order_id:'order1',p_payment_id:'pay1'});
 });
 it('surfaces failed grants so webhook delivery can retry',async()=>{
   await expect(fulfilPayment(store({grantError:Error('retry')}),{orderId:'o',paymentId:'p'})).rejects.toThrow('retry');
 });
 it('does not grant PDF credits to donation orders',async()=>{
   const admin=store({product:'support-orbitboard'});
   const result = await fulfilPayment(admin,{orderId:'o',paymentId:'p'});
   expect(result.creditsGranted).toBe(false);
   expect(admin.rpc).not.toHaveBeenCalled();
 });
});
