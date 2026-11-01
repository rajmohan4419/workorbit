# OrbitBoard Business Profile — Foundation
Branch: feature/business-profile-foundation

## Repository review
- Supabase client: src/lib/supabase.js, uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
- Existing subscriptions: user_subscriptions are scoped to auth.users; do not change existing billing semantics.
- React routes: src/App.jsx; business routes should be isolated from public tools.
- Existing monetization RLS: read-own subscriptions and usage, server-side mutations.
- Live Supabase schema and Auth provider settings have NOT been verified.

## Migration
Review and apply supabase/migrations/202611010003_business_profile_foundation.sql in a staging Supabase environment first. This migration is intentionally not auto-deployed.

## Security model
- Users are auth.users, businesses are separate tenants.
- Creation uses authenticated RPC, inserts owner membership atomically.
- No direct authenticated INSERT/UPDATE/DELETE grants on tenant or membership tables.
- Reads are RLS-scoped to members using a security-definer helper.
- Future member invitations and profile edits require dedicated validated RPCs.
- Never expose service-role keys in Vite/browser code.

## Next implementation steps
1. Verify existing live schema, auth settings, and migrations.
2. Add /business/login, /business/onboarding, /business dashboard routes.
3. Build session handling and email verification/forgot-password flows.
4. Add business selector and profile read via Supabase client.
5. Add RLS tests: unauthenticated denial, cross-tenant denial, owner bootstrap, forged role, duplicate membership.
6. Add customer directory and business billing only after foundation passes review.

## Notes
GSTIN regex is only a format check, not GST registration verification. No automatic GSTIN lookup or E-waybill generation is included.
