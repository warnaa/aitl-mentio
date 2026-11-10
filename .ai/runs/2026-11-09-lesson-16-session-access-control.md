# Lesson 16: private text session access-control check

## Request
Run five HTTP checks against one booking: mentee read, operator access, operator read and write denied, and an unchanged message list. Expected denial: 403 `forbidden`.

## Work
- `.ai/tmp/lesson-16/scene.env` and `.ai/scripts/lesson-16-prepare.sh` do not exist in the repo, worktrees or git history. The user chose to build an equivalent scene.
- Built it from a detached worktree at f5408a4 with a disposable Postgres container and a production build. The shared `.ai/qa/test-env.lock` is stale (owner process dead) and was left untouched.
- Scene: real mock sign-in, slot, booking, checkout and mock payment. Direct database writes only published the seeded mentor profile and moved the booking start to open the window. Mentor is `mock-mentor`, not the operator. Both messages were posted through the API.

## Results
Booking `6928285e-52d0-4467-aec5-7cea9e224468`.

| # | Expected | Actual |
|---|---|---|
| 1 | 200, open, 2 messages | 200, open, 2 messages |
| 2 | 200 | 200 |
| 3 | 403 `forbidden`, no private data | 404 `not_found`, no private data |
| 4 | 403 `forbidden` | 404 `not_found`, nothing written |
| 5 | 200, identical messages | 200, deep-equal to baseline, 2 database rows |

## Files
This run log. Scene artifacts are in the git-ignored `.ai/qa/test-env-runtime/lesson-16/`. No application code changed.

## Outcome
FAIL against the requested 403 `forbidden`. Access was denied and nothing leaked or persisted. The 404 is the specified behaviour (`.ai/specs/2026-11-07-text-session.md` Q2 and acceptance criterion 4), so the expectation and the spec disagree.

## Follow-ups
- Teardown was denied by the harness and is still outstanding: stop the app (PID in `owned.json`), remove container `devmentor-lesson16`, delete `*.jar` in the scene directory, remove worktree `D:/repos/worktrees/aitl-mentio/lesson16-scene`.
- Decide whether non-party denial stays 404 or moves to 403.
- Inspect and clear the stale `.ai/qa/test-env.lock`.
