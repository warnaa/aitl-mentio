# NOTES-007: migrates session notes up down up with restrictive lifecycle constraints and preserved existing notifications

- **Area:** NOTES
- **Priority:** High
- **Type:** integration
- **Requirement:** [Reviewed slice A spec](../../specs/2026-11-07-session-notes.md) (design-only PR 78; not authored by implementation)
- **Implementation:** [TypeScript test](../../../tests/integration/session-notes-migration.integration.test.ts)
- **Executable case:** `NOTES-007 migrates session notes up down up with restrictive lifecycle constraints and preserved existing notifications`
- **Prerequisites:** Independent PostgreSQL container on a random port with synthetic users/profile/slot/booking.
- **Determinism:** Fixture IDs are unique only for isolation, never expected business outcomes. Explicit written-answer/recovery instants; real app session is moved 30 minutes into the past to establish ended state. No random input seed is required; body strings are fixed.

## Given-When-Then

Given Independent PostgreSQL container on a random port with synthetic users/profile/slot/booking.
When Migrate up, seed draft/notification history, test constraints and uniqueness, migrate down, then up.
Then Invalid lifecycle/revisions/body and duplicate version are rejected; down removes note notifications/table while preserving booking and existing booking notification; up recreates empty table and constraints.

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create owned prerequisites | Confirmed party-scoped booking and specified initial state |
| 2 | Migrate up, seed draft/notification history, test constraints and uniqueness, migrate down, then up. | Invalid lifecycle/revisions/body and duplicate version are rejected; down removes note notifications/table while preserving booking and existing booking notification; up recreates empty table and constraints. |
| 3 | Clean up in finally | Fixture notes/notifications/bookings/accounts and browser sessions removed; migration case stops its container |

## Related negative and boundary cases

All rows and infrastructure are disposable and local. Down is intentionally destructive only for newly introduced note data.

## Cleanup

Native withPaymentFixture and booking fixture remove owned notes before restrictive booking/user foreign keys; browser sessions close in finally. NOTES-007 owns/stops its independent PostgreSQL container. Shared suite owns/stops the app and primary PostgreSQL.

## Verification and review

- **Latest execution:** Failed assertion-helper JSON parsing after migration round trip; corrected and awaiting rerun.
- **Observed result and evidence:** Initial shared-environment API/UI exploration passed relevant selectors and HTTP statuses. This executable scenario still awaits its first run.
- **Human review:** Pending. Automated execution is not human QA.
