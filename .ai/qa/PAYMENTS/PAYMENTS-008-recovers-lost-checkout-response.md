# PAYMENTS-008: recover a lost Checkout creation response without a second payable session

- **Area:** PAYMENTS
- **Priority:** High
- **Type:** integration
- **Requirement:** [Durable creation and recovery](../../specs/2026-11-06-booking-payments.md)
- **Implementation:** [TypeScript test](../../../tests/integration/payments-lost-response.integration.test.ts)
- **Executable case:** `PAYMENTS-008 recovers a lost Checkout creation response with one payable provider session`
- **Prerequisites:** independently created mentee, mentor, slot and pending booking in the suite-owned ephemeral PostgreSQL; real PaymentService/ORM/event bus and a controlled payment adapter.
- **Determinism:** injected clock starts at 2026-11-06T11:00:00Z; slot starts at 2026-11-07T12:00:00Z. Runtime UUIDs identify fixtures only; no random business values or sleeps.

## Given-When-Then

```gherkin
Given an owned pending booking and a provider that creates a session but loses its response
When the same mentee retries Checkout inside the original creation margin
Then the existing idempotent provider session is attached without extending the deadline
And paying that session confirms one booking at its stored PLN price
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Configure one lost provider response and call startCheckout. | The caller receives a retryable failure; a creating attempt and protected occupancy remain durable. |
| 2 | Retry as the same mentee without advancing the controlled clock. | One attempt remains, its original deadline is unchanged and every provider request uses the same idempotency key and 8000-grosz price. |
| 3 | Complete the recovered provider session and process its verified evidence. | Booking is confirmed with amountPaidCents 8000 and one normal in-process confirmation event. |

## Related negative and boundary cases

[PAYMENTS-009](PAYMENTS-009-retains-ambiguous-checkout-after-margin.md) covers recovery beyond the provider creation margin. Signature, ownership and API cases are separate. This case does not claim exactly-once downstream event delivery across process crashes or live Stripe operation.

## Cleanup

The fixture removes only its resolution/event/attempt/booking/slot/profile/user rows in FK-safe order and closes its ORM. The enclosing native runner owns its disposable database. No browser session or provider infrastructure exists.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** all authored assertions passed, including the preserved concurrency regression after its lifecycle fix. See the [full run report](2026-11-06-full-run.md); this run predates later reporting additions. Browser screenshots use a separate synthetic exploratory fixture.
- **Human review:** pending.
