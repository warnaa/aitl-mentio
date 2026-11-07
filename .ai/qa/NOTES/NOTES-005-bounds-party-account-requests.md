# NOTES-005: bounds account reads and writes after party authorization

- **Area:** NOTES
- **Priority:** High
- **Type:** API
- **Requirement:** [Reviewed slice A spec](../../specs/2026-11-07-session-notes.md) (design-only PR 78; not authored by implementation)
- **Implementation:** [TypeScript test](../../../tests/integration/session-notes.integration.test.ts)
- **Executable case:** `NOTES-005 bounds account reads and writes after party authorization`
- **Prerequisites:** Unique fixture parties and answer; each limiter namespace starts empty.
- **Determinism:** Fixture IDs are unique only for isolation, never expected business outcomes. Explicit written-answer/recovery instants; real app session is moved 30 minutes into the past to establish ended state. No random input seed is required; body strings are fixed.

## Given-When-Then

Given Unique fixture parties and answer; each limiter namespace starts empty.
When Save 30 exact revisions then one extra; read 120 times then one extra; replay send 30 times then one extra.
Then Each extra request is 429; Retry-After is present; unauthorized outsider remains 404. Stored revision and submission remain valid.

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create owned prerequisites | Confirmed party-scoped booking and specified initial state |
| 2 | Save 30 exact revisions then one extra; read 120 times then one extra; replay send 30 times then one extra. | Each extra request is 429; Retry-After is present; unauthorized outsider remains 404. Stored revision and submission remain valid. |
| 3 | Clean up in finally | Fixture notes/notifications/bookings/accounts and browser sessions removed; migration case stops its container |

## Related negative and boundary cases

Invalid requests/roles NOTES-002. Limits are operational controls, not product quotas. Requests run within the 60-second policy window.

## Cleanup

Native withPaymentFixture and booking fixture remove owned notes before restrictive booking/user foreign keys; browser sessions close in finally. NOTES-007 owns/stops its independent PostgreSQL container. Shared suite owns/stops the app and primary PostgreSQL.

## Verification and review

- **Latest execution:** Passed in the first full `npm run test:integration`, 2026-11-07 (98 passed / 1 failed overall; failure was NOTES-007).
- **Observed result and evidence:** Initial shared-environment API/UI exploration passed relevant selectors and HTTP statuses. This executable scenario still awaits its first run.
- **Human review:** Pending. Automated execution is not human QA.
