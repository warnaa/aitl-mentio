# BOOKING-014 orders mentor and slot locks during an adverse removal interleaving

- **Area:** BOOKING
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Booking transaction lock order](../../specs/2026-11-05-booking-flow.md)
- **Implementation:** [TypeScript test](../../../tests/integration/booking-lock-order.integration.test.ts)
- **Executable case:** `BOOKING-014 orders mentor and slot locks during an adverse removal interleaving`
- **Prerequisites:** Independent real OAuth mentee and mentor sessions, a published priced offer and a slot in the runner-owned PostgreSQL.
- **Determinism:** The slot starts at the explicit 2099 fixture instant. An external fixture transaction takes its row lock; PostgreSQL pg_stat_activity wait state, rather than sleeps or response timing, orders the two requests.

## Given-When-Then

```gherkin
Given an external fixture transaction holds the slot row lock
When DELETE waits on its explicit slot query and a booking request then waits on the mentor profile
Then releasing the external lock lets removal return 200 and booking return 404 without a deadlock or booking row
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Lock the owned slot in an independent PostgreSQL transaction, then launch its DELETE. | pg_stat_activity reports a blocked slot query without an ownership join. |
| 2 | Launch the mentee booking and observe both blocked queries. | DELETE waits on the slot while booking waits on the mentor, proving shared mentor-before-slot ordering. |
| 3 | Commit the blocker, consume both HTTP results and inspect bookings. | DELETE returns 200, booking returns 404, and no reservation exists. |

## Related negative and boundary cases

BOOKING-008 separately checks either valid winner under simultaneous requests. This case forces the adverse lock interleaving identified by independent review. BOOKING-005 and BOOKING-009 cover same-slot/cross-slot booking contention. Authorization and malformed inputs are separate cases; no provider or payment request occurs, so external timeout/idempotent webhook cases do not apply.

## Cleanup

The external transaction releases its lock on success or failure. In-flight requests are consumed before fixture cleanup deletes the mentor's bookings, slots, profile, synthetic users and rate-limit keys. The fixture closes its ORM and the native suite owns app/container teardown.

## Verification and review

- **Latest execution:** Not run; authored on 2026-11-05. Parent will run the targeted and full integration command after its configured gate.
- **Observed result and evidence:** The expectation follows the documented lock order and independent review's adverse-interleaving finding. No execution success is claimed.
- **Human review:** Pending.
