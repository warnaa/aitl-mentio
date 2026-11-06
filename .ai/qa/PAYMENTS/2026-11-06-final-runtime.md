# Final reporting and payment runtime verification

| Corrected exploratory failure | Classification and evidence | Resolution and owner |
| --- | --- | --- |
| Native `find role button focus` was rejected. | Test-tool command issue: installed CLI allowed click/fill/check/hover/text for find, not focus. | Agent/QA corrected it to a fresh accessibility-snapshot ref followed by standalone focus. No application change. |
| Waiting for payment_needs_review timed out. | Test expectation issue: this synthetic amount mismatch correctly exposed amount_mismatch. | Agent/QA corrected the observed diagnostic expectation. No application change. |
| Documented addinitscript command was unavailable. | Tool-version/documentation mismatch: native CLI reported Unknown command. | Agent/QA retained the configured provider and used supported eval-based fetch faults on keyboard refresh. No DOM content was fabricated. |
| QA freshness check rejected a later test-file edit and expired TTL. | Environment safeguard worked: stripe-signature.test.ts changed after startup and descriptor age exceeded its600-second TTL. | Shared; rebuilt using the native helper, then verified matching source fingerprint, live owner and database readiness before final exploration. |

The completed final-source scoped native command passed with **exit0, four files and four tests in38.73s**, starting15:18:57 Europe/Warsaw:

```text
npm run test:integration -- tests/integration/payments-report.integration.test.ts tests/integration/payments-rejected-creation.integration.test.ts tests/integration/payments-report-api.integration.test.ts tests/integration/admin.integration.test.ts
```

PAYMENTS-019 passed real PostgreSQL Warsaw Monday/cohort/median/duplicate-event aggregation. PAYMENTS-020 passed definitive creation rejection with persisted submission evidence and released occupancy. PAYMENTS-021 passed operator200/anonymous401/mentee403, empty/null reporting, one payment after duplicate callbacks, both weekly views, persisted timing median and aggregate-only DTO privacy. The existing admin dashboard/users browser consumer also passed after adding reporting.

The finalized product source is983a351 and the test commit is56279fe; subsequent work here only synchronizes sanitized QA records. No application or test source was edited after the scoped result. Test-induced generated schema-snapshot churn is reported separately to the parent for restoration to the committed generated snapshot.

This complements the earlier [full81-test/40-file run](2026-11-06-full-run.md), which passed Checkout and the unchanged baseline but predates reporting. It does not claim the entire81-test suite was rerun at the reporting source. The final scoped runner rebuilt the actual app and used its own disposable PostgreSQL. Both its infrastructure and the preceding shared QA environment were stopped successfully; only the untouched developer container remained.

## Live final-source report/API evidence

The [sanitized exploration summary](PAYMENTS-report-state-exploration.json) records a source-validated, owned ephemeral QA app: operator report200, anonymous401, mentee403, empty count0/null median, then two synthetic recorded payments with two valid timing samples and median5130minutes. By booking week showed2026-10-26:1 and2026-11-02:1; by session-start week showed2026-11-02:2. Both labels were visible. The real nonoperator admin navigation redirected to/home.

The two synthetic ledger records were direct fixture prerequisites for reporting; they do not prove real Stripe charges. The review state came from an actual booking/Checkout/mock-signed amount-mismatch callback, not a DOM edit. Every fixture row and browser session was cleaned in finally.

## Browser state matrix

| State or interaction | Observed evidence | Scope and limitation |
| --- | --- | --- |
| Operator empty report | [Desktop](PAYMENTS-operator-empty-desktop.png), [320px](PAYMENTS-operator-empty-mobile.png) | Real empty PostgreSQL cohort, zero count, null median and both labelled views. |
| Operator populated report and review queue | [Desktop](PAYMENTS-operator-populated-review-desktop.png), [320px](PAYMENTS-operator-populated-review-mobile.png) | Actual report API aggregates and real synthetic mismatch review. No resolution/refund action was performed. |
| Participant empty | [Desktop](PAYMENTS-participant-empty-desktop.png) | Newly authenticated owned persona had no bookings; no fake response supplied. |
| Participant review and long content | [Desktop](PAYMENTS-participant-review-desktop.png), [320px](PAYMENTS-participant-review-mobile.png) | Real pending/review data; deliberately long synthetic mentor name and booking reference wrapped. |
| No permission | [Denied admin navigation](PAYMENTS-nonoperator-admin-denied.png) | Real mentee report403 and real admin redirect/home; no privileged content fabricated. |
| Reload loading | [320px](PAYMENTS-participant-fault-injected-loading.png) | Browser fetch for bookings was deliberately left pending; prior review data remained and refresh became disabled, matching ResourcePanel reload behavior. This is not an initial-spinner capture or provider-outage proof. |
| Fetch error | [320px](PAYMENTS-participant-fault-injected-error.png) | Browser fetch returned a clearly synthetic503 envelope; real error feedback and Try again rendered. This proves presentation of a transport error, not a real Stripe/database failure. |
| Keyboard refresh | [Exploration summary](PAYMENTS-report-state-exploration.json) | Fresh observed button ref was focused; Enter triggered exactly one counted real report-independent bookings refresh. |
| Pending and confirmed participants | [Earlier evidence/index](coverage.md) | Existing pending/confirmed desktop, mentor and mentee320px captures remain available; final reporting did not change those components. |

All seven recorded normal viewport checks and both fault-state checks reported zero horizontal overflow. Operator populated mobile and participant loading/error PNGs were visually inspected, in addition to earlier confirmed participant images. Native resolution select text uses the available closed-control width; the page did not overflow.

## Reproduction and remaining limits

Sanitized automation records are preserved as [payment flow exploration](explore-payment-flow.mjs) and [report/state exploration](explore-report-states.mjs). From the repository root, start the native QA helper, then run `node --import tsx .ai/qa/PAYMENTS/explore-report-states.mjs`; stop with test-env-down.ps1 before an independent native integration suite. The scripts require this checkout's owned disposable loopback environment. Runtime descriptors/credentials remain ignored.

Initial cold loading, comprehensive keyboard/focus traversal, full pixel comparison with the prototype and performance profiling were not measured by these screenshots. Before human QA sign-off, inspect those remaining interactions and record/admin navigation paint plus report-request timing with representative synthetic history; the owned app is now intentionally stopped, so no performance number is invented. Reload-loading keyboard activation, error recovery control visibility, narrow layout and long content were observed as described above.

Human scenario review, a second person's money review and risk-high QA approval remain pending. No self-QA label, live provider charge/refund, production deployment or production-delivery claim is made.
