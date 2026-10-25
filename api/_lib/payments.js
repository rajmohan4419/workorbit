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
 * Record a captured payment and mark its order as paid. Safe to call more than
 * once for the same payment: the payments table is keyed by Razorpay payment id,
 * and the order update only matches orders that are not yet paid.
 *
 * Returns { newlyFulfilled }. Only act on side effects (receipts, entitlements)
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

  return { newlyFulfilled: Array.isArray(data) && data.length > 0 };
}
