/* global process, Buffer */
import crypto from 'crypto';
import { getCorsHeaders } from './_lib/common.js';
import { parseRequestBody } from './create-order.js';

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

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.writeHead(401, corsHeaders);
    res.end(JSON.stringify({ error: 'Razorpay API key secret missing' }));
    return;
  }

  const body = await parseRequestBody(req);
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    res.writeHead(400, corsHeaders);
    res.end(
      JSON.stringify({
        error: 'Missing required payment verification fields',
      })
    );
    return;
  }

  try {
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const signatureBuffer = Buffer.from(razorpay_signature, 'utf-8');
    const generatedBuffer = Buffer.from(generatedSignature, 'utf-8');

    const isMatch =
      signatureBuffer.length === generatedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, generatedBuffer);

    if (isMatch) {
      res.writeHead(200, corsHeaders);
      res.end(
        JSON.stringify({
          success: true,
          message: 'Payment verified successfully',
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
        })
      );
    } else {
      res.writeHead(400, corsHeaders);
      res.end(
        JSON.stringify({
          success: false,
          error: 'Invalid payment signature',
        })
      );
    }
  } catch (err) {
    console.error('[VERIFY PAYMENT ERROR]:', err);
    res.writeHead(500, corsHeaders);
    res.end(
      JSON.stringify({
        success: false,
        error: 'Failed to verify payment signature',
      })
    );
  }
}
