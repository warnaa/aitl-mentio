## What changed

Reconcile resolved findings from [the 2026-11-19 audit](https://github.com/warnaa/aitl-mentio/blob/docs/maintenance-drift-2026-11-19/.ai/maintenance/2026-11-19-audit.md): main as the PR base (W01), the release merge-commit exception (W02), conditional CI/security jobs (W03), the dated five-required-check snapshot (W04), the release env adapter (W06), existing T39 controls (W07), answer editing until note approval (W09), and setup/env guide placement (W10).

Move only the release-workflow and documentation-CI-split specs to `.ai/specs/implemented/` using `git mv`, with identical blobs. Update their references in SDLC, run records and the release workflow comment. The original audit paths refer to its main snapshot. Original premises inside the moved specs remain historical; current check truth is documented in `docs/development.md`.

No executable code changes. The only YAML edit is a documentation comment. No existing implemented/archive spec content changed. Other active specs receive explicit amendments for already-shipped behavior. Source-complete classification follows the report; it does not certify current full coverage or a production release.

## Decisions for the team

- **W05 - local audit gate:** Engineering standards require dependency audit in validation, but the configured local gate and SDLC list only typecheck/lint/test/build. Decide whether to add `node scripts/ci/audit-gate.mjs` locally or approve an explicit CI-only policy. This PR changes neither config nor that requirement.
- **W08 - audit-gate coverage:** The native regression tests exist, but `scripts/ci/audit-gate.mjs` has no enforced per-file 100% measurement. Decide ownership and scheduling of a separate code/config follow-up to measure and enforce the standing rule; it is not waived here.
- **W04 - required-check membership:** Live main rules (2026-11-19) require Build, Unit tests, Secret scan, Dependency audit and CodeQL. Decide whether Lint and Integration tests should also block merges. This PR records the observed five without mutating branch rules.
- **Unresolved prior baseline:** Prototype prices/ratings, run-folder format, CLAUDE wrappers, session_version, booking-confirmation R19, browser pin and UI folders were outside the current audit scope. Re-audit and choose authoritative contracts before changing them. No findings are silently marked resolved.

## Validation

- `node scripts/check-agent-routes.mjs`: passed (21 tasks, 46 targets, 55 instruction files).
- `node --test scripts/ci/change-scope.test.mjs scripts/ci/audit-gate.test.mjs`: 25 passed, 0 failed.
- Git blob/rename checks: both moved specs unchanged; all previously implemented/archive specs unchanged.
- Workflow comparison with comments/blank lines removed: identical; reference scan and `git diff --cached --check` passed.
- App, integration and full-coverage suites were not run for documentation-only behavior. The workflow-comment path conservatively selects full application CI; CI results are pending at PR creation.

## Decisions touched

No product decisions changed; answer-freeze wording follows the existing session-notes contract.
