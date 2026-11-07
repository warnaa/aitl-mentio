# NOTES-004: recovers a committed send after subscriber failure through the reloaded awaiting Notify mentee action

- **Area:** NOTES
- **Priority:** High
- **Type:** UI/API
- **Requirement:** [Reviewed slice A spec](../../specs/2026-11-07-session-notes.md) (design-only PR 78; not authored by implementation)
- **Implementation:** [TypeScript test](../../../tests/integration/session-notes.integration.test.ts)
- **Executable case:** `NOTES-004 recovers a committed send after subscriber failure through the reloaded awaiting Notify mentee action`
- **Prerequisites:** Real PostgreSQL and SessionNoteService/EventBus; only subscriber is deliberately failed; mentor browser authenticates to the real app.
- **Determinism:** Fixture IDs are unique only for isolation, never expected business outcomes. Explicit written-answer/recovery instants; real app session is moved 30 minutes into the past to establish ended state. No random input seed is required; body strings are fixed.

## Given-When-Then

Given Real PostgreSQL and SessionNoteService/EventBus; only subscriber is deliberately failed; mentor browser authenticates to the real app.
When Commit send while subscriber throws, reload awaiting view, click Notify mentee, mark notification read, replay same send.
Then Sent note survives failure; reloaded mentor has Notify mentee and no editor; exactly one notification is repaired; readAt/sentAt/body/revision remain unchanged on repeat.

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create owned prerequisites | Confirmed party-scoped booking and specified initial state |
| 2 | Commit send while subscriber throws, reload awaiting view, click Notify mentee, mark notification read, replay same send. | Sent note survives failure; reloaded mentor has Notify mentee and no editor; exactly one notification is repaired; readAt/sentAt/body/revision remain unchanged on repeat. |
| 3 | Clean up in finally | Fixture notes/notifications/bookings/accounts and browser sessions removed; migration case stops its container |

## Related negative and boundary cases

No email is sent by this consumer. In-process delivery loss is recovered explicitly, not claimed as guaranteed background delivery.

## Cleanup

Native withPaymentFixture and booking fixture remove owned notes before restrictive booking/user foreign keys; browser sessions close in finally. NOTES-007 owns/stops its independent PostgreSQL container. Shared suite owns/stops the app and primary PostgreSQL.

## Verification and review

- **Latest execution:** Passed in the first full `npm run test:integration`, 2026-11-07 (98 passed / 1 failed overall; failure was NOTES-007).
- **Observed result and evidence:** Initial shared-environment API/UI exploration passed relevant selectors and HTTP statuses. This executable scenario still awaits its first run.
- **Human review:** Pending. Automated execution is not human QA.
