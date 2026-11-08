# NOTES-008: retries a temporarily unavailable note and keeps failed-save text private

- **Area:** NOTES
- **Priority:** High
- **Type:** UI/API
- **Requirement:** [Reviewed slice A spec](../../specs/2026-11-07-session-notes.md), failure recovery and privacy acceptance criteria
- **Implementation:** [TypeScript test](../../../tests/integration/session-notes.integration.test.ts)
- **Executable case:** `NOTES-008 keeps the session readable and retries a temporarily unavailable note without leaking driver text`
- **Prerequisites:** Own ended confirmed booking and answer, mentor browser, ephemeral suite PostgreSQL with fileParallelism false.
- **Determinism:** Fixed body markers and explicit answer instant. Only the owned test database is altered; no external service or random outcome.

## Given-When-Then

Given a readable session whose note table is temporarily unavailable
When the mentor loads the session, storage returns and Retry is pressed
Then the session stays readable and the note editor recovers
And a deliberately rejected saved edit keeps the typed body while the driver text is absent from logs

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Temporarily rename session_notes in the isolated test database and open the session | Transcript/ended notice remains readable; note panel has ErrorMessage and Retry |
| 2 | Restore table and click observed Retry | Error clears; note form is usable |
| 3 | Hold the booking lock from a controlled transaction, save with Ctrl+Enter, capture disabled Saving/Refresh states at desktop and 320px, release lock, then install a failing update trigger | Real pending UI is observed without arbitrary sleeps; original draft persists after release; only subsequent writes fail |
| 4 | Type fixed private marker and save | Shared 500 error appears, typed text remains; stored original remains; private marker is absent from app log |
| 5 | Capture desktop and 320px error state, then finally restore schema/close browser | No horizontal overflow; all owned test changes are cleaned up |

## Related negative and boundary cases

NOTES-002 covers validation and permissions; NOTES-003 covers conflicts; NOTES-004 covers subscriber failure. This case targets transient storage failures and actual UI recovery. No production database or external provider is touched.

## Cleanup

Finally restores the table name, removes trigger/function and closes the isolated browser before withPaymentFixture deletes owned rows. The suite owns/stops its PostgreSQL/app. The shared native runner serializes files so no other scenario runs against the temporary renamed table.

## Verification and review

- **Latest execution:** Passed in fresh FULL `npm run test:integration -- --reporter=default --reporter=json --outputFile=test-results/integration/final-results.json`, 2026-11-08: all 50 files / 102 tests passed, zero failed/skipped; command exit 0, 940.92s.
- **Observed result and evidence:** This exact executable case passed. [Full output](recovery-integration.log), [sanitized per-case result](recovery-integration-summary.json), [state matrix and screenshots](report.md). Prior failures remain historical; this is fresh corrected-source evidence.
- **Human review:** Pending. Automated execution and agent review are not human QA.
