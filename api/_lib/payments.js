import { PDF_TOPUP_PRODUCT } from '../../src/lib/monetization/pdfCredits.js';
import Razorpay from 'razorpay';
import { getAdminClient } from './supabaseClient.js';

export function getRazorpay() {
  const keyId = globalThis.process?.env?.RAZORPAY_KEY_ID;
  const keySecret = globalThis.process?.env?.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function requireAdmin() {
  const admin = getAdminClient();
  if (!admin) {
    const err = new Error('Payments store is not configured');
    err.code = 'STORE_UNAVAILABLE';
    throw err;
  }
  return admin;
}

/**
 * Record a captured payment, mark its order as paid, and grant any pass the order bought.
 * Safe to call more than once for the same payment:
 *  - the payments table is keyed by Razorpay payment id,
 *  - the order update only matches orders that are not yet paid,
 *  - grant_pass is idempotent on the payment id.
 * The grant runs on every call, not only the first, so a failed grant is retried
 * by the next webhook delivery.
 *
 * Returns { newlyFulfilled }. Only act on one-off side effects (receipts)
 * when newlyFulfilled is true.
 */
export async function fulfilPayment(admin, { orderId, paymentId, amountPaise, currency, source }) {
  const { error: insertError } = await admin.from('payments').insert({
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    amount_paise: amountPaise,
    currency,
    status: 'captured',
    source,
  });
  // 23505 = unique violation: this payment was already recorded.
  if (insertError && insertError.code !== '23505') {
    throw insertError;
  }

  const { data, error } = await admin
    .from('payment_orders')
    .update({ status: 'paid', payment_id: paymentId, paid_at: new Date().toISOString() })
    .eq('razorpay_order_id', orderId)
    .neq('status', 'paid')
    .select('razorpay_order_id');
  if (error) throw error;

  const { data: orderRow, error: orderError } = await admin
    .from('payment_orders')
    .select('user_id, plan_id, product_id')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();
  if (orderError) throw orderError;

  if (orderRow?.product_id === PDF_TOPUP_PRODUCT) {
    const { error: creditError } = await admin.rpc('grant_pdf_topup', { p_order_id: orderId, p_payment_id: paymentId });
    if (creditError) throw creditError;
  }

  if (orderRow?.user_id && orderRow?.plan_id) {
    const { error: grantError } = await admin.rpc('grant_pass', {
      p_user: orderRow.user_id,
      p_plan_id: orderRow.plan_id,
      p_payment_id: paymentId,
      p_source: source,
    });
    if (grantError) throw grantError;
  }

  return { newlyFulfilled: Array.isArray(data) && data.length > 0, creditsGranted: orderRow?.product_id === PDF_TOPUP_PRODUCT };
}
