/**
 * Pure checks that a payment matches the order we created on the server.
 * Used by both the verify endpoint and the webhook. Returns { ok, reason }.
 */
export function checkPaymentAgainstOrder({ orderRecord, paymentId, orderId, payment, razorpayOrder }) {
  if (!orderRecord) return { ok: false, reason: 'unknown order' };
  if (orderRecord.razorpay_order_id !== orderId) return { ok: false, reason: 'order id mismatch' };

  if (!payment) return { ok: false, reason: 'payment not found' };
  if (payment.id !== paymentId) return { ok: false, reason: 'payment id mismatch' };
  if (payment.order_id !== orderId) return { ok: false, reason: 'payment belongs to another order' };
  if (payment.status !== 'captured') return { ok: false, reason: `payment status is ${payment.status}` };
  if (payment.amount !== orderRecord.amount_paise) return { ok: false, reason: 'payment amount mismatch' };
  if (payment.currency !== orderRecord.currency) return { ok: false, reason: 'payment currency mismatch' };

  if (razorpayOrder) {
    if (razorpayOrder.id !== orderId) return { ok: false, reason: 'razorpay order id mismatch' };
    if (razorpayOrder.amount !== orderRecord.amount_paise) return { ok: false, reason: 'order amount mismatch' };
    if (razorpayOrder.currency !== orderRecord.currency) return { ok: false, reason: 'order currency mismatch' };
  }

  return { ok: true, reason: null };
}
