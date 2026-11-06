# Payment integration verification on 2026-11-06

| Failing case | Primary reason | Evidence | Suggested owner |
| --- | --- | --- | --- |
| PAYMENTS-015 gives concurrent Checkout retries one provider session and one fixed deadline | Product concurrency bug: a retry with a stale null session ID returns conflict after another caller has already attached the shared provider session. | Native run returned statuses `[200, 200, 200, 409]`; expected four successful recoveries. The submission lock in PaymentService.recover returns false on a newly attached session, and its caller returns null instead of recovering that current session. | User/Product team; parent implementation agent is fixing the lifecycle code. |

Command: `npm run test:integration -- tests/integration/payments-`.

The native runner completed 12 files and 12 tests in 76.93s: 11 passed and PAYMENTS-015 failed. It built and served the actual app against its owned disposable PostgreSQL and cleaned up afterwards. The shared QA app had been stopped before this independent native run. No production provider call, charge or refund was made.

Follow-up: the parent fixed the stale-session recheck without weakening the regression assertion. The subsequent [full suite](2026-11-06-full-run.md) passed all 40 files and 81 tests, including PAYMENTS-015. This focused report preserves the original failure evidence rather than overwriting its history.

## Per-case outcome

| Case | Outcome and meaning |
| --- | --- |
| MIGRATION-015 | Passed with both payment migrations, counter defaults, counter-only down, payment-schema down and full up again; existing unpaid history remained. |
| PAYMENTS-008 | Passed: lost creation response recovered the same durable attempt/provider identity and deadline. |
| PAYMENTS-009 | Passed: recovery past the fixed creation margin retained unresolved occupancy in review. |
| PAYMENTS-010 | Passed: current full-refund evidence defeated stale completion; unauthorized release failed and operator release was audited. |
| PAYMENTS-011 | Passed: payment confirmed once under duplicate/distinct-event retries and appeared in both scoped participant lists. |
| PAYMENTS-012 | Passed: forged signature returned plain 400 without confirmation or event marker. |
| PAYMENTS-013 | Passed: a one-grosz amount mismatch entered durable review and blocked resale. |
| PAYMENTS-014 | Passed: unsigned, wrong-role, CSRF-less, foreign-owner and missing-resource Checkout requests could not create an attempt. |
| PAYMENTS-015 | Failed as described above; assertions remain unchanged as the regression test. |
| PAYMENTS-016 | Passed: verified unpaid terminal expiry released time while preserving the historical reservation. |
| PAYMENTS-017 | Passed: unresolved payment occupancy blocked resale after local expiry, then confirmed the original paid booking. |
| PAYMENTS-018 | Passed: verified unknown malformed metadata returned plain 200, retained durable unknown-session evidence and appeared only to operators. |

## Browser evidence and limits

Before authoring HTTP scenarios, a separate synthetic live exploratory fixture observed the exact route/envelope/error behavior and both participant screens. The sanitized [API summary](PAYMENTS-api-exploration.json) records reserve 201, Checkout 200, signature 400, foreign-owner 404, payment/replay 200, one stored event marker, 8000 paid grosz, both participant projections and unknown metadata 200 with operator visibility.

Captured [pending desktop](PAYMENTS-pending-desktop.png), [confirmed mentee desktop](PAYMENTS-confirmed-mentee-desktop.png), [confirmed mentee mobile](PAYMENTS-confirmed-mentee-mobile.png) and [confirmed mentor desktop](PAYMENTS-confirmed-mentor-desktop.png). Local image inspection found readable content and no clipped card content. The 320px check reported zero horizontal overflow. Synthetic long persona names wrapped. Browser sessions closed in finally; exploratory rows were removed before teardown.

This is evidence for pending/confirmed states, participant rendering and one narrow layout. Loading, empty, review, error, no-permission, keyboard/focus and operator UI screenshots have not been captured by this run. No full prototype comparison, performance measurement, human scenario review or risk-high QA sign-off is claimed. Those remain explicit verification work, even though related unit/API checks exist.

## Infrastructure and reproducibility

The native shared launcher eventually completed a clean install, both final migrations, seeding, production build and browser provisioning after dependency repair and one correct source-freshness rejection. It took 114.477s on the successful cold startup. It was stopped via test-env-down.ps1 before native integration execution. The developer database was never used or stopped.

Scenario Markdown links resolve to exact native test titles. Inputs are explicit instants and immutable PLN values; runtime identities do not determine outcomes. Human review of all AI-authored cases remains pending. The full repository integration suite is still owed after the parent concurrency fix; this report does not imply its completion.
