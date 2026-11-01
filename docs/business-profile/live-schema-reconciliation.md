# Live Supabase reconciliation — 2026-11-01
Project: WorkOrbit (tvgatwhydoseekkosgkb), PostgreSQL 17.

## Read-only live audit
- Public base tables (10): app_logs, entitlement_events, market_cache, payment_orders, payments, plans, rate_limit_buckets, subscription_payments, subscriptions, visitors.
- All ten have RLS enabled.
- Direct client table grants: anon SELECT plans; authenticated SELECT plans, subscriptions. No direct client grants on eight server-only tables; lack of policies is intentional denial.
- Policies: plans_read (active only), subscriptions_read_own (auth.uid() = user_id).
- Live migrations: nine recorded versions, all dated June–July 2026. Repository's September–November SQL migrations are not represented in this migration history. Some schema changes were applied out-of-band.
- Repository's user_subscriptions, usage_counters, usage_events are absent live. Existing subscriptions, subscription_payments and entitlement_events are present. DO NOT rename/drop/replay billing migrations without a dedicated compatibility audit.
- The public SECURITY DEFINER check_rate_limit RPC accepts caller-supplied limits, keys and windows. GitHub server code invokes it with service role only. Revoke PUBLIC/anon/authenticated EXECUTE and retain service_role.
- log_app_event and record_visit are invoked by public browser telemetry; their privileged execution needs a dedicated authenticated proxy or constrained design before revocation. No production change proposed for them yet.

## Safe deployment sequence
1. Apply only 202611010004_rate_limit_rpc_privileges.sql and verify privileges.
2. Confirm server rate-limiting endpoints still work with service-role configuration.
3. Keep legacy subscriptions and billing untouched.
4. Review 202611010003_business_profile_foundation.sql before applying: its privileged RPCs are deliberately callable by authenticated users, requiring role checks, search_path hardening and cross-tenant integration tests.
5. Deploy business schema in a separate reviewed migration and test with two isolated test accounts.
6. Replace public telemetry SECURITY DEFINER RPCs with a narrowly scoped backend route or restricted implementation; then revoke their public EXECUTE.
7. Run Supabase security and performance advisors after each deployment.

No customer data deletion or automatic migration-history repair is part of this change.
