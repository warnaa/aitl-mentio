# NOTES-006: mentor saves and sends through the UI and the ended mentee refreshes an immutable read-only note at desktop and 320px

- **Area:** NOTES
- **Priority:** High
- **Type:** UI
- **Requirement:** [Reviewed slice A spec](../../specs/2026-11-07-session-notes.md) (design-only PR 78; not authored by implementation)
- **Implementation:** [TypeScript test](../../../tests/integration/session-notes.integration.test.ts)
- **Executable case:** `NOTES-006 mentor saves and sends through the UI and the ended mentee refreshes an immutable read-only note at desktop and 320px`
- **Prerequisites:** Own mentor, mentee, outsider; ended session and written answer; isolated browser sessions.
- **Determinism:** Fixture IDs are unique only for isolation, never expected business outcomes. Explicit written-answer/recovery instants; real app session is moved 30 minutes into the past to establish ended state. No random input seed is required; body strings are fixed.

## Given-When-Then

Given Own mentor, mentee, outsider; ended session and written answer; isolated browser sessions.
When Mentor fills observed Session note field, Ctrl+Enter saves, mentee Refresh note reads draft, mentor sends, mentee Refresh note sees awaiting; capture desktop and 320px.
Then 19,000-character unbroken plain text remains escaped and within viewport; mentee has no textbox/decision controls; outsider page is 404; body matches saved submission.

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create owned prerequisites | Confirmed party-scoped booking and specified initial state |
| 2 | Mentor fills observed Session note field, Ctrl+Enter saves, mentee Refresh note reads draft, mentor sends, mentee Refresh note sees awaiting; capture desktop and 320px. | 19,000-character unbroken plain text remains escaped and within viewport; mentee has no textbox/decision controls; outsider page is 404; body matches saved submission. |
| 3 | Clean up in finally | Fixture notes/notifications/bookings/accounts and browser sessions removed; migration case stops its container |

## Related negative and boundary cases

Manual shared-environment exploration observed labels before authoring. Delayed GET/save/send/parent-prop ordering is controlled in unit tests; separate local conflict screenshots cover dirty preservation.

## Cleanup

Native withPaymentFixture and booking fixture remove owned notes before restrictive booking/user foreign keys; browser sessions close in finally. NOTES-007 owns/stops its independent PostgreSQL container. Shared suite owns/stops the app and primary PostgreSQL.

## Verification and review

- **Latest execution:** Not yet run; prepared 2026-11-07 for `npm run test:integration`.
- **Observed result and evidence:** Initial shared-environment API/UI exploration passed relevant selectors and HTTP statuses. This executable scenario still awaits its first run.
- **Human review:** Pending. Automated execution is not human QA.
