# BOOKING-012: restores the signed-out slot and duration then shows an unpaid reservation

- **Area:** BOOKING
- **Priority:** High
- **Type:** UI / integration
- **Requirement:** [Booking flow, issue 40](../../specs/2026-11-05-booking-flow.md)
- **Implementation:** [TypeScript test](../../../tests/integration/booking-sign-in-return.integration.test.ts)
- **Executable case:** `BOOKING-012 restores the signed-out slot and duration then shows an unpaid reservation`
- **Prerequisites:** an owned mentor offer and an isolated signed-out browser. Fixtures create their own users, mentor profile, published slots and mock-provider sessions against the runner-owned ephemeral database.
- **Determinism:** Future slot instants are explicit in 2099. The notice rejection uses a one-hour margin; exact two-hour and expiry boundaries are separately controlled in unit tests. Generated IDs identify fixtures only and never determine expected outcomes. No random seed is used.

## Given-When-Then

```gherkin
Given an owned mentor offer and an isolated signed-out browser
When the visitor selects a slot/50 minutes, signs in and explicitly reserves
Then the same slot/duration return without an automatic write, then pending/unpaid copy appears and 320px has no overflow
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create the independent fixture through real mock OAuth and the explicit owned test-data layer. | The account, profile and slot belong to this case; no developer or seeded user state is required. |
| 2 | Observe the server shell, choose snapshot-derived radios, follow sign-in, run the mock OAuth start preserving returnTo and explicitly reserve. | URL and checked controls restore, no pre-submit booking exists, one 50-minute pending hold appears with desktop/mobile evidence. |
| 3 | Release owned data and any browser sessions in finally blocks. | History FKs do not strand rows; the runner can stop its app and container cleanly. |

## Related negative and boundary cases

The companion executable cases BOOKING-003, BOOKING-004, BOOKING-005, BOOKING-006, BOOKING-009, BOOKING-010, BOOKING-011 and BOOKING-013 cover validation, authorization, missing resources, contention, expiry, interval boundaries, idempotency and throttling separately. External payment/provider timeout tests do not apply: this slice sends no provider request and does not confirm payment. Mock GitHub is controlled by the existing integration adapter while the app, service and PostgreSQL remain real. The sign-in page and Continue with GitHub control are asserted from the observed flow; the test invokes its real OAuth-start route with a test-specific login hint and the unmodified returnTo to avoid the shared seeded mock-mentee persona. Cold-load timing is saved as a smoke signal, not a performance budget. Unit tests cover pending/error/duplicate-submit states.

## Cleanup

The fixture deletes only bookings for its own mentor, then its slots/profile, account rate-limit keys and synthetic OAuth users. ORM connections close in finally. The UI case also closes its isolated agent-browser session in finally and captures failure diagnostics. The native integration runner owns and tears down its random-port app/PostgreSQL infrastructure.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** Parent live exploration confirmed the booking API envelope/statuses and actual signed-out selection/sign-in/pending flow. This executable case has not yet run; no pass is claimed.
- **Human review:** Pending.
