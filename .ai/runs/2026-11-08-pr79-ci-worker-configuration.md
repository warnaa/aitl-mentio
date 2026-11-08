# PR 79 integration worker configuration

## Request

Apply the GitHub integration-job configuration correction to PR #79 instead of leaving it as manual setup instructions.

## Plan

1. Add INTEGRATION_TEST_RUN=1 only to the integration job, alongside its existing mock-payment setting; preserve production validation and all other jobs.
2. Validate the actual workflow environment against createLogger/getEnv and rerun NOTES-004 and NOTES-009 under that environment, with isolated native integration infrastructure.
3. Commit the focused fix and sanitized records, update the already-approved PR branch, and report actual CI state without claiming queued checks passed.

## Progress

- Recorded the user's correction in lessons before continuing. No instruction-file change is needed: existing rules already authorize performing requested routine work.
- Added the integration-only flag and corrected the nearby comment to distinguish worker and child configuration. No production validator or test assertion was changed.
- The preceding full local run at b70a309 passed all 102 tests; CI's missing-signal failure was independently reproduced by the configuration probe.
- Parsed the actual old/new workflow environments: old logger construction fails with the expected guard error; corrected workflow logger succeeds. Verified the flag is absent from global env and every other job. The four native CI change-classifier tests pass.
- Ran NOTES-004 and NOTES-009 with the corrected workflow environment: exit 0, 2 passed and 100 filter-excluded, 91.083 seconds. Both cases exercise the real app/database/service behavior after the previously failing logger construction. Production validation, executable tests and assertions remain unchanged.
- Preserved sanitized probe, command/per-case results and report in `.ai/qa/NOTES/ci-worker-fix/`. The existing full-run report is separate evidence; no redundant full suite was run for this job-only change. Snapshot restored, cleanup verified before publication.
- Publishing the focused correction and related already-committed local double-check records to the existing approved PR #79. New GitHub checks will be pending; no remote CI success is claimed before observing it. No merge or human QA sign-off is performed.
