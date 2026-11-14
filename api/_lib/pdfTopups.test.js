import {beforeEach,describe,expect,it,vi} from 'vitest';
import {createPdfTopup} from './pdfTopups';
import {requireAdmin} from './payments';
import {getUserFromRequest} from './entitlements';
vi.mock('./payments',()=>({requireAdmin:vi.fn()}));
vi.mock('./entitlements',()=>({getUserFromRequest:vi.fn()}));
describe('PDF top-up orders',()=>{
  let razorpay,insert,admin;
  beforeEach(()=>{
    insert=vi.fn().mockResolvedValue({error:null});
    admin={from:vi.fn().mockReturnValue({select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:null}),insert})};
    vi.mocked(requireAdmin).mockReturnValue(admin);
    vi.mocked(getUserFromRequest).mockResolvedValue({id:crypto.randomUUID()});
    razorpay={orders:{create:vi.fn().mockResolvedValue({id:'order_topup'})}};
  });
  const call=(razorpay,body={amountRupees:'100'})=>createPdfTopup({req:{},body,razorpay});
  it('binds server-priced credit purchases to the verified account',async()=>{
    const result=await call(razorpay,{amountRupees:'100',userId:'attacker',credits:999999,amountPaise:1});
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({amount:10000,credits:400});
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({user_id:(await getUserFromRequest()).id,amount_paise:10000,product_id:'pdf-download-topup'}));
  });
  it('never opens payment for invalid amounts or anonymous users',async()=>{
    expect((await call(razorpay,{amountRupees:'99.99'})).status).toBe(400);
    vi.mocked(getUserFromRequest).mockResolvedValue({id:'anon',is_anonymous:true});
    expect((await call(razorpay)).status).toBe(401);
    expect(razorpay.orders.create).not.toHaveBeenCalled();
  });
  it('fails closed when the credit store or order persistence fails',async()=>{
    insert.mockResolvedValue({error:new Error('storage failure')});
    expect((await call(razorpay)).status).toBe(503);
    expect((await call(razorpay)).body).not.toHaveProperty('order_id');
  });
});
