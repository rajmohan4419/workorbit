import crypto from 'crypto';
import { requireAdmin } from './payments.js';
import { getUserFromRequest, getPlan } from './entitlements.js';

// Pass orders are recorded under this product id. Donations keep their own ids.
export const PASS_PRODUCT_ID = 'orbitboard-pro';

/** True when a create-order request is for a Pro plan rather than a donation. */
export function isPassOrderRequest(body) {
  return body?.planId !== undefined;
}

/** Validate only the shape of the plan id. Price and access come from the database. */
export function parsePassOrderRequest(body) {
  const planId = typeof body?.planId === 'string' ? body.planId.trim() : '';
  if (!/^[a-z0-9_]{1,64}$/.test(planId)) {
    return { error: 'Unknown plan' };
  }
  return { planId };
}

/**
 * Creates a Razorpay order for a pass and records who is buying it.
 * Returns { status, body } so the caller can write the HTTP response.
 */
export async function createPassOrder({ req, body, razorpay }) {
  const parsed = parsePassOrderRequest(body);
  if (parsed.error) {
    return { status: 400, body: { error: parsed.error } };
  }

  if (!razorpay) {
    return { status: 500, body: { error: 'Payments are temporarily unavailable' } };
  }

  let admin;
  try {
    admin = requireAdmin();
  } catch {
    return { status: 503, body: { error: 'Payments are temporarily unavailable' } };
  }

  const user = await getUserFromRequest(req, admin);
  if (!user) {
    return { status: 401, body: { error: 'sign_in_required' } };
  }

  let plan;
  try {
    plan = await getPlan(admin, parsed.planId);
  } catch (err) {
    console.error('[PASS ORDER] plan lookup failed', err?.message || err);
    return { status: 500, body: { error: 'Could not start checkout. Please try again.' } };
  }
  if (!plan || !plan.active || plan.kind !== 'pass') {
    return { status: 400, body: { error: 'Unknown plan' } };
  }

  const receipt = `pro_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

  try {
    const order = await razorpay.orders.create({
      amount: plan.amount_paise,
      currency: plan.currency,
      receipt,
      notes: { plan_id: plan.id },
    });

    const { error: insertError } = await admin.from('payment_orders').insert({
      razorpay_order_id: order.id,
      product_id: PASS_PRODUCT_ID,
      amount_paise: plan.amount_paise,
      currency: plan.currency,
      receipt,
      status: 'created',
      user_id: user.id,
      plan_id: plan.id,
    });
    if (insertError) {
      // Without a stored order we cannot bind or verify the payment later.
      console.error('[PASS ORDER] could not store order', insertError.message);
      return { status: 500, body: { error: 'Could not start checkout. Please try again.' } };
    }

    return {
      status: 200,
      body: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        plan_id: plan.id,
      },
    };
  } catch (err) {
    console.error('[PASS ORDER ERROR]', err?.message || err);
    const statusCode = err?.statusCode === 401 ? 401 : 500;
    return {
      status: statusCode,
      body: { error: err?.error?.description || 'Could not start checkout. Please try again.' },
    };
  }
}
