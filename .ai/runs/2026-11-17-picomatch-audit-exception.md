# Run: picomatch advisory fails the required Dependency audit

**Date:** 2026-11-17. **Request:** `om-auto-fix-issue 101` — clear the `picomatch` ReDoS advisory (GHSA-fc5q-39xc-vjpf) that fails the required Dependency audit on `main` and every PR. **Result:** PR #105.

## Work

- **Finding:** the advisory covers every published `picomatch` (`<= 4.0.7` is the latest) and `awilix` 13.0.7, the newest, still depends on `fast-glob` → `micromatch` → `picomatch`. No `overrides` entry or upgrade clears it, and `npm audit fix --force` only downgrades `awilix` to 6.0.0, so it was not used.
- **Fix:** replaced the raw `npm audit` step with `scripts/ci/audit-gate.mjs`. The level stays `high`; only the dated entries in `scripts/ci/audit-exceptions.json` are accepted, each bound to an advisory, a package and its allowed direct dependents. The one entry expires 2027-02-15. The gate fails on expiry, on a new direct dependent, or when a non-breaking fix appears.
- **Why accepting is safe:** `awilix` globs only in `loadModules()`/`listModules()`. The container registers every binding explicitly, and `awilix-glob-loading.test.ts` fails if either call is added.
- **Review:** the review found `npm run lint` red because of two `{{placeholder}}` template files from #94 (`om-ux-design/references/assets/comments.js`). They are now ignored in `eslint.config.mjs`. Minor findings: a `BACKWARD_COMPATIBILITY.md` §5 note and a calendar-date check.
- **Claims:** the repo's tracker descriptor predated the atomic lock operations, so it was synced from the shipped template in its own commit (`dfb2b97`). The lock moved from the issue to the PR without a gap and was released once, at the end.

## Files

`scripts/ci/audit-gate.mjs`, `scripts/ci/audit-exceptions.json`, `scripts/ci/audit-gate.test.mjs`, `packages/core/src/container/awilix-glob-loading.test.ts`, `.github/workflows/ci.yml`, `package.json`, `vitest.config.mts`, `eslint.config.mjs`, `BACKWARD_COMPATIBILITY.md`, `docs/security/threat-model.md`, `.ai/trackers/github.md`, `.ai/lessons.md`, this log.

## Outcome

Approved, in `merge-queue`, all 8 required checks green on `336bc04` (including Dependency audit and Lint). The review was posted as a comment review because GitHub does not allow approving your own PR, so a human merge is still needed.

## Follow-ups

- Before 2027-02-15: run `npm view picomatch version`, and either drop the exception or renew it with a fresh rationale.
- Decide whether to keep the tracker-descriptor sync (`dfb2b97`) in this PR or drop it; it is independent of the fix.
- Commit `dc32dec` accidentally included 9 unrelated skill-file changes that something else had modified in the worktree; `336bc04` restored them. Find out what rewrites `om-auto-manage-issues` and `skills-lock.json` in worktrees.
- Add the `Dependency audit` check to the branch ruleset if it is not already there.
