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
- The CI upload will be checked on the PR's first Integration tests run.

## Follow-ups

- Committed QA reports from before this change link to `test-results/integration/...`. They are historical records and were left as they are.
