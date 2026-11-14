# Task feedback

`useTaskFeedback(context)` provides an explicit idle → processing → success/error/cancelled lifecycle. `begin()` returns an attempt-scoped handle or `null` if already processing. Terminal callbacks and callbacks from old attempts are ignored. `useExportFeedback(context).run(generator, format, successLabel?)` starts before generation, yields for rendering, prevents duplicate submissions and catches generation failures. It does not authorize exports or modify credits.

`TaskFeedback` renders once at the app root. Its portal follows fullscreen and the active modal without stealing focus. Significant stages use a polite live region; rotating decorative copy is excluded from announcements. Numeric progress is optional and supplied only from measured work. Halfway wording appears only within 45–55% measured completion; other work uses named stages. Reduced motion suppresses confetti and CSS animation. Audio is synthesized locally, off by default, opt-in persisted as `orbitboard:feedback-sound`, unlocked by interaction, quiet and non-overlapping. Audio errors never propagate to actions.

## Integration map

- `GlobalPreviewModal`: every shared `downloadBlob` preview and authorized download; same request ID is retained across failed authorization/retry. File readiness and browser download initiation are separate events.
- `PdfTools`, `PdfESign`: generation, merge/extract/split/reorder/compress, rendering and text extraction. PDF page rendering supplies measured progress.
- `PayslipGenerator`, `SalarySheet`, `GstrReconciliation`, `GstInvoice`, `SpreadsheetFileTool`, `ExcelEngineWorkspace`: payroll, business, PDF and XLSX exports. Shared developer `ExportActions` covers text/CSV exports.
- `DownloadAccountForm`: Google popup and email auth. Google success requires `SIGNED_IN` during an explicit pending attempt; token refresh/restored sessions do not celebrate. Popup closure/cancellation releases the submission lock.
- `PdfTopup`: captured payment plus completed server-side credit grant required. Pending confirmations retain the payment response for a retry without creating another order. Duplicate callbacks/dismiss events cannot celebrate twice.
- `RazorpayCheckout`: captured one-time payments only, retryable verification and duplicate guards. `Pricing`'s legacy subscription response is a verification acknowledgement, not a captured-credit signal, and deliberately has no celebration.

No animation service receives document data. No feedback code performs entitlement checks or credit debits. Existing server payment capture validation and idempotent `grant_pdf_topup`/`grant_pass` calls are retained. The payment endpoint exposes `payment_captured` and `credits_granted` only after these existing checks and fulfilment return successfully.

## Documentation and licences checked (2026-11-14)

- [canvas-confetti README](https://github.com/catdad/canvas-confetti#readme): custom canvas, `disableForReducedMotion`, `reset`. Installed exact version is in `package.json`; lazy-loaded with a scoped, non-worker canvas. [ISC licence](https://github.com/catdad/canvas-confetti/blob/master/LICENSE), notice preserved in `public/licenses/canvas-confetti.txt`.
- [Magic UI Shimmer Button](https://magicui.design/docs/components/shimmer-button), [MIT licence](https://github.com/magicuidesign/magicui/blob/main/LICENSE.md): considered for button/progress effects. Small original CSS sheen and SVG check effects fit React + Vite without copying components or adding its motion dependencies.
- [LottieFiles runtimes](https://docs.lottiefiles.com/en), [dotlottie-web MIT licence](https://github.com/LottieFiles/dotlottie-web/blob/main/LICENSE), [animation licensing](https://help.lottiefiles.com/animation-licensing-basics-): considered; no Lottie player or third-party animation assets added because this feedback needs only a small spinner/checkmark. Free animation assets have their own Lottie Simple License, separate from the player licence.
- [Web Audio AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext): user gesture gating and cleanup. No audio files or third-party audio requests.
- [Supabase auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) and [changelog](https://supabase.com/changelog.md): use explicit pending attempts because SIGNED_IN can be emitted repeatedly.
- [AdSense site verification](https://support.google.com/adsense/answer/7584263?hl=en): static account meta tag preserves verification while script execution remains gated to eligible tools.
- [Income Tax Department AY 2026–27](https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1): corrected guide to the ₹4L initial slab and resident ordinary-income ₹12L rebate threshold; CTC article now identifies FY 2025–26 explicitly.

## Validation

See `validation.md` for executed checks and limits. Browser payments/auth are simulated external services; no live charge, production credit mutation, merge or production deployment is performed.
