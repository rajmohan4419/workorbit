# OrbitBoard foundation audit and implementation — 15 November 2026

Branch: `fix/catalogue-reconciliation-foundation`. Base: `282f1d9` (PR #242's resolved Excel branch, including main at `ab35020`). No AGENTS.md was found in the checkout or applicable parent directories. No merge to main, push, deployment, database mutation, billing change, or new tool was performed.

## Verified findings and changes

- `src/data/toolCatalog.js` originally held **350 entries: 78 live / 272 planned**. Listings/search/category counts already used `LISTED_TOOLS`, and the sitemap already excluded planned entries. However, `src/pages/ToolPageRoute.jsx` resolved planned entries and rendered public coming-soon pages. Unreleased ideas now live in `docs/planning/unreleased-tools.json`, outside the runtime catalogue. Unavailable URLs render NotFound with client noindex and receive `X-Robots-Tag: noindex, follow` from `vercel.json`. This is an indexing strategy for the existing SPA fallback, not a claim of HTTP 404 on Vercel. Unknown URLs outside this explicit set still use the existing SPA behavior.
- Public catalogue now has **77 canonical tools**, **28 parameter variants**, and **7 static sitemap routes = 112 unique sitemap URLs**. Working image-to-GIF intents had separate implementations at `src/tools/everyday/GifMaker.jsx` and `src/tools/media/GifTools.jsx`; `/tools/image-to-gif` now redirects to `/tools/gif-maker`. The other verified aliases (PDF merge/split/extract/reorder/text, JPG-to-PDF, EXIF removal) point to their existing implementations. Every `SLUG_REDIRECTS` target is live; obsolete aliases to unimplemented tools were removed. Vercel permanent redirects and client redirects agree. Existing canonical working URLs remain. Registry, implementation keys, rendered canonical tags and sitemap are tested together.
- `src/App.jsx` has no Market Lab or Business Portal routes. Neither is in the public catalogue. They remain unavailable/noindex. There are no routed project-management/kanban components in this checkout. Repository searches found no imports of `@hello-pangea/dnd`, `@supabase/auth-ui-react`, or `@supabase/auth-ui-shared`; only unused dependency declarations remained. Removed those packages and their lockfile-only dependencies. Preserved Supabase client, custom account/auth components, storage/business components and all migrations. `src/tools/spreadsheet/SpreadsheetEditor.jsx` is unreferenced but is not project-management code; left it intact.
- `package.json` and `package-lock.json` used npm `xlsx` 0.18.5. npm audit confirmed prototype pollution and ReDoS advisories. Migrated to the official **0.20.3** tarball vendored in `vendor/`, installed at build time with lockfile integrity. No executable CDN script is fetched at runtime. The npm registry copy is stale; the official distribution is required even if a scanner's package range is imprecise. See `vendor/README.md` for provenance and digest.
- `src/engines/financeImport.js` / `src/components/tools/FinanceFileImport.jsx` already offered staged worksheet/header selection, mapping, preview and confirmation. Extended that architecture: explicit date convention for ambiguous numeric dates; rejected/duplicate rows block activation; confirmed imports commit once even under repeated synchronous clicks; parse failures retain the active source. Cancel/reset/retry and stale requests are guarded.
- `src/engines/workbookReader.js` and `.worker.js` isolate browser parsing and terminate a stalled parser after 15 seconds. Central dimension checks run before grid extraction. Limits: finance/converters 10 MB / 10,000 data rows; general processor 25 MB / 50,000 rows; 256 columns, 30 worksheets, 2 million rectangular cells per workbook. Bank matching additionally limits each source to 2,000 rows, the pair product to 500,000 candidate comparisons, reference length to 256 and narration to 1,000 characters. Bounds are processing safeguards, not pricing/export gates. Large files must be split into matching periods. Parsing is in a worker; row edits, validation, matching and export still run on the main thread within these limits.
- CSV values are read raw, including leading zeros and long identifiers. Explicit zero-padding number formats in XLSX cells are retained. A numeric identifier that Excel has already rounded cannot be recovered; users are told to keep identifiers as text. Synthetic regression tests exercise both CSV and XLSX.
- `src/engines/financeValidation.js`: validated Indian/western grouping, currency symbols, parenthesized negatives; money uses integer paise and decimal half-away-from-zero rounding. Invalid amounts never become zero transactions. Exact-money aggregate bounds fail with errors. Dates accept ISO, day-first numeric and day-month-name forms; staged imports require an explicit DMY/MDY choice when a numeric date has two possible interpretations. General processor validation explicitly uses day-first dates and states this convention.
- `src/engines/bankReconciliationEngine.js` previously marked ambiguous winners reconciled and consumed candidates. Proposals now consider the complete source sets and require uniqueness in both directions. Ambiguous candidates do not count as confirmed matches, remain unmatched, cannot produce a reconciled status, and are exported separately with candidate row references. Balance totals use exact paise. Adjustment labels remain assumptions requiring review, not accounting entries automatically posted to books.
- `src/tools/finance/gstrReconciliationEngine.js` already preserved duplicate/colliding invoice keys for review and distinguished missing tax from zero. Retained that narrower scope and made normalization, component differences and totals deterministic in paise. UI catches processing/aggregate errors and keeps sources available. Raw GST portal JSON, credit/debit notes, amendments, imports and ISD remain unsupported. Matching uploaded files does not determine ITC eligibility. Invoice date is optional in this engine; invalid supplied dates reject, but date equality is not a matching condition.
- `src/pages/PrivacyPolicy.jsx` overstated anonymity and universal locality. The actual `src/lib/telemetry.js` sends page paths with a persistent pseudonymous visitor ID, while account/download paths process separate metadata. Some calculators encode inputs into URLs (`IndiaIncomeTaxCalculator`, `CareerTools`, `FinanceTools`). Privacy wording now distinguishes local finance files, account metadata, analytics vendors and explicitly shared URLs. No new file transmission or AI/OCR integration was added. Analytics/advertising vendors can receive browser/network metadata; this audit does not certify all existing third-party collection practices.

## Tax rule verification (2026-11-15)

Only ordinary-rate individual income is modelled. No global rate replacement or AY-to-TY string replacement was made.

- `src/lib/tax/india.js` records period labels, effective income dates, applicable Act, rebate section, rule-source URL and verification date. Supports AY 2025–26 (income FY 2024–25), AY 2026–27 (income FY 2025–26), and **Tax Year 2026–27** (income FY 2026–27 under the Income-tax Act, 2025). `IndiaIncomeTaxCalculator.jsx` exposes period selection. Corrected nonresident old-regime rebate/age treatment, new-regime ordinary deductions, rebate marginal relief and surcharge marginal relief. Salary/payslip/CTC variants share the AY 2026–27 estimator rather than separate drifting slab copies. Payroll widgets remain explicitly scoped to FY 2025–26; they do not offer historical/current-period payroll filing support.
- `tdsEngine.js` had historical thresholds and 5% commission TDS while claiming FY 2025–26/2026–27 support. Updated the **FY 2025–26** subset: bank/post-office interest ₹50,000 / senior ₹1 lakh; 194H ₹20,000 and 2%; 194-I ₹50,000 **per month or part month**; 194J ₹50,000. Missing PAN does not create withholding on a payment below the applicable threshold. UI states the amount basis and scope. No-PAN salary, contractor annual aggregation, payer exemptions/certificates/treaties and TY 2026–27 section migration require further work; current-year TDS support is not claimed.
- GST guidance incorrectly described four historical tiers as universally current. Updated the guide and lookup context to reflect the reform effective 22 September 2025, without changing historical snapshot rows. `public/data/gst/manifest.json` keeps `effectiveDateVerified:false` and records a separately sourced reform context. No blanket HSN/SAC rate application is certified. The calculator/invoice accepts manually selected rates; the reference UI continues to require applicability review. Classification, compensation cess and later notifications remain unresolved per-entry questions.

Official references reviewed:

1. SheetJS installation and vendoring: https://docs.sheetjs.com/docs/getting-started/installation/nodejs/
2. Advisory CVE-2023-30533: https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
3. Advisory CVE-2024-22363: https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
4. AY 2025–26 rates: https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-3
5. AY 2026–27 rates: https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1
6. New Act transition: https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/objective-and-scope-new-act-faq
7. Current Act (including sections 156 and 202): https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf
8. Ordinary-income relief: https://wm.incometaxindia.gov.in/w/computation-of-tax-for-individual-1
9. Finance Act 2025 TDS thresholds: https://incometaxindia.gov.in/news/highlights-to-finance-act-2025.pdf
10. TDS rates: https://www.incometaxindia.gov.in/w/tds-rates-1
11. PAN provision: https://www.incometaxindia.gov.in/hi/w/section-206aa-15
12. GST reform effective dates/qualifications: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163560&lang=1&reg=6

## Separate future database proposal

No database cleanup executed. Before proposing a migration, inventory legacy tables, their foreign keys, RLS policies, functions and storage references; check active application/consumer usage and retention obligations with the owner; take a restorable backup; then review an isolated reversible archival migration. Historical migrations and production data must remain untouched in this task.

## Recommended next milestone

Invoice-to-cash with saved customers/items and invoice status/history. Evidence: the existing GST invoice workflow (`src/tools/business/GstInvoice.jsx`) and CSV invoice-aging report (`src/tools/business/BusinessWorkflows.jsx and invoiceAging.js`) already cover adjacent steps. Saving reusable business data is a more coherent next paid workflow than export restrictions. This milestone is a proposal only.

## Validation actually run

- Baseline: `npm test` — 84 files / 892 tests passed; `npm run lint` passed.
- Initial `npm audit --json`: one high-severity package, xlsx, with the two advisories above. Post-migration audit: **0 vulnerabilities**. `npm ls xlsx --depth=0` confirms **0.20.3**; removed UI dependencies are absent.
- Final `npm run lint`: passed. No dedicated typecheck script is configured; the TypeScript variant generator was executed by the production build, not claimed as a standalone typecheck.
- Final `npm run build`: exit 0; 77 live pages / 28 variants / 112 sitemap URLs. Existing large-chunk/Tailwind sourcemap warnings and the sandbox's Vite websocket-bind warning remain; prerendering completes. No production deployment was performed to verify HTTP response headers.
- Final `npm test -- --maxWorkers=4`: **88 test files / 910 tests passed**. Bounded concurrency avoids starving the existing long-running invoice PDF test. Existing jsdom canvas/scroll/navigation notices are not browser checks.
- Added focused tests for worker termination and retry; patched parser CSV/XLSX round trips, explicit zero-padding and text identifiers; date ambiguity and invalid MDY handling; exact decimal rounding/totals; malformed input and dimension bounds; mutual candidate ambiguity; matching work limits; import rejection/confirmation/double-click guards; period-specific tax and relief; canonical catalogue/sitemap/redirect/noindex configuration. Updated legacy tests that asserted public coming-soon pages and superseded tax thresholds.
- Real Chrome functional verification against the local app: XLSX worksheet selection → ambiguous-date block → explicit DMY review → column mapping/confirmation → bank reconciliation (2 matches / 1 unmatched) → XLSX report generation and content inspection. Also checked invalid replacement retains the source, reset, duplicate confirmation blocking, GSTR CSV review/export, generic Excel import/mapping/CSV export, unavailable noindex route and alias navigation. **No page errors and no POST requests during this synthetic flow.** The browser inspected generated local export blobs at the existing preview boundary; it did not sign in or bypass the account gate to execute a metered download. Unit tests continue to cover the existing account coordinator. Browser screenshots were not used to claim visual/layout QA.
- `git diff --check`: passed.

## Changed files

- `docs/audits/2026-11-15-foundation.md`
- `docs/excel-engine.md`
- `docs/planning/retired-routes.json`
- `docs/planning/unreleased-tools.json`
- `package-lock.json`
- `package.json`
- `public/404.html`
- `public/data/gst/manifest.json`
- `public/sitemap.xml`
- `scripts/generate-tool-variants.ts`
- `scripts/prerender-tools.mjs`
- `src/components/gst/GstReference.jsx`
- `src/components/tools/FinanceFileImport.jsx`
- `src/components/tools/FinanceFileImport.test.jsx`
- `src/data/catalogueAvailability.test.js`
- `src/data/sitemap.test.js`
- `src/data/toolCatalog.js`
- `src/data/toolContent.jsx`
- `src/engines/bankReconciliationEngine.js`
- `src/engines/excelEngine.js`
- `src/engines/financeImport.js`
- `src/engines/financeValidation.js`
- `src/engines/foundation.test.js`
- `src/engines/spreadsheet.js`
- `src/engines/workbookReader.js`
- `src/engines/workbookReader.worker.js`
- `src/lib/tax/india.js`
- `src/lib/tax/india.test.js`
- `src/pages/NotFound.jsx`
- `src/pages/PrivacyPolicy.jsx`
- `src/pages/ToolPageRoute.jsx`
- `src/tools/business/BankReconciliation.jsx`
- `src/tools/career/CareerTools.jsx`
- `src/tools/everyday/EverydayTools.jsx`
- `src/tools/finance/GstrReconciliation.jsx`
- `src/tools/finance/IndiaIncomeTaxCalculator.jsx`
- `src/tools/finance/TdsCalculator.jsx`
- `src/tools/finance/gstrReconciliationEngine.js`
- `src/tools/finance/payslipEngine.js`
- `src/tools/finance/tdsEngine.js`
- `src/tools/finance/tdsEngine.test.js`
- `src/tools/spreadsheet/ExcelEngineWorkspace.jsx`
- `tests/adversarial_m2.test.js`
- `tests/adversarial_m3.test.js`
- `tests/adversarial_m3_challenger2.test.jsx`
- `tests/e2e/tier1_features.test.js`
- `tests/e2e/tier5_adversarial_challenger2.test.js`
- `tests/e2e/tier5_adversarial_coverage.test.js`
- `vendor/README.md`
- `vendor/xlsx-0.20.3.tgz`
- `vercel.json`
