# MIGRATION-015: add payment evidence and reverse the schema while preserving unpaid bookings

- **Area:** MIGRATION
- **Priority:** High
- **Type:** integration
- **Requirement:** [Payment data model and rollback](../../specs/2026-11-06-booking-payments.md)
- **Implementation:** [TypeScript test](../../../tests/integration/payments-migration.integration.test.ts)
- **Executable case:** `MIGRATION-015 adds payment evidence, preserves unpaid history and reverses up down up`
- **Prerequisites:** an owned ephemeral PostgreSQL database migrated through the existing booking schema; one independently created synthetic historical unpaid booking.
- **Determinism:** explicit 2099 slot/expiry instants; database-generated UUIDs are identities only and do not affect outcomes; no generated random business data.

## Given-When-Then

```gherkin
Given an existing unpaid booking with its authoritative PLN price
When both payment and submission-evidence migrations are applied, reverted and applied again
Then payment evidence tables and uniqueness constraints exist after each up
And down removes only payment additions while preserving the unpaid booking
And legacy unpaid bookings do not become payment-pending or paid
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Start disposable PostgreSQL and migrate through the booking schema; insert one owned synthetic booking. | The baseline booking is pending with an 8000-grosz snapshot. |
| 2 | Run migrations through Migration20261106132627_payment_submissions. | Three payment tables, four booking payment fields and payment identity uniqueness constraints exist; both submission evidence counters default to zero; legacy paid fields are null and paymentPending is false. |
| 3 | Revert the submission-evidence migration. | The two counter fields disappear while payment tables remain. |
| 4 | Revert the initial payment migration. | Payment tables/booking fields disappear and the historical pending booking and price remain. |
| 5 | Apply both payment migrations again. | Payment schema and counters are restored; the historical booking remains unpaid. |

## Related negative and boundary cases

Money idempotency and authorization belong to the PAYMENTS cases. This case checks additive migration, uniqueness constraints and rollback safety, not live provider behavior. It uses no browser or external Stripe credentials. Data-bearing payment rollback in production additionally requires the reconciliation/export runbook; this disposable case cannot prove that operational step occurred.

## Cleanup

The scenario stops only its owned PostgreSQL container in finally. It never uses or stops the developer database or shared app database.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** both final payment migrations, submission/rejection counter defaults, counter-only down, base payment-schema down and full up passed. See the [full run report](../PAYMENTS/2026-11-06-full-run.md).
- **Human review:** pending.
