# NOTES-002: denies outsiders and mentee writes and rejects invalid or premature drafts without disclosure

- **Area:** NOTES
- **Priority:** High
- **Type:** API
- **Requirement:** [Reviewed slice A spec](../../specs/2026-11-07-session-notes.md) (design-only PR 78; not authored by implementation)
- **Implementation:** [TypeScript test](../../../tests/integration/session-notes.integration.test.ts)
- **Executable case:** `NOTES-002 denies outsiders and mentee writes and rejects invalid or premature drafts without disclosure`
- **Prerequisites:** Owned confirmed and initially unconfirmed booking, mentor/mentee/outsider/operator and another mentor.
- **Determinism:** Fixture IDs are unique only for isolation, never expected business outcomes. Explicit written-answer/recovery instants; real app session is moved 30 minutes into the past to establish ended state. No random input seed is required; body strings are fixed.

## Given-When-Then

Given Owned confirmed and initially unconfirmed booking, mentor/mentee/outsider/operator and another mentor.
When Attempt writes before an answer; signed-out, CSRF, mentee and outsider calls; invalid/NUL/oversize bodies; stale saves; cancelled booking reads/writes.
Then 401 signed-out; 403 mentee/CSRF; indistinguishable 404 outsider/unconfirmed/cancelled; 422 invalid text/UUID; 409 premature/stale edits, with no body disclosure.

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create owned prerequisites | Confirmed party-scoped booking and specified initial state |
| 2 | Attempt writes before an answer; signed-out, CSRF, mentee and outsider calls; invalid/NUL/oversize bodies; stale saves; cancelled booking reads/writes. | 401 signed-out; 403 mentee/CSRF; indistinguishable 404 outsider/unconfirmed/cancelled; 422 invalid text/UUID; 409 premature/stale edits, with no body disclosure. |
| 3 | Clean up in finally | Fixture notes/notifications/bookings/accounts and browser sessions removed; migration case stops its container |

## Related negative and boundary cases

Successful workflow NOTES-001. Bound limits NOTES-005. No external provider participates in note writes.

## Cleanup

Native withPaymentFixture and booking fixture remove owned notes before restrictive booking/user foreign keys; browser sessions close in finally. NOTES-007 owns/stops its independent PostgreSQL container. Shared suite owns/stops the app and primary PostgreSQL.

## Verification and review

- **Latest execution:** Passed in fresh FULL `npm run test:integration -- --reporter=default --reporter=json --outputFile=test-results/integration/final-results.json`, 2026-11-08: all 50 files / 102 tests passed, zero failed/skipped; command exit 0, 940.92s.
- **Observed result and evidence:** This exact executable case passed. [Full output](recovery-integration.log), [sanitized per-case result](recovery-integration-summary.json), [state matrix and screenshots](report.md). Prior failures remain historical; this is fresh corrected-source evidence.
- **Human review:** Pending. Automated execution and agent review are not human QA.
