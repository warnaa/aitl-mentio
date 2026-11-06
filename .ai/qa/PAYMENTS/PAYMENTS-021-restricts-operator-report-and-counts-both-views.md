# PAYMENTS-021: restrict reporting to operators and count each payment once in both views

- **Area:** PAYMENTS
- **Priority:** High
- **Type:** API / integration
- **Requirement:** [Owner-requested two-view report](../../specs/2026-11-06-paid-session-reporting.md)
- **Implementation:** [TypeScript test](../../../tests/integration/payments-report-api.integration.test.ts)
- **Executable case:** `PAYMENTS-021 restricts the paid-session report to operators and exposes both views without double counting`
- **Prerequisites:** independent unpaid booking and payment fixture in the native ephemeral app/database; explicit payment mock; configured synthetic operator login.
- **Determinism:** future slot starts at 2099-11-06T12:00:00Z; current confirmation timestamps come from the app and the expected median is calculated from their persisted values. UUIDs are fixture identities only. No sleeps or per-test timeout/retry overrides.

## Given-When-Then

```gherkin
Given an unpaid booking and operator-only reporting
When one verified payment is delivered twice and the report is read
Then anonymous and mentee callers are denied
And an operator sees one recorded payment in both labelled week views with its actual timing median
And participant and provider identities are absent from the aggregate DTO
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Read the report unsigned and as a fixture mentee. | 401 and 403 respectively. |
| 2 | Read as the configured synthetic operator before payment. | 200 with zero counts, empty arrays and null median. |
| 3 | Create Checkout and deliver identical verified paid evidence twice. | Both callbacks acknowledge one recorded payment. |
| 4 | Read the report again and compare with stored timestamps. | One paid/timing sample; both weekly arrays sum to one, future session-start week differs from booking week, and median matches persisted booking-to-start minutes. |
| 5 | Check the report's exact allowlisted fields. | Only cohort/timezone/count/timing/week aggregates appear, with no user, booking or provider identifiers. |

## Related negative and boundary cases

PAYMENTS-019 covers real PostgreSQL Warsaw Monday boundaries, future weeks and invalid timing exclusion under a controlled clock. This case covers the HTTP guards and consuming DTO after a real confirmation flow. Report has no caller-selected resource ID, so missing-resource checks do not apply. Payment failure, scope, retry and provider exceptions are separate cases.

## Cleanup

The fixture removes only its owned payment/event/booking/persona rows in FK-safe order and closes its ORM. The native runner owns app/container cleanup. The configured operator follows the existing runner convention and no production credentials or data are used.

## Verification and review

- **Latest execution:** passed on 2026-11-06 in the final-source scoped native run (four files/four tests,38.73s), covering payments-report.integration.test.ts, payments-rejected-creation.integration.test.ts, payments-report-api.integration.test.ts and admin.integration.test.ts.
- **Observed result and evidence:** all authored assertions passed on the final reporting source. See the [final runtime report](2026-11-06-final-runtime.md) for exact command, source boundary and browser/API evidence.
- **Human review:** pending.
