# BOOKING-015: releases cancelled occupancy while preserving the original booking snapshot

- **Area:** BOOKING
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Released occupancy and preserved history](../../specs/2026-11-05-booking-flow.md)
- **Implementation:** [TypeScript test](../../../tests/integration/booking-cancelled-history.integration.test.ts)
- **Executable case:** `BOOKING-015 releases cancelled occupancy while preserving the original booking snapshot`
- **Prerequisites:** An independent published mentor offer and two authenticated mentees against the native runner's ephemeral PostgreSQL.
- **Determinism:** The slot uses the explicit 2099 fixture instant. Generated identities distinguish owned rows and do not determine the expected outcome.

## Given-When-Then

```gherkin
Given a real pending reservation whose stored status is changed to cancelled by the fixture
When another mentee reserves the same slot for 50 minutes
Then a new pending booking is created and the original cancelled booking retains its price, currency, duration and start snapshot
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create a 25-minute reservation through the real booking API. | The API returns 201 with a pending snapshot. |
| 2 | Set that owned row's status to cancelled in the fixture layer. | The fixture represents a future cancellation result; no cancellation endpoint or behavior is implemented. |
| 3 | Reserve the same slot as the other mentee for 50 minutes. | The API returns 201 with a distinct booking ID. |
| 4 | Read the two stored rows. | The old snapshot remains cancelled and unchanged; the replacement is pending for 50 minutes. |

## Related negative and boundary cases

BOOKING-006 covers expiry and competing replacement requests. BOOKING-005 and BOOKING-009 cover active conflicts on the same and different slot IDs. This case supplies cancelled state only: cancellation policy, refunds, payments and external provider failures remain out of scope. Idempotent retry recovery is covered separately by BOOKING-011.

## Cleanup

The fixture deletes its own booking history before its slots, profile and synthetic accounts. Its nested finally closes the ORM even if cleanup fails. The native runner owns app and container teardown.

## Verification and review

- **Latest execution:** Not run; authored on 2026-11-05. Parent will run the targeted and full integration suite after its configured gate.
- **Observed result and evidence:** Expectations follow the spec's cancelled-history occupancy rule. This newly authored case has not yet run; no pass is claimed.
- **Human review:** Pending.
