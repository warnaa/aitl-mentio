# Run: store integration test results under .ai/qa (#54)

**Date:** 2026-11-10. **Request:** `/om-auto-fix-issue 54`. Bug route: verify, root cause, fix, PR, review.

## Work

The triage check confirmed the bug was still present on `main` at `4030689`. `integrationArtifactsDirectory` resolved to `test-results/integration`, and the CI upload pointed there too. No open or merged PR addressed it. The root cause was one hard-coded constant and a CI path that matched it. Changed both so they point at `.ai/qa/integration/`. Added that directory to `.gitignore` and documented the `.ai/qa/` contract in root `AGENTS.md`, `tests/integration/AGENTS.md` and `README.md`. Added a regression test that keeps the writer, the CI upload and the ignore rules in agreement.

## Files

- `tests/integration/agent-browser.ts`: the constant, with a doc comment
- `.github/workflows/ci.yml`: upload path `.ai/qa/integration/`
- `.gitignore`: ignores `.ai/qa/integration/`
- `AGENTS.md`, `tests/integration/AGENTS.md`, `README.md`: the artifact contract
- `scripts/ci/integration-artifacts.test.ts`: new regression test
- `.ai/lessons.md`: new lesson

## Outcome

- The regression test failed 3/3 against the old writer, workflow and ignore rules. It passes 3/3 with the fix.
- Full gate passed: `npm run typecheck`; `npm run lint` (0 errors, 2 warnings, both in files this change doesn't touch); `npm run test` (216 files, 1833 tests); `npm run build`. `node scripts/check-agent-routes.mjs` passed.
- `npm run test:integration -- tests/integration/home.integration.test.ts` passed (1 test). It wrote `home.png`, `home-mobile.png`, `app.log` and `agent-browser/` under `.ai/qa/integration/`. Git ignores all of them, and no `test-results/` folder was created.
- That run also changed `packages/db/migrations/.snapshot-devmentor.json` as a side effect. The change was reverted because it isn't part of this fix.

## Not verified

- The forced-failure path was not run. `captureBrowserFailure` builds its paths from the same constant the test checks.
- None remaining on CI. On PR #90, Integration tests passed and uploaded `integration-evidence-<run_id>` (about 8.8 MB) from `.ai/qa/integration/`.

## CI

- The first Unit tests attempt failed on `MentorProfileEditor.test.tsx`, a focus assertion in a file this change doesn't touch. It looks flaky: the test passed locally and `main` was green. A single re-run of the failed job passed, and every check is now green.
- The PR was reviewed and approved. GitHub refuses to let an account approve its own PR, so the review was posted as a comment. The PR's labels are `merge-queue`, `bug`, `skip-qa`, `priority-medium` and `risk-low`. It was not merged.

## Follow-ups

- `MentorProfileEditor.test.tsx` focus assertion is flaky on CI; worth a tracking issue if it recurs.

- Committed QA reports from before this change link to `test-results/integration/...`. They are historical records and were left as they are.
