/* global Buffer */
import crypto from 'crypto';
import { getCorsHeaders } from './_lib/common.js';
import { parseRequestBody } from './create-order.js';
import { getRazorpay, requireAdmin, fulfilPayment } from './_lib/payments.js';
import { checkPaymentAgainstOrder } from './_lib/paymentRules.js';
import { getUserFromRequest } from './_lib/entitlements.js';

export default async function handler(req, res) {
  const corsHeaders = getCorsHeaders(req.headers?.origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, corsHeaders);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const keySecret = globalThis.process?.env?.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ success: false, error: 'Payments are temporarily unavailable' }));
    return;
  }

  const body = await parseRequestBody(req);
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    res.writeHead(400, corsHeaders);
    res.end(JSON.stringify({ success: false, error: 'Missing required payment verification fields' }));
    return;
  }

  // Step 1: the signature proves Razorpay issued this order/payment pair.
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  const sigBuf = Buffer.from(String(razorpay_signature), 'utf-8');
  const expBuf = Buffer.from(expected, 'utf-8');
  const signatureOk = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  if (!signatureOk) {
    res.writeHead(400, corsHeaders);
    res.end(JSON.stringify({ success: false, error: 'Invalid payment signature' }));
    return;
  }

  try {
    const admin = requireAdmin();
    const razorpay = getRazorpay();
    if (!razorpay) throw Object.assign(new Error('Razorpay not configured'), { code: 'STORE_UNAVAILABLE' });

    // Step 2: the signature alone is not enough. Check our own order record.
    const { data: orderRecord, error: orderError } = await admin
      .from('payment_orders')
      .select('razorpay_order_id, amount_paise, currency, status, user_id, plan_id')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();
    if (orderError) throw orderError;

    // Step 3: a pass order belongs to the user who created it. Anyone else
    // holding a valid signed payment must not be able to claim it.
    // Donations have no user_id and skip this check.
    if (orderRecord?.user_id) {
      const caller = await getUserFromRequest(req, admin);
      if (!caller || caller.id !== orderRecord.user_id) {
        console.warn('[VERIFY PAYMENT] caller does not own order', razorpay_order_id);
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ success: false, error: 'Payment could not be confirmed' }));
        return;
      }
    }

    // Step 4: confirm the order and payment with Razorpay before fulfilling.
    const [razorpayOrder, payment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id),
    ]);

    const check = checkPaymentAgainstOrder({
      orderRecord,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      payment,
      razorpayOrder,
    });
    if (!check.ok) {
      console.warn('[VERIFY PAYMENT] rejected:', check.reason, razorpay_order_id);
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ success: false, error: 'Payment could not be confirmed' }));
      return;
    }

    // Step 5: idempotent fulfilment. Pass grants happen inside fulfilPayment.
    await fulfilPayment(admin, {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amountPaise: orderRecord.amount_paise,
      currency: orderRecord.currency,
      source: 'checkout',
    });

    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      success: true,
      message: 'Payment verified successfully',
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      plan_id: orderRecord.plan_id || null,
    }));
  } catch (err) {
    console.error('[VERIFY PAYMENT ERROR]', err?.message || err);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ success: false, error: 'Payment could not be confirmed. Please contact support.' }));
  }
}
