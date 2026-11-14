# PDF download credits

Signed-in users see Account, their purchased PDF limit, lifetime paid units used, remaining units and this month's combined PDF/XLSX download initiations. Historical pilot usage is not retroactively billed. On-screen tools remain free without an account; XLSX stays in the existing authenticated metering pilot.

## Price and checkout

- One PDF file uses one credit, regardless of pages.
- Final customer price: 25 paise per credit. ₹100 minimum = 400 credits.
- Custom INR amounts in ₹0.25 increments; ₹1,00,000 maximum per checkout.
- Processing fees are absorbed, not deducted from credits or added as a checkout surcharge. Razorpay's standard 2% + GST on that fee is a merchant expense, separate from any applicable tax accounting on OrbitBoard's sale. No automated merchant GST invoice or tax allocation is introduced here.
- Weekly / 10 / 100-download placeholder cards are replaced by the approved amount-based top-up.

The server derives paise and credits, authenticates ownership, checks storage availability, creates an INR Razorpay order and persists it before returning checkout details. The browser sends no authoritative user ID, credit count or price. Existing checkout-signature verification checks the stored order, ownership and captured payment via Razorpay. Both verification and payment.captured webhooks call the same fulfilment path. A paid order can be replayed safely; each order and payment grants credits only once. Failed fulfilment returns an error so the webhook can retry. Payment confirmation can also be retried without paying again.

The service-role-only SECURITY INVOKER functions check captured payment records before granting. A per-account transaction lock serializes credit grants and PDF debits. Each download request ID is charged once; all usage and debit writes commit together. Insufficient balance returns HTTP 402. Preview displays the cost before the user confirms and opens account/top-up in a new tab so the document remains in memory.

The counter records browser download initiation, not successful disk saving. It does not upload document contents or prove file delivery. Keep the request ID when retrying after a network error.

## Rollout and verification

Migration `20261114124937_pdf_download_credits.sql` was applied to the existing project before app deployment. It is additive: existing production metering remains unaffected until the new API deploys. No users were credited or charged by the migration. Rollback-only synthetic database checks passed: zero-balance denial, ₹100 = 400 units, duplicate payment replay, single debit / duplicate download replay, exhausted denial and denied direct client function/write grants.

Existing Razorpay keys and the payment.captured webhook secret/endpoint are reused. Confirm a Razorpay test-mode payment, retry verification, webhook replay and the account balance on the deployment before live commercial checkout. No real payment was made during development. Paid subscriptions retain their existing workflow entitlements; this PDF credit balance is independent of those workflow allowances.

Security advisors found no findings for the new tables/functions. Pre-existing project findings were unchanged: public telemetry SECURITY DEFINER functions, member/business helper functions and disabled leaked-password protection. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . These existing items are outside this payment change.
