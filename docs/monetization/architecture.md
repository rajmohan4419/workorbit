# OrbitBoard Hybrid Monetization Architecture

## Commercial model
| Tier | Proposed price | Primary audience |
| --- | ---: | --- |
| Free | ₹0 | Search visitors and occasional users |
| Pro Monthly | ₹249/month | Individuals and power users |
| Pro Annual | ₹1,999/year | Regular individual users |
| Business Monthly | ₹799/month | Small businesses |
| Business Annual | ₹7,999/year | SMEs |

Prices are launch hypotheses, not validated willingness-to-pay. Keep them in the server-owned plan catalogue and validate with conversion data.

## System boundaries
- React/Vite presents plans and feature gates, but is never authoritative for price or access.
- Supabase Auth identifies the customer.
- Vercel serverless endpoints authenticate requests and use the service-role client for privileged database operations.
- PostgreSQL stores subscriptions, payment records, usage counters and audit events.
- Razorpay handles checkout and recurring billing. Webhooks are the authoritative asynchronous payment lifecycle signal.
- AdSense remains restricted to eligible free content pages. Paid subscribers should not receive ads.

## Core entities
- payment_orders: one-time order/payment lifecycle, optionally associated with a user.
- user_subscriptions: one row per Razorpay subscription lifecycle.
- usage_counters: monthly per-user feature consumption.
- usage_events: auditable usage history and idempotency keys.

## Request flow
1. Browser sends a plan code, never an amount, to a server endpoint.
2. Server validates the authenticated user and plan against PLAN_CATALOG.
3. Server resolves the Razorpay plan ID from environment configuration.
4. Server creates a Razorpay subscription and persists a pending local subscription record.
5. Razorpay webhook signature is verified against the raw request body.
6. Webhook handler maps the event to the local subscription and updates status/period dates idempotently.
7. Server resolves entitlements from the trusted subscription record.
8. For metered actions, server checks the plan limit and atomically calls consume_feature_usage.
9. Browser displays the result returned by the server; it cannot self-grant access.

## Security requirements
- Never expose Razorpay secrets or the Supabase service-role key to the browser.
- Do not trust browser-supplied prices, plan names, user IDs, usage counts or entitlement flags.
- Verify Razorpay webhook signatures using the exact raw request body.
- Make webhook processing idempotent and persist event IDs before applying side effects.
- Enforce row-level security on customer-owned records.
- Keep subscription writes and quota consumption service-role-only.
- Do not gate essential free functionality behind deceptive UI or dark patterns.

## Rollout sequence
1. Foundation: schema, server-owned plans, entitlement resolver and tests.
2. Identity: Supabase Auth and secure account-to-payment association.
3. Billing: Razorpay subscription create/verify/webhook lifecycle, cancellation and refunds.
4. Metering: server-side usage enforcement and plan-aware feature gates.
5. Commercial UX: pricing, account billing page, upgrade prompts and receipts.
6. Measurement: funnel events, churn, conversion, ARPPU and per-feature cost.

## Operational notes
Razorpay plan IDs must be created in the Razorpay dashboard and configured as server environment variables. Do not activate live billing until webhook event coverage, cancellation semantics, refund handling, reconciliation and end-to-end tests are complete.
