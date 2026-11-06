# Payment integration coverage

Requirements come from the owner-approved [payment spec](../../specs/2026-11-06-booking-payments.md). Scenarios use synthetic identities and native-runner-owned ephemeral PostgreSQL. The developer database and real Stripe infrastructure are outside the test scope.

## Executable coverage and latest status

| Case | Business result and implementation | Latest completed native run |
| --- | --- | --- |
| MIGRATION-015 | [Both payment migrations round trip and preserve unpaid history.](../../../tests/integration/payments-migration.integration.test.ts) | Passed. |
| PAYMENTS-008 | [Lost creation response recovers one fixed provider session.](../../../tests/integration/payments-lost-response.integration.test.ts) | Passed. |
| PAYMENTS-009 | [Recovery beyond the creation margin retains ambiguous inventory.](../../../tests/integration/payments-ambiguous-creation.integration.test.ts) | Passed. |
| PAYMENTS-010 | [Current refund evidence defeats stale completion; operator release is audited.](../../../tests/integration/payments-stale-refund.integration.test.ts) | Passed. |
| PAYMENTS-011 | [Verified payment confirms once and appears to both participants.](../../../tests/integration/payments-confirmation.integration.test.ts) | Passed. |
| PAYMENTS-012 | [A forged signature cannot confirm or record payment.](../../../tests/integration/payments-signature.integration.test.ts) | Passed. |
| PAYMENTS-013 | [An amount mismatch retains occupancy in review.](../../../tests/integration/payments-amount.integration.test.ts) | Passed. |
| PAYMENTS-014 | [Auth, role, CSRF and scope denials cannot create Checkout.](../../../tests/integration/payments-authorization.integration.test.ts) | Passed. |
| PAYMENTS-015 | [Concurrent Checkout retries recover one session/deadline.](../../../tests/integration/payments-checkout-concurrency.integration.test.ts) | Passed after the parent stale-session recheck fix. |
| PAYMENTS-016 | [Verified unpaid expiry releases time without deleting history.](../../../tests/integration/payments-expiry.integration.test.ts) | Passed. |
| PAYMENTS-017 | [A delayed paid callback retains original occupancy past local expiry.](../../../tests/integration/payments-late-webhook.integration.test.ts) | Passed. |
| PAYMENTS-018 | [Unknown malformed provider metadata is quarantined for operators.](../../../tests/integration/payments-unknown-session.integration.test.ts) | Passed. |
| PAYMENTS-019 | [Real PostgreSQL counts Warsaw weeks and valid timing without duplicate events.](../../../tests/integration/payments-report.integration.test.ts) | Passed in final-source scoped run. |
| PAYMENTS-020 | [Definitive creation rejection releases inventory with durable submission evidence.](../../../tests/integration/payments-rejected-creation.integration.test.ts) | Passed in final-source scoped run. |
| PAYMENTS-021 | [Operator-only report API counts once, exposes both views and excludes private identities.](../../../tests/integration/payments-report-api.integration.test.ts) | Passed in final-source scoped run. |

The full `npm run test:integration` command passed all 40 files and 81 tests in 848.86s, covering MIGRATION-015 and PAYMENTS-008 through018. The [full report](2026-11-06-full-run.md) records its source boundary. The subsequent [final-source scoped pass](2026-11-06-final-runtime.md) passed four files/four tests in 38.73s: PAYMENTS-019/020/021 plus the existing admin dashboard/users browser consumer. The earlier [focused report](2026-11-06-focused-run.md) preserves the detected/fixed concurrency failure. These are incremental verification scopes; the whole 81-test suite was not rerun at the reporting source.

## Guide and quality coverage

All 15 required integration-guide sections were considered: one business result per file, Given-When-Then documents, independent fixtures/cleanup, controlled clocks or explicit instants, small named helpers, exact API/persisted-state assertions and fake provider boundaries with real service/ORM/event bus. Cases use neither demo booking data nor sleeps, guessed CSS, per-test timeout/retry overrides or real provider credentials. Configured synthetic operator authentication follows the native runner convention; assertions isolate each case's own event/session identity.

Positive, negative, permission, missing-resource, conflict, integration-failure, boundary and idempotency classes are covered. Currency/environment/metadata mismatches and definite-creation rejection have additional unit coverage owned by the implementation agent; this index does not claim a separate HTTP case for every unit branch. Human review of AI-authored cases remains pending.

## Browser evidence and limits

Live API exploration preceded HTTP-case authoring and produced a [sanitized summary](PAYMENTS-api-exploration.json). Separate synthetic browser fixtures captured [pending desktop](PAYMENTS-pending-desktop.png), [confirmed mentee desktop](PAYMENTS-confirmed-mentee-desktop.png), [confirmed mentee mobile](PAYMENTS-confirmed-mentee-mobile.png) and [confirmed mentor desktop](PAYMENTS-confirmed-mentor-desktop.png). Confirmed mentee screenshots were visually inspected; 320px horizontal overflow was zero and long synthetic persona names wrapped.

Final-source [report/state exploration](PAYMENTS-report-state-exploration.json) additionally captured operator report empty/populated desktop and 320px, real participant empty/review/long-content states, real report permissions/admin denial, and keyboard refresh. Browser-fetch fault injection demonstrated reload loading with prior data retained and refresh disabled, plus synthetic503 error feedback. All nine recorded viewport checks had zero horizontal overflow. See the [state matrix and image links](2026-11-06-final-runtime.md) for exact scope and limitations; initial cold spinner, comprehensive keyboard traversal, full prototype comparison and performance measurement remain unrecorded. Human scenario review, second-person money review and risk-high QA sign-off remain pending.

## Infrastructure history

Docker Desktop initially was stopped and was started hidden for authorized test preparation. The developer devmentor-postgres container was never used or stopped. Initial native QA startup attempts failed during concurrent/locked native-module npm-ci cleanup. Parent repaired dependencies; startup then correctly rejected a source change, and its frozen-source retry completed clean install, migrations/seeding, build and browser provisioning in 114.477s. The shared helper environment and browser sessions were closed before the independent focused native suite. Runtime logs/descriptors/credentials remain ignored; this directory contains only sanitized records and synthetic UI evidence.
