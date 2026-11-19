# Run lightweight CI for documentation changes

Date: 2026-11-06

## Problem / Goal

Documentation and agent-record PRs currently run production builds and expensive
database/browser integration tests. Keep instruction validation for these PRs and
reserve application checks for changes that can affect executable behavior.

## Non-goals

Changing application tests, dependencies, required check names or branch protection.

## Approach

Remove workflow-level path exclusions. A dependency-free change-scope job inspects
the entire PR diff from merge base to head, with rename detection disabled so both
the old and new paths participate. Markdown (`.md`), `.gitignore` and known evidence
formats (PNG/JPEG/GIF/WebP/SVG, PDF, MP4/WebM, log/text/CSV) under `.ai/runs/`,
`.ai/qa/`, `.ai/analysis/`, `.ai/lessons/` qualify for lightweight CI.
All other paths, including MDX, executable scripts, workflow YAML, lockfiles and
configuration, require application CI. Unknown paths and classification failures
default to the full suite. Empty diffs also use the full suite.

Lint always validates instruction routes and the classifier for ready PRs; it
installs dependencies and runs ESLint only for application changes. Build, Unit
tests and Integration tests skip their entire jobs for documentation-only diffs.
Keep their existing names and draft behavior. Do not skip entire workflows, since
that can leave required checks pending. No new package or remote API is needed.

## Acceptance criteria

- Documentation-only and the artifact-policy PR's paths do not run npm install,
  builds, application unit tests or integration tests.
- Code, mixed changes, MDX, workflows, dependencies and unknown files run all four
  existing application checks; docs-only latest commits cannot hide earlier code.
- Deletions and code-to-documentation renames still select application checks.
- Failed classification runs application checks rather than bypassing them.
- Lint checks instruction routes and change-classifier regressions without npm.
- Required check names, read-only permissions and draft handling remain intact.

## Open questions

None. The user approved the lightweight/application split. `.gitignore` is included
explicitly to cover the existing artifact-policy PR; other configuration defaults
to the full suite.

## Implementation plan

1. Add the dependency-free classifier and native Node regression tests.
2. Wire job outputs and conditions; update CI documentation.
3. Verify classification against temporary Git history and the actual PR paths,
   validate workflow structure, run route and focused lint checks, and review diff.
