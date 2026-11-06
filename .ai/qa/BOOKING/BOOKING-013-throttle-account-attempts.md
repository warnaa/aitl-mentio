# BOOKING-013: throttles repeated account attempts without creating a booking

- **Area:** BOOKING
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Booking flow, issue 40](../../specs/2026-11-05-booking-flow.md)
- **Implementation:** [TypeScript test](../../../tests/integration/booking-throttle.integration.test.ts)
- **Executable case:** `BOOKING-013 throttles repeated account attempts without creating a booking`
- **Prerequisites:** an authenticated mentee owns a fresh operational request budget. Fixtures create their own users, mentor profile, published slots and mock-provider sessions against the runner-owned ephemeral database.
- **Determinism:** Future slot instants are explicit in 2099. The notice rejection uses a one-hour margin; exact two-hour and expiry boundaries are separately controlled in unit tests. Generated IDs identify fixtures only and never determine expected outcomes. No random seed is used.

## Given-When-Then

```gherkin
Given an authenticated mentee owns a fresh operational request budget
When twenty invalid attempts are followed by another reservation request
Then the next request returns 429 with a positive Retry-After no greater than 600 seconds and no booking
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create the independent fixture through real mock OAuth and the explicit owned test-data layer. | The account, profile and slot belong to this case; no developer or seeded user state is required. |
| 2 | Send 20 invalid UUID requests followed by a valid one. | Malformed input consumes budget and the operational throttle prevents another attempt. |
| 3 | Release owned data and any browser sessions in finally blocks. | History FKs do not strand rows; the runner can stop its app and container cleanly. |

## Related negative and boundary cases

The companion executable cases BOOKING-003, BOOKING-004, BOOKING-005, BOOKING-006, BOOKING-009, BOOKING-010, BOOKING-011 and BOOKING-013 cover validation, authorization, missing resources, contention, expiry, interval boundaries, idempotency and throttling separately. External payment/provider timeout tests do not apply: this slice sends no provider request and does not confirm payment. Mock GitHub is controlled by the existing integration adapter while the app, service and PostgreSQL remain real. UI feedback and responsive behavior are covered by BOOKING-012; this case asserts only the API and persistence outcomes relevant to its business rule.

## Cleanup

The fixture deletes only bookings for its own mentor, then its slots/profile, account rate-limit keys and synthetic OAuth users. ORM connections close in finally. The UI case also closes its isolated agent-browser session in finally and captures failure diagnostics. The native integration runner owns and tears down its random-port app/PostgreSQL infrastructure.

## Verification and review

- **Latest execution:** Not run; authored on 2026-11-05. Parent will execute `npm run test:integration` after stopping the shared QA environment and completing the configured gate.
- **Observed result and evidence:** Parent live exploration confirmed the booking API envelope/statuses and actual signed-out selection/sign-in/pending flow. This executable case has not yet run; no pass is claimed.
- **Human review:** Pending.
