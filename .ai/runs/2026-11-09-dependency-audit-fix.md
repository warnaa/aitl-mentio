# Run: dependency audit fix

**Date:** 2026-11-09. **Request:** fix the findings from the new `Dependency audit` job on PR #81, in a separate PR.

## Work

Upgraded `next` 16.3.3 to 16.4.5 and kept `eslint-config-next` on the same version. `sharp` moved to 0.35.5 with that install; `source-map-js` to 1.2.2 and `zod` to 4.6.7 through `npm update`, because `npm audit fix` stopped on an unrelated Storybook and `vite` peer conflict. `--force` was not used.

## Files

`package.json`, `packages/app/package.json`, `package-lock.json`, this log, `.ai/lessons.md`.

## Outcome

Local checks passed: `npm audit --omit=dev --audit-level=high` (0 vulnerabilities), typecheck, lint (0 errors), unit coverage (100%), build, integration (46 files, 90 tests). The integration run's snapshot rewrite was reverted.

## Follow-ups

After this merges: update PR #81 from `main` so its audit goes green, record the finding under T39, and add the new jobs to the branch ruleset.
