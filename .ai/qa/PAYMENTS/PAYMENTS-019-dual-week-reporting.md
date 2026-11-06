# PAYMENTS-019: count recorded payments once in both Warsaw week views

- **Area:** PAYMENTS
- **Priority:** High
- **Type:** integration
- **Requirement:** [Two-view reporting specification](../../specs/2026-11-06-paid-session-reporting.md)
- **Implementation:** [TypeScript test](../../../tests/integration/payments-report.integration.test.ts)
- **Executable case:** `PAYMENTS-019 counts recorded payments once in both Warsaw week views and computes the valid timing median`
- **Prerequisites:** owned synthetic operator, mentor, mentee and unpaid base booking in native ephemeral PostgreSQL; real PaymentReportService, ORM and SQL aggregation.
- **Determinism:** fixed clock2026-11-09T12:00:00Z; explicit instants immediately before/after Warsaw Monday, future starts, negative timing, old and future bookings. Runtime UUIDs identify fixtures only.

## Given-When-Then

```gherkin
Given an empty report and independently owned synthetic payment history
When the operator report reads Warsaw week boundaries and duplicate event evidence
Then four eligible recorded payments count once in each week view
And only three valid timing samples contribute to the10140-minute median
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
|1|Read the unpaid fixture report.|Zero payments and null median.|
|2|Create six explicit payment-history rows and duplicate event evidence for one payment.|Boundary, future-week, invalid-timing, outside-cohort and future-booking conditions are independent fixture records.|
|3|Read the report once through the real service/SQL.|Cohort starts2026-08-24 in Europe/Warsaw; four paid rows, three valid timing samples and median10140minutes.|
|4|Compare both ordered week arrays.|Booking and start weeks use their own correct Monday boundaries; event duplicates never multiply booking counts.|

## Related negative and boundary cases

PAYMENTS-021 tests real HTTP operator/anonymous/mentee guards and aggregate privacy. This case focuses on real PostgreSQL boundary and median semantics; no browser selectors or provider calls apply. Negative timing affects the median sample only, not the recorded-payment count. Old/future bookedAt rows are outside the cohort.

## Cleanup

The shared direct-database fixture removes only owned event/attempt/booking/slot/profile/persona rows in FK-safe order and closes its ORM. Native runner owns the disposable database; developer/production data is never used.

## Verification and review

- **Latest execution:** passed on 2026-11-06 in the final-source scoped native run (four files/four tests,38.73s), covering payments-report.integration.test.ts, payments-rejected-creation.integration.test.ts, payments-report-api.integration.test.ts and admin.integration.test.ts.
- **Observed result and evidence:** all authored assertions passed on the final reporting source. See the [final runtime report](2026-11-06-final-runtime.md) for exact command, source boundary and browser/API evidence.
- **Human review:** pending. No risk-high QA approval or second-person money sign-off is implied.
