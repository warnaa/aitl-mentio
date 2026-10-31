# CI — Storybook test job

Date: 2026-10-31. Outcome: done locally; not yet run in CI.
Requested: add a separate job to `.github/workflows/ci.yml` that runs the stage-1 Storybook
tests in both themes, installs a Playwright browser, copies the checkout/setup-node/npm ci
steps from the existing jobs, leaves the other jobs unchanged, uses the newest action
versions, and shows the job's YAML for approval before saving. After review the user also asked
for a failure-screenshot upload step.

- [x] Find the script: `test:storybook` (root → `@mentio/ui`, `vitest run --config
      vitest.storybook.config.ts`; named in POSTEP.md "Planned root scripts").
- [x] Themes: the product has light and dark; the config already defines `storybook-light` and
      `storybook-dark` projects, so one run covers both — no matrix.
- [x] Action versions: `checkout`, `setup-node` and `upload-artifact` are at v7, the latest
      major for each (v7.0.1, v7.1.0, v7.0.2 via the GitHub releases API).
- [x] Show the YAML and get approval; user approved and asked for the screenshot upload.
- [x] Add the `storybook` job after `integration`, with the same `changes` gate.
- [x] Verify: the file parses (8 jobs); diff only adds lines to `ci.yml`.

## Decisions

- `npx playwright install chromium` without `--with-deps`: the runner image already has
  Chromium's system libraries, and apt font installs stalled CI before (lesson 2026-10-23).
  The install step has a 5-minute timeout; the test step has 10 minutes; the job has 20.
- Failure screenshots: Vitest browser mode (headless) defaults `screenshotFailures` to true and
  writes `__screenshots__/` next to each test file. Story files live under
  `packages/ui/storybook/`, so the upload path is `packages/ui/storybook/**/__screenshots__/`,
  `if: failure()`, `if-no-files-found: ignore`.
- No spec: a single additive CI job that follows the existing job template.

## Files

- Changed: `.github/workflows/ci.yml` (new `storybook` job only).
- Created: this log.
- Unrelated, pre-existing uncommitted work (batch 3) left untouched: `packages/ui/POSTEP.md`,
  `packages/ui/src/styles/globals.css`, `packages/ui/.storybook/preview.css`, new primitives,
  `.ai/runs/2026-10-31-mentio-primitives-batch-3.md`.

## Not verified

- The job has not run in CI. Whether Chromium launches on `ubuntu-26.04` without
  `--with-deps` will only show on the first run; if a system library is missing, add
  `--with-deps` to the install step.
- `actionlint` not run (fetching it via `npx` was blocked as external code).
- Not committed.

## Needs from you

- Approve a commit of `ci.yml` and this log (separately from the batch-3 work), and push/open
  a PR so the job runs on GitHub.
