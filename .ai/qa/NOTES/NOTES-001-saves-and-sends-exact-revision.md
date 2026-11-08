# NOTES-001: saves a private draft and submits exactly its saved revision, readable by both parties with one notification

- **Area:** NOTES
- **Priority:** High
- **Type:** API
- **Requirement:** [Reviewed slice A spec](../../specs/2026-11-07-session-notes.md) (design-only PR 78; not authored by implementation)
- **Implementation:** [TypeScript test](../../../tests/integration/session-notes.integration.test.ts)
- **Executable case:** `NOTES-001 saves a private draft and submits exactly its saved revision, readable by both parties with one notification`
- **Prerequisites:** Mentor and mentee parties on a confirmed booking with written answer.
- **Determinism:** Fixture IDs are unique only for isolation, never expected business outcomes. Explicit written-answer/recovery instants; real app session is moved 30 minutes into the past to establish ended state. No random input seed is required; body strings are fixed.

## Given-When-Then

Given Mentor and mentee parties on a confirmed booking with written answer.
When Save create-only draft, reload, revise, reject stale send, submit revision two, repeat send.
Then Both parties read the identical immutable submission; one in-product notification contains no excerpt. Public profile and booking list omit note body.

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create owned prerequisites | Confirmed party-scoped booking and specified initial state |
| 2 | Save create-only draft, reload, revise, reject stale send, submit revision two, repeat send. | Both parties read the identical immutable submission; one in-product notification contains no excerpt. Public profile and booking list omit note body. |
| 3 | Clean up in finally | Fixture notes/notifications/bookings/accounts and browser sessions removed; migration case stops its container |

## Related negative and boundary cases

Invalid/forbidden cases are NOTES-002; races NOTES-003; subscriber failure NOTES-004; limits NOTES-005.

## Cleanup

Native withPaymentFixture and booking fixture remove owned notes before restrictive booking/user foreign keys; browser sessions close in finally. NOTES-007 owns/stops its independent PostgreSQL container. Shared suite owns/stops the app and primary PostgreSQL.

## Verification and review

- **Latest execution:** Passed in fresh FULL `npm run test:integration -- --reporter=default --reporter=json --outputFile=test-results/integration/final-results.json`, 2026-11-08: all 50 files / 102 tests passed, zero failed/skipped; command exit 0, 940.92s.
- **Observed result and evidence:** This exact executable case passed. [Full output](recovery-integration.log), [sanitized per-case result](recovery-integration-summary.json), [state matrix and screenshots](report.md). Prior failures remain historical; this is fresh corrected-source evidence.
- **Human review:** Pending. Automated execution and agent review are not human QA.
