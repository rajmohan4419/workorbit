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
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, razorpay_subscription_id } = body;

  const isSubscription = Boolean(razorpay_subscription_id);

  if (!razorpay_payment_id || (!razorpay_order_id && !razorpay_subscription_id) || !razorpay_signature) {
    res.writeHead(400, corsHeaders);
    res.end(JSON.stringify({ success: false, error: 'Missing required payment verification fields' }));
    return;
  }

  // Step 1: verify signature
  // For subscriptions: razorpay_payment_id|razorpay_subscription_id
  // For standard orders: razorpay_order_id|razorpay_payment_id
  const payloadToSign = isSubscription
    ? `${razorpay_payment_id}|${razorpay_subscription_id}`
    : `${razorpay_order_id}|${razorpay_payment_id}`;

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(payloadToSign)
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

    // Handle Subscription Verification
    if (isSubscription) {
      const caller = await getUserFromRequest(req, admin);
      const { data: subRecord, error: subError } = await admin
        .from('user_subscriptions')
        .select('user_id, plan_code')
        .eq('razorpay_subscription_id', razorpay_subscription_id)
        .maybeSingle();

      if (subError) throw subError;
      if (caller && subRecord && caller.id !== subRecord.user_id) {
        console.warn('[VERIFY PAYMENT] subscription ownership mismatch', razorpay_subscription_id);
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ success: false, error: 'Subscription ownership mismatch' }));
        return;
      }

      const durationDays = subRecord?.plan_code?.includes('annual') ? 365 : 30;
      const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      await admin.from('user_subscriptions').update({
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      }).eq('razorpay_subscription_id', razorpay_subscription_id);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        message: 'Subscription verified successfully',
        subscription_id: razorpay_subscription_id,
        payment_id: razorpay_payment_id,
        plan_code: subRecord?.plan_code || null,
      }));
      return;
    }

    const razorpay = getRazorpay();
    if (!razorpay) throw Object.assign(new Error('Razorpay not configured'), { code: 'STORE_UNAVAILABLE' });

    // Step 2: check order record for one-time payments
    const { data: orderRecord, error: orderError } = await admin
      .from('payment_orders')
      .select('razorpay_order_id, amount_paise, currency, status, user_id, plan_id')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();
    if (orderError) throw orderError;

    // Step 3: check ownership for user-bound orders (donations skip this)
    if (orderRecord?.user_id) {
      const caller = await getUserFromRequest(req, admin);
      if (!caller || caller.id !== orderRecord.user_id) {
        console.warn('[VERIFY PAYMENT] caller does not own order', razorpay_order_id);
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ success: false, error: 'Payment could not be confirmed' }));
        return;
      }
    }

    // Step 4: confirm the order and payment with Razorpay
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

    // Step 5: idempotent fulfilment.
    const fulfilment = await fulfilPayment(admin, {
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
      payment_captured: true,
      credits_granted: fulfilment.creditsGranted === true,
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
