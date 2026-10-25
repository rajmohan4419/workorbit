/* global Buffer */
import { getCorsHeaders } from './_lib/common.js';
import { parseOrderRequest } from './_lib/products.js';
import { getRazorpay, requireAdmin } from './_lib/payments.js';
import crypto from 'crypto';

export async function parseRequestBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
    if (typeof req.body === 'object') {
      return req.body;
    }
  }
  try {
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const bodyStr = Buffer.concat(buffers).toString('utf-8');
    if (bodyStr) return JSON.parse(bodyStr);
  } catch {
    return {};
  }
  return {};
}

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

  const razorpay = getRazorpay();
  if (!razorpay) {
    console.error('[CREATE ORDER] Razorpay credentials missing');
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ error: 'Payments are temporarily unavailable' }));
    return;
  }

  const body = await parseRequestBody(req);
  const parsed = parseOrderRequest(body);
  if (parsed.error) {
    res.writeHead(400, corsHeaders);
    res.end(JSON.stringify({ error: parsed.error }));
    return;
  }

  let admin;
  try {
    admin = requireAdmin();
  } catch {
    res.writeHead(503, corsHeaders);
    res.end(JSON.stringify({ error: 'Payments are temporarily unavailable' }));
    return;
  }

  // Use provided receipt or generate a unique server receipt
  const receipt = parsed.receipt || `rcpt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

  try {
    const order = await razorpay.orders.create({
      amount: parsed.amountPaise,
      currency: parsed.currency,
      receipt,
      notes: { productId: parsed.productId },
    });

    const { error: insertError } = await admin.from('payment_orders').insert({
      razorpay_order_id: order.id,
      product_id: parsed.productId,
      amount_paise: parsed.amountPaise,
      currency: parsed.currency,
      receipt,
      status: 'created',
    });
    if (insertError) {
      // Without a stored record we cannot verify the payment later, so refuse.
      console.error('[CREATE ORDER] could not store order', insertError.message);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Could not start checkout. Please try again.' }));
      return;
    }

    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    }));
  } catch (err) {
    console.error('[CREATE ORDER ERROR]', err?.message || err);
    const statusCode = err?.statusCode === 401 ? 401 : 500;
    res.writeHead(statusCode, corsHeaders);
    res.end(JSON.stringify({ error: err?.error?.description || err?.message || 'Could not start checkout. Please try again.' }));
  }
}
