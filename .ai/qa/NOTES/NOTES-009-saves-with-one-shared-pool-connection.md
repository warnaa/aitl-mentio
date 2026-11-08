# NOTES-009: saves and replays a sent note with one shared service and limiter pool connection

- **Area:** NOTES
- **Priority:** High
- **Type:** API / PostgreSQL integration
- **Requirement:** [Slice A concurrency and authorization contract](../../specs/2026-11-07-session-notes.md), focused approved pool-safety execution plan in [run record](../../runs/2026-11-07-issue-47-session-notes.md).
- **Implementation:** [TypeScript test](../../../tests/integration/session-notes-pool.integration.test.ts)
- **Executable case:** `NOTES-009 saves and replays a sent note with one shared service and limiter pool connection`
- **Prerequisites:** A confirmed mentor booking with an answer and a real max-one PostgreSQL pool shared by the note service and limiter.
- **Determinism:** Fixed bodies and explicit answer/limiter instants. Unique fixture IDs provide isolation only; no generated business input or random seed. Bounded connection acquisition / HTTP requests and observable database waiter state.

## Given-When-Then

Given A confirmed mentor booking with an answer and a real max-one PostgreSQL pool shared by the note service and limiter.
When Save, send and replay the exact saved revision.
Then All mutations finish with one pool connection, revision 1 remains immutable and both events contain IDs only.

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create owned booking and answer | Confirmed mentor party authorized |
| 2 | Save, send and replay the exact saved revision. | All mutations finish with one pool connection, revision 1 remains immutable and both events contain IDs only. |
| 3 | Release owned resources in finally | Pools, requests, fixture records and owned blocker released |

## Related negative and boundary cases

[Authorization and stale writes](NOTES-002-denies-unauthorized-and-invalid-drafts.md), [two-request save/send serialization](NOTES-003-serializes-competing-saves-and-send.md), [notification deduplication and read-state retention](NOTES-004-repairs-failed-notification-after-reload.md). Distinct-snapshot cancellation for save/send is covered by service unit regressions. No external provider is involved in this pool regression; broader failure and text-boundary cases remain separately documented.

## Cleanup

Owned fixture records are removed by withPaymentFixture. Max-one ORM closes in finally. Saturation test releases external lock, aborts outstanding HTTP requests and settles them in finally. The native runner owns app/container teardown.

## Verification and review

- **Latest execution:** Passed in fresh FULL `npm run test:integration -- --reporter=default --reporter=json --outputFile=test-results/integration/final-results.json`, 2026-11-08: all 50 files / 102 tests passed, zero failed/skipped; command exit 0, 940.92s.
- **Observed result and evidence:** This exact executable case passed. [Full output](recovery-integration.log), [sanitized per-case result](recovery-integration-summary.json), [state matrix and screenshots](report.md). Prior failures remain historical; this is fresh corrected-source evidence.
- **Human review:** Pending. Automated execution and agent review are not human QA.
