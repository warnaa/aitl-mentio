# PAYMENTS-010: reject stale payment completion after a full refund and audit authorized release

- **Area:** PAYMENTS
- **Priority:** High
- **Type:** integration
- **Requirement:** [Authoritative evidence and audited operator disposition](../../specs/2026-11-06-booking-payments.md)
- **Implementation:** [TypeScript test](../../../tests/integration/payments-stale-refund.integration.test.ts)
- **Executable case:** `PAYMENTS-010 refuses a stale paid callback after an authoritative full refund and audits operator release`
- **Prerequisites:** independently created mentee, mentor, operator, slot and booking; a real service/ORM/event bus and controlled provider snapshot.
- **Determinism:** injected 2026-11-06T11:00:00Z clock and explicit next-day slot; fixed 8000-grosz amount and full-refund evidence. Runtime UUIDs are fixture identity only.

## Given-When-Then

```gherkin
Given a paid Checkout was fully refunded before an old completion callback arrives
When the service retrieves current provider truth and an operator resolves the exception
Then the stale callback never confirms the refunded booking
And only the operator can release the slot with an append-only reason and actor record
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create Checkout, complete payment, then make authoritative provider state show a completed full refund. | An old paid event and a newer refunded provider truth exist independently. |
| 2 | Deliver the stale paid event. | Attempt enters review; booking remains pending/paymentPending with no paidAt or confirmation event. |
| 3 | Attempt release as the mentee. | Service refuses with forbidden and no state/audit mutation. |
| 4 | Release as the fixture operator using a reason and re-fetched full-refund evidence. | Booking becomes expired with occupancy released; one audit row records the actor, action and reason. |

## Related negative and boundary cases

This case verifies evidence-based release; it does not execute a refund or authorize a production money action. Missing/partial refund evidence must not permit release. Basic invalid-signature, amount/currency and API ownership cases remain separate.

## Cleanup

The fixture removes its audit rows before attempts, bookings and personas, then closes its ORM. Tests never touch a real provider account or developer database.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** all authored assertions passed, including the preserved concurrency regression after its lifecycle fix. See the [full run report](2026-11-06-full-run.md); this run predates later reporting additions. Browser screenshots use a separate synthetic exploratory fixture.
- **Human review:** pending.
