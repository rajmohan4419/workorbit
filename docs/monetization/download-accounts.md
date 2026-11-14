# Account-first PDF/XLSX downloads

## Product behaviour

On-screen tool use stays anonymous and free. PDF/XLSX download actions open an inline signup/sign-in dialog before exposing the downloadable blob preview. Email confirmation leaves the generated file in the original tab; the user must keep that tab open and sign in there. The separate `/account` route shows monthly download starts and does not expose the hidden Business Portal.

The current release is **metering only**: no new free allowance, weekly price, download-credit price, expiry, quota, or recurring debit has been approved. `DOWNLOAD_OFFERS` prepares weekly access and 10/100 combined PDF/XLSX top-ups with null prices and disabled checkout. They are deliberately absent from the billable plan/order allowlist. Do not enable these cards by adding a price alone; credit fulfilment, reservation/refund, expiry and usage policy need implementation and validation first. Existing paid plans remain separate.

## Data flow

`downloadBlob` / `downloadSpreadsheetBlob` → queued `GlobalPreviewModal` → Supabase account → user confirmation → authenticated POST `/api/downloads` → service-role-only `record_document_download` → browser file handoff. The API verifies the user with `auth.getUser`, rejects anonymous Supabase users, whitelists tool identifiers and accepts only PDF/XLSX formats. Client-provided user IDs, amounts, limits and document contents are ignored. If metering fails, the download is blocked and the same file/request ID can be retried.

Each confirmed file is one download, independent of its page/sheet count. A batch of separate files queues each file rather than overwriting earlier outputs. Cancellation and file-generation errors do not count. A stable UUID per queued file makes transport retries idempotent. In-flight confirmation clicks are coalesced.

The database serializes same-account writes with a transaction advisory lock. Event insertion and monthly counter increment are atomic; repeated request IDs do not increment twice. Counters use UTC calendar months. Table RLS permits owner reads only; anon has no table access, signed-in clients cannot write, and only service_role can execute the metering function. No SECURITY DEFINER is used.

Only user ID, format, known tool identifier, request ID and timestamps are recorded. No original filenames, source PDFs, workbook data, passwords or invoice/bank details are sent for metering. Auth email is handled by Supabase Auth. The privacy page describes the additional account data.

## Accuracy boundary

The counter measures authorised **download initiations**, not proof that an OS saved a file. Browsers can cancel or block downloads after handoff. Client-generated files can also be saved or reconstructed outside the supported UI, including from browser developer tools or a PDF viewer. This is account-linked product metering, not tamper-proof DRM or secure enforcement of a paid quota. Do not bill from client telemetry alone.

## Deployment

Migration `20261114110100_account_download_metering.sql` was applied to the connected WorkOrbit database as `account_download_metering`. Its filename matches the hosted migration version. It creates only usage tables and the recorder function; it does not apply the older payment/subscription foundation migration. No historical usage is backfilled.

Required existing deployment configuration: frontend Supabase URL/publishable (or legacy anon) key, server Supabase URL and service-role key. Never expose the service-role key in frontend variables. Ensure Supabase Auth allows the deployed `/account` email-confirmation redirect and that email delivery/confirmation work before merging the UI. No new credentials were read or created during implementation.

Validation includes API identity/privacy/error tests, guest-to-account/file-retention UI tests, retries, queueing, non-document anonymous downloads, full regression suite, lint/build, and live SQL rollback tests for atomic counter increments and idempotency using the service_role permission path. Rollback tests left no usage events behind. RLS/ACL checks passed and security advisors reported no findings for the new tables/function. Browser visual QA and real email signup on a deployed preview remain required because local Chromium launch is blocked in this environment.

## Follow-up: entitlement 500 and apparently inactive download button

Production logs confirmed that `/api/entitlement` queried a missing `public.user_subscriptions` table. Applied isolated migration `20261114114421_subscription_read_foundation.sql`; it adds the existing subscription-read schema with owner-read RLS and server-only writes, without creating subscription records, activating plans or changing payment data. The service-role read query and ACL checks passed. No subscriptions now correctly means a free account rather than a schema error.

Live cloud-browser smoke testing confirmed that a complete synthetic invoice reaches the account dialog. Incomplete invoices display validation errors; the follow-up UI patch focuses and scrolls to the error summary on export attempts, so a button at the bottom of the invoice no longer appears inert. Preview/account overlays now portal into the active fullscreen element, which otherwise hides app-root dialogs. Browser download anchors are attached to the document before activation. Tests cover both modal types in fullscreen, exit from fullscreen and validation focus. Full signed-in browser save/email confirmation still requires a live retest; guest UI verification is not proof of a completed authenticated download.
