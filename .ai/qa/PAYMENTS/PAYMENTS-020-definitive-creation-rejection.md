# PAYMENTS-020: release definitively rejected Checkout with durable evidence

- **Area:** PAYMENTS
- **Priority:** High
- **Type:** integration
- **Requirement:** [Payment creation recovery contract](../../specs/2026-11-06-booking-payments.md)
- **Implementation:** [TypeScript test](../../../tests/integration/payments-rejected-creation.integration.test.ts)
- **Executable case:** `PAYMENTS-020 releases a definitively rejected creation with durable submission evidence`
- **Prerequisites:** owned pending booking in native ephemeral PostgreSQL; real PaymentService, transaction, entity and occupancy query; controlled external gateway boundary.
- **Determinism:** fixed fixture clock2026-11-06T11:00:00Z and next-day slot; one explicit CheckoutNotCreatedError proves a rejected provider creation. No sleeps or per-test runner overrides.

## Given-When-Then

```gherkin
Given a pending booking with no previous ambiguous provider submission
When the provider definitively rejects its first Checkout creation
Then the caller receives a503 failure
And durable counters prove every submitted creation was rejected
And the attempt expires without retaining inventory or fabricating payment
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
|1|Configure one verified CheckoutNotCreatedError at the provider boundary.|Only the external integration is controlled; persistence and orchestration remain real.|
|2|Call startCheckout as the owned mentee.|Request fails closed with503.|
|3|Read booking and payment attempt from PostgreSQL.|Both are expired; paymentPending false; submissionCount1 and rejectedSubmissionCount1; provider session identity remains null.|
|4|Query shared activeOccupancy and normal confirmation events.|No active reservation and no fabricated confirmation.|

## Related negative and boundary cases

PAYMENTS-008/009 exercise ambiguous response loss and retain inventory until safe recovery. A generic timeout or rejection after an earlier ambiguous request must not be treated like this proven never-created case; lifecycle unit coverage separately asserts that distinction. Real SDK error mapping and disabled hidden SDK retries have colocated tests. No live provider request is made here.

## Cleanup

The fixture removes only its owned rows in FK-safe order and closes its ORM. Native runner stops its app/container. No provider or developer database is touched.

## Verification and review

- **Latest execution:** passed on 2026-11-06 in the final-source scoped native run (four files/four tests,38.73s), covering payments-report.integration.test.ts, payments-rejected-creation.integration.test.ts, payments-report-api.integration.test.ts and admin.integration.test.ts.
- **Observed result and evidence:** all authored assertions passed on the final reporting source. See the [final runtime report](2026-11-06-final-runtime.md) for exact command, source boundary and browser/API evidence.
- **Human review:** pending. No production or risk-high QA approval is implied.
