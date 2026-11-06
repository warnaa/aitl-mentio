Closes #41
Closes #53
Refs #71
Tracking plan: .ai/runs/2026-11-06-booking-payments-implementation.md
Source doc: .ai/specs/2026-11-06-booking-payments.md
Reporting source doc: .ai/specs/2026-11-06-paid-session-reporting.md
Status: complete

## 🎯 Goal
Let a mentee pay for reserved mentor time through Stripe Checkout, with verified idempotent confirmation and safe recovery when provider responses or webhooks are delayed.

## What Changed
- Durable payment attempts, event/charge identity and submission evidence protect mentor time across retries, lost responses, provider expiry, delayed callbacks and operator review. Confirmation uses current verified exact-price/currency/environment evidence and cannot duplicate a payment.
- The real Stripe SDK stays in the app behind core's port; absent configuration fails closed. SDK automatic retries are disabled so every possible creation is durably accounted for. Only completed full-refund evidence can support manual release; this feature never issues a refund.
- Guarded Checkout/webhook/participant/operator routes expose truthful pending/confirmed/review states, scoped session visibility and audited exception resolution. Both owner-requested weekly views and the booking-to-start median appear on the operator dashboard.
- Generated reversible migrations, explicit CI/test environment pins, compatibility notes, operational recovery/rollback instructions, documented integration cases and sanitized visual/coverage records accompany the change. The existing native Node classifier test now runs with its correct runner; an existing asynchronous focus assertion waits for its effect instead of racing it.

## 🧪 Tests
- Final configured gate passed in order: typecheck, lint (zero errors), npm test (1,584 tests/181 files plus four native Node tests), production build. Full measured per-file coverage is 100% in all four metrics; the extra actual-SDK signature test is included in the final unit count.
- Full native integration passed 81 tests/40 files including money, migrations and the real concurrent-retry regression. That run predates the later reporting addition; the final-source scoped pass passed report aggregation, definitive rejection, operator report API and existing admin consumer (four tests/files).
- Browser evidence covers participant pending/confirmed/review/empty states, operator empty/populated/review states, real denied access, keyboard refresh and desktop/320px layouts. Injected fetch faults test UI loading/error feedback only. Screenshots and exact source/result boundaries are in `.ai/qa/PAYMENTS/`.
- No live Stripe charge/refund, production deployment, human money-review approval or risk-high manual QA sign-off is claimed. Dependency audit advisories match the unchanged base lock (28); Stripe adds none.

## 💥 Breaking Changes
The fixed unpaid reservation hold changes once Checkout begins to the owner-approved 31-minute provider-aligned window ending at least 30 minutes before session start; provider truth must establish safe release. The bounded raw webhook is the documented plain-response/CSRF exception. Schema is additive with defaults and reversible generated migrations. Rollback requires disabling payment entry, reconciling in-flight sessions and exporting payment/audit history before dropping fields/tables. See `docs/payments-operations.md`; schedule the bounded reconciliation CLI before paid traffic.

## 📋 Decisions touched
D04/R05 Stripe; R08/R21 stored PLN prices; R15/D22 booking/payment/start timestamps. The owner approved Q1/Q2 and both labelled weekly views. Neither view is declared D16's official target. Fee split, payout, cancellation/refund execution and notifications remain their separate stories.

## 📋 Progress
See the tracking plan. Independent automated source reviews are addressed; a second person's money review and a QA reviewer must still approve this risk-high change. No merge or deployment is authorized.
