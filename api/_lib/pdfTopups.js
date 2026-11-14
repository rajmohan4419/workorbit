import crypto from 'node:crypto';
import { requireAdmin } from './payments.js';
import { getUserFromRequest } from './entitlements.js';
import { rateLimiter } from './common.js';
import { parseTopupAmount, PDF_TOPUP_PRODUCT } from '../../src/lib/monetization/pdfCredits.js';

export async function createPdfTopup({ req, body, razorpay }) {
  const quote = parseTopupAmount(body.amountRupees);
  if (!quote) return { status:400, body:{ error:'Enter ₹100–₹1,00,000 in multiples of ₹0.25.' } };
  let admin;
  try { admin = requireAdmin(); } catch { return {status:503,body:{error:'Top-ups are temporarily unavailable.'}}; }
  const user = await getUserFromRequest(req, admin);
  if (!user || user.is_anonymous) return {status:401,body:{error:'sign_in_required'}};
  if (rateLimiter.isRateLimited(user.id, 'pdf-topup', 5, 60)) return {status:429,body:{error:'Please wait before starting another top-up.'}};
  try {
    // Confirm the credit store is ready before opening a payable order.
    const { error: storeError } = await admin.from('pdf_credit_accounts').select('user_id').eq('user_id',user.id).maybeSingle();
    if (storeError) throw storeError;
    const receipt = `pdf_${crypto.randomUUID().replaceAll('-','')}`;
    const order = await razorpay.orders.create({amount:quote.amountPaise,currency:'INR',receipt,notes:{product_id:PDF_TOPUP_PRODUCT,user_id:user.id}});
    const {error} = await admin.from('payment_orders').insert({razorpay_order_id:order.id,product_id:PDF_TOPUP_PRODUCT,amount_paise:quote.amountPaise,currency:'INR',receipt,status:'created',user_id:user.id});
    if (error) throw error;
    return {status:200,body:{order_id:order.id,amount:quote.amountPaise,currency:'INR',credits:quote.credits,key_id:globalThis.process?.env?.RAZORPAY_KEY_ID}};
  } catch { return {status:503,body:{error:'Could not start top-up. Please retry.'}}; }
}
