# Agent instruction checks in CI

Date: 2026-11-04. Included in the local commit at the user's explicit request.

## Request

Add the static agent instruction checks to the CI pipeline.
After reviewing the results, the user requested committing all changes, including
this run log.

## Work

- Reviewed the root/testing instructions, CI workflow, related CI specification,
  compatibility contract, lessons and the existing route checker. The working
  tree was clean; the previously excluded agentsx directory was absent.
- Delegated read-only contract and committed-target verification. The four job
  names are protected; all routed files exist in the committed checkout.
- Added a named `Check agent instruction routes and budgets` step to the existing
  Lint job, running `node scripts/check-agent-routes.mjs` after Node 24 setup and
  before dependency installation. It runs on every pull request and a nonzero
  exit fails Lint. No new dependencies, permissions, job names or conditions.
- Documented the check and its local command in the README's CI section.

## Files touched

- `.github/workflows/ci.yml`
- `README.md`
- This local run log.

## Validation and outcome

- Parsed the workflow using the already-installed YAML parser with unique-key
  validation. Verified the agent step is unconditional, follows Node setup and
  precedes npm installation/ESLint. Removing only the added step restores the
  previous parsed workflow exactly, including the four existing job names.
- Ran the exact command from a temporary archive of HEAD without node_modules:
  passed with 21 tasks, 46 targets and 8 instruction files within budget.
- In that isolated checkout, a missing route and an oversized root each caused
  exit code 1. Temporary files were cleaned up.
- The first clean-checkout fixture attempt used a tar extraction argument absent
  in local Python; reran successfully with the installed system tar.
- Ran the checker in the workspace and `git diff --check`: passed.
- No application behavior changed, so application tests were not needed.

Outcome: CI configuration and documentation updated; the user authorized a local
commit of all changes and this report. No push, remote workflow run or
branch-ruleset changes. No follow-ups required to run the
check under the existing Lint status once these changes land.
