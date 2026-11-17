# Issue 102 autonomous run

Request: `/om-auto-fix-issue 102` — make `npm run lint` ignore the vendored om-ux-design template assets.

## Work
- Triage: reproduced on `main` (`npm run lint`: 2 errors, `Parsing error: Property assignment expected` in `.claude/skills/om-ux-design/references/assets/comments.js` and its `.agents` twin). No open or merged PR addressed it.
- Claimed the issue with the atomic `refs/om-locks/issue-102` lock, a claim comment and `in-progress`.
- The repo's `.ai/trackers/github.md` predated the lock operations, so it was synced from the packaged descriptor (separate commit, user-approved via the run's question).
- Fix: `eslint.config.mjs` now ignores `.claude/skills/**/references/assets/**` and `.agents/skills/**/references/assets/**`. No rule is disabled for project code; the skills' own `scripts/` stay linted.
- Regression test: `scripts/lint-config.test.ts` (ESLint API `isPathIgnored`); 4 cases fail without the fix.

## Validation
`npm run typecheck`, `npm run lint` (0 errors; 10 pre-existing warnings), `npm run test` (1838 passed), `npm run build` all exit 0.

## Follow-ups
- 10 lint warnings remain in vendored skill scripts and project files; out of scope.
- The new `npm audit` failure (picomatch via awilix, 4 high) is unrelated to this change and fails `Dependency audit` on any PR; it needs its own fix.
