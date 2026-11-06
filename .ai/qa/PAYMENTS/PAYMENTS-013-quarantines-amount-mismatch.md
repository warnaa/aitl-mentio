# PAYMENTS-013: quarantines a paid amount mismatch without confirming or reselling the time

- **Area:** PAYMENTS
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Owner-approved payment contract](../../specs/2026-11-06-booking-payments.md)
- **Implementation:** [TypeScript test](../../../tests/integration/payments-amount.integration.test.ts)
- **Executable case:** `PAYMENTS-013 quarantines a paid amount mismatch without confirming or reselling the time`
- **Prerequisites:** independent synthetic mentor, two mentees, published future slot and unpaid booking, created through real mock-provider sign-in and the native API fixture; isolated PostgreSQL and explicit payment mock.
- **Determinism:** slot starts at 2099-11-06T12:00:00Z; identities are unique runtime values and do not determine outcomes. No sleeps, test-level timeouts/retries or external Stripe calls. Boundary tests use explicit instants.

## Given-When-Then

```gherkin
Given an 8000-grosz booking with an open Checkout
When verified provider evidence reports 7999 grosz paid
Then the attempt enters review and the time cannot be sold again
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create owned personas, mentor, slot and reservation with the real fixture/API. | Prerequisite rows exist only in the native runner's disposable database. |
| 2 | Deliver mismatched paid evidence; reload the booking/event/attempt; try reserving as another mentee. | Webhook acknowledges durable review; no paidAt/amount is recorded as confirmed; a competing reservation returns 409. |

## Related negative and boundary cases

The exact amount comes from the immutable reservation snapshot. Currency, environment and identity mismatches are separately unit-covered; this integration case isolates a monetary mismatch.

Live API exploration before authoring observed reserve 201, Checkout 200 with bookingId/url/expiresAt, bad-signature 400, foreign-owner 404, payment/replay 200, one event marker, both participant projections, and unknown malformed metadata 200 with operator visibility. All expected outcomes above are specified by the payment contract, not inferred merely from this observation.

## Cleanup

The fixture deletes only owned payment resolutions, event evidence, attempts, bookings, slots, profile, account throttles and users in FK-safe order, then closes the ORM. Unknown-session evidence is explicitly removed by its case. The native runner stops its owned app/container; no developer database or real provider is touched.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** all authored assertions passed, including the preserved concurrency regression after its lifecycle fix. See the [full run report](2026-11-06-full-run.md); this run predates later reporting additions. Browser screenshots use a separate synthetic exploratory fixture.
- **Human review:** pending.
