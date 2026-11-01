/* global Buffer, process */
import { getCorsHeaders } from './_lib/common.js';
import { parseOrderRequest } from './_lib/products.js';
import { getRazorpay, requireAdmin } from './_lib/payments.js';
import { isPassOrderRequest, createPassOrder } from './_lib/passOrders.js';
import { getPlan, getRazorpayPlanId, getPlanPricePaise } from '../src/lib/monetization/planCatalog.js';
import { getUserFromRequest } from './_lib/entitlements.js';
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

  // Commercial subscriptions (Pro / Business monthly & annual)
  const planCode = body?.planCode || body?.plan_code;
  if (typeof planCode === 'string') {
    const catalogPlan = getPlan(planCode);
    if (!catalogPlan || catalogPlan.code === 'free') {
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: 'Invalid subscription plan' }));
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

    const user = await getUserFromRequest(req, admin);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'sign_in_required' }));
      return;
    }

    const rzpPlanId = getRazorpayPlanId(planCode, process.env);
    if (!rzpPlanId) {
      console.warn('[CREATE SUBSCRIPTION] Missing Razorpay plan ID in env for:', planCode);
    }

    try {
      let subscriptionId;
      if (razorpay.subscriptions && typeof razorpay.subscriptions.create === 'function') {
        const sub = await razorpay.subscriptions.create({
          plan_id: rzpPlanId || `plan_${planCode}`,
          total_count: 120,
          customer_notify: 1,
          notes: {
            user_id: user.id,
            plan_code: planCode,
          },
        });
        subscriptionId = sub.id;
      } else {
        subscriptionId = `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      }

      const { error: insertError } = await admin.from('user_subscriptions').insert({
        user_id: user.id,
        plan_code: planCode,
        razorpay_subscription_id: subscriptionId,
        razorpay_plan_id: rzpPlanId || null,
        status: 'created',
        notes: { plan_code: planCode },
      });
      if (insertError) {
        console.warn('[CREATE SUBSCRIPTION] could not insert user_subscription:', insertError.message);
      }

      await admin.from('payment_orders').insert({
        razorpay_order_id: subscriptionId,
        product_id: planCode,
        amount_paise: getPlanPricePaise(planCode) || 0,
        currency: 'INR',
        status: 'created',
        user_id: user.id,
        purchase_type: 'subscription_initial',
        metadata: { subscription_id: subscriptionId, plan_code: planCode },
      });

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        subscription_id: subscriptionId,
        plan_code: planCode,
        key_id: process.env.RAZORPAY_KEY_ID || null,
      }));
      return;
    } catch (err) {
      console.error('[CREATE SUBSCRIPTION ERROR]', err?.message || err);
      const statusCode = err?.statusCode === 401 ? 401 : 500;
      res.writeHead(statusCode, corsHeaders);
      res.end(JSON.stringify({ error: err?.error?.description || err?.message || 'Could not initiate subscription' }));
      return;
    }
  }

  // Pro passes: a signed-in user buys a plan from the legacy catalogue.
  if (isPassOrderRequest(body)) {
    const result = await createPassOrder({ req, body, razorpay });
    res.writeHead(result.status, corsHeaders);
    res.end(JSON.stringify(result.body));
    return;
  }

  // Donations: anonymous, unchanged.
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
