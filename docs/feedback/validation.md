# Validation — 2026-11-14

## Automated

- `npm run lint`: passes with no errors or warnings.
- `npm run build`: passes; 7 static routes, 78 live tool pages and 28 variants prerendered. Confetti is a separate ~10.6 KB (~4.2 KB gzip) lazy chunk. Existing large-bundle and Tailwind sourcemap warnings remain.
- `npm test`: 83 files, 883 tests pass. Includes new lifecycle, duplicate guards, measured halfway behavior, cancelled/error retry, stale callbacks, sound default/persistence/audio failures, reduced motion, dialog/fullscreen ownership, auth event deduplication, top-up and donation verification retry, and the server capture/credit completion contract. Existing jsdom canvas/navigation notices are non-failing; actual browser output is checked separately.
- Existing download, payment capture rules, idempotent fulfilment and credit-accounting tests pass. Initial tests before building had three missing-`dist` fixture failures; running the required build resolves them.
- `git diff --check`: passes.

## Chromium browser and visual inspection

Executed against local Vite with synthetic Supabase configuration. All external network services were intercepted or blocked; documents were synthetic and stayed local. Auth/payment boundaries are simulated, not live provider certification.

- Real payslip PDF generation → preview → failed download authorization → retry → actual browser download event. Parsed downloaded PDF with pdf-lib; one valid page. Retry reused the same request ID; PDF credit debit occurred only on authorized initiation in the simulated coordinator.
- Real payslip XLSX generation → actual download; parsed the workbook with SheetJS and verified Payslip sheet. No simulated PDF credit debit for XLSX.
- Fullscreen entry → export → modal: feedback is a descendant of both fullscreen element and active dialog. Cancel triggers no download. Keyboard Escape closes preview; existing focus behavior is retained and the dialog traps Tab.
- Sound starts off, explicit opt-in persists through reload, and switching off persists. No third-party audio/animation request was made. Unit tests cover audio failures and overlap prevention.
- 390×844 mobile with reduced motion: readable compact static feedback, hidden confetti, no horizontal page overflow. Desktop/fullscreen/mobile screenshots visually inspected.
- Real four-page PDF page editor rendering reported 2/4 as halfway, then removed halfway wording at 4/4. No estimated percentage is used for indeterminate work.
- TXT-to-PDF produced a valid one-page PDF. While exercising this flow, fixed pre-existing string-vs-lines handling and PDF object-reference initialization in the shared text PDF generator.
- Synthetic Razorpay: checkout callbacks alone did not celebrate; duplicate callbacks sent one verification request; dismiss during verification did not cancel it; `{success:true}` without capture/credits did not celebrate; retry required `payment_captured:true` and `credits_granted:true`, without creating another order.
- Synthetic Google popup: pending button disabled; cancellation retained the form and permitted retry; the real Supabase client emitted SIGNED_IN only after simulated session completion, then feedback announced “You’re signed in.” Restored/duplicate events are also covered by unit tests. Opener isolation is retained; users close a detached Google window themselves after cancellation because Chromium rejects parent-driven close after opener removal.
- AdSense: verification meta present; zero scripts on About; exactly one script on the eligible payslip tool. Tax article now matches the calculator's AY 2026–27 slabs and rebate.
- No uncaught browser errors or unsafe popup-navigation console errors.

The legacy subscription endpoint acknowledges signature verification without the captured-credit contract. Its UI shows a non-celebratory acknowledgement and offers confirmation retry; no payment/credit celebration is inferred from that response. No database migration, production credit mutation, real charge, merge, or production deployment was performed.
