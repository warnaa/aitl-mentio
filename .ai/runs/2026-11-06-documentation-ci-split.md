# Split documentation and application CI

Request: keep lightweight instruction validation while avoiding costly application
checks, especially integrations, for documentation-only PRs.

Plan/spec: `.ai/specs/2026-11-06-documentation-ci-split.md`. Reviewed independently
before implementation and again against the resulting diff; no blocking findings.

Work: removed workflow trigger path exclusions; added a dependency-free Git
merge-base classifier and native Node regressions. Kept Lint mandatory for ready
PRs to run instruction-route and classifier checks without npm. Build, Unit tests
and Integration tests skip only when classification explicitly reports false;
classification failure or missing output selects full application checks. Lint's
dependency install and ESLint steps use the same selection. Preserved required
check names, draft handling and read-only workflow permissions. Evidence formats
are allowlisted so executable helpers in record directories still trigger tests.

Files: CI workflow, `scripts/ci/change-scope.mjs` and its tests, SDLC and backwards
compatibility documentation, testing instructions, spec, lessons and this record.

Verification: four native tests passed, covering actual artifact-policy paths,
code/config/MDX/unknown and mixed changes, invalid SHAs, temporary Git histories,
base-branch advancement, earlier code followed by docs, deletions, code-to-Markdown
renames, and CLI output. The newline-filename case is Linux-only. Workflow YAML
parsed successfully; evaluated actual job expressions for docs/code/failure,
missing output, drafts and cancellation. Focused ESLint, instruction-route/budget
and whitespace checks passed. Native tests initially hit sandbox spawn EPERM and
passed in the authorized execution context. Application runtime suites were not
run locally because application source is unchanged.

Outcome: ready to update PR #70. Its workflow/script changes intentionally select
full CI; the original artifact-policy diff selects lightweight CI. Live skipping
on GitHub requires a future PR with only qualifying paths. No product decisions
or application behavior changed.
