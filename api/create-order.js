/* global process */
import Razorpay from 'razorpay';
import { getCorsHeaders } from './_lib/common.js';

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
    const bodyStr = globalThis.Buffer.concat(buffers).toString('utf-8');
    if (bodyStr) return JSON.parse(bodyStr);
  } catch {
    return {};
  }
  return {};
}

export default async function handler(req, res) {
  const origin = req.headers?.origin;
  const corsHeaders = getCorsHeaders(origin);

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

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    res.writeHead(401, corsHeaders);
    res.end(JSON.stringify({ error: 'Razorpay API credentials missing or invalid' }));
    return;
  }

  const body = await parseRequestBody(req);
  const rawAmount = body.amount;
  const amount = Number(rawAmount);

  if (rawAmount === undefined || rawAmount === null || Number.isNaN(amount) || amount < 100) {
    res.writeHead(400, corsHeaders);
    res.end(JSON.stringify({ error: 'Amount must be at least 100 paise' }));
    return;
  }

  const currency = body.currency || 'INR';
  const receipt = body.receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const notes = body.notes || {};

  try {
    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await instance.orders.create({
      amount,
      currency,
      receipt,
      notes,
    });

    res.writeHead(200, corsHeaders);
    res.end(
      JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
      })
    );
  } catch (err) {
    console.error('[CREATE ORDER ERROR]:', err);
    const statusCode = err?.statusCode === 401 ? 401 : 500;
    res.writeHead(statusCode, corsHeaders);
    res.end(
      JSON.stringify({
        error: err?.error?.description || err?.message || 'Failed to create Razorpay order',
      })
    );
  }
}
