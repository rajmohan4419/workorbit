/* global Buffer */
import crypto from 'crypto';
import { requireAdmin, fulfilPayment } from '../_lib/payments.js';
import { checkPaymentAgainstOrder } from '../_lib/paymentRules.js';

// Razorpay signs the exact raw body, so it must not be re-serialised by a parser.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  // Server-to-server call: no CORS needed. Respond with plain status codes.
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const secret = globalThis.process?.env?.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Webhook not configured' }));
    return;
  }

  const raw = await readRawBody(req);
  const signature = String(req.headers?.['x-razorpay-signature'] || '');
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const sigBuf = Buffer.from(signature, 'utf-8');
  const expBuf = Buffer.from(expected, 'utf-8');
  const signatureOk = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  if (!signatureOk) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid signature' }));
    return;
  }

  let event;
  try {
    event = JSON.parse(raw.toString('utf-8'));
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  // Only payment.captured changes state here. Other events are acknowledged.
  if (event.event !== 'payment.captured') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true, ignored: event.event }));
    return;
  }

  const payment = event?.payload?.payment?.entity;
  try {
    const admin = requireAdmin();
    const orderId = payment?.order_id;
    const { data: orderRecord, error } = await admin
      .from('payment_orders')
      .select('razorpay_order_id, amount_paise, currency, status')
      .eq('razorpay_order_id', orderId || '')
      .maybeSingle();
    if (error) throw error;

    const check = checkPaymentAgainstOrder({
      orderRecord,
      orderId,
      paymentId: payment?.id,
      payment,
    });
    if (!check.ok) {
      // Acknowledge so Razorpay stops retrying a payment we will never accept.
      console.warn('[RAZORPAY WEBHOOK] rejected:', check.reason, orderId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true, accepted: false }));
      return;
    }

    const { newlyFulfilled } = await fulfilPayment(admin, {
      orderId,
      paymentId: payment.id,
      amountPaise: orderRecord.amount_paise,
      currency: orderRecord.currency,
      source: 'webhook',
    });
    if (newlyFulfilled) {
      // Fulfilment side effects go here, once per order.
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true, accepted: true }));
  } catch (err) {
    // 500 makes Razorpay retry later, which is safe because fulfilment is idempotent.
    console.error('[RAZORPAY WEBHOOK ERROR]', err?.message || err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Processing failed' }));
  }
}
