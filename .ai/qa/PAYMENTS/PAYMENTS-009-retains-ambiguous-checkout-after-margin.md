# PAYMENTS-009: retain unresolved payment occupancy after the fixed creation margin

- **Area:** PAYMENTS
- **Priority:** High
- **Type:** integration
- **Requirement:** [Fixed creation deadline and unknown provider truth](../../specs/2026-11-06-booking-payments.md)
- **Implementation:** [TypeScript test](../../../tests/integration/payments-ambiguous-creation.integration.test.ts)
- **Executable case:** `PAYMENTS-009 retains ambiguous paid inventory when creation recovery exceeds the fixed margin`
- **Prerequisites:** independent synthetic mentee, mentor, slot and pending booking in ephemeral PostgreSQL; a controlled adapter loses a successful creation response.
- **Determinism:** injected clock starts at 2026-11-06T11:00:00Z, then moves to exactly one millisecond beyond the remaining 30-minute creation minimum. IDs do not determine outcomes; no sleeps.

## Given-When-Then

```gherkin
Given Stripe may have created a payable session whose response was lost
When recovery occurs after the immutable expiry can no longer meet a fresh creation minimum
Then the attempt enters review without another provider creation
And the pending booking retains occupancy without claiming payment confirmation
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Lose the first creation response after the provider commits. | An unresolved durable attempt exists. |
| 2 | Advance the clock beyond the fixed creation margin and retry. | The caller receives conflict; attempt state is review with ambiguous_creation. |
| 3 | Reload the attempt and booking from a fresh ORM fork. | Deadline is unchanged, booking remains pending/paymentPending, paidAt is null, and no confirmation event or second create occurs. |

## Related negative and boundary cases

[PAYMENTS-008](PAYMENTS-008-recovers-lost-checkout-response.md) covers recovery inside the margin. This case deliberately keeps the slot unavailable because provider truth is unresolved; it does not equate a network timeout with payment failure. Operator disposition and authoritative refund evidence are covered by [PAYMENTS-010](PAYMENTS-010-rejects-stale-paid-event-after-refund.md).

## Cleanup

Fixture teardown deletes only owned synthetic rows in FK-safe order and closes the ORM even on assertion failure. Native runner container cleanup is independent of the developer database.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** all authored assertions passed, including the preserved concurrency regression after its lifecycle fix. See the [full run report](2026-11-06-full-run.md); this run predates later reporting additions. Browser screenshots use a separate synthetic exploratory fixture.
- **Human review:** pending.
