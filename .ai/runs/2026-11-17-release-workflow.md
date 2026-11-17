# Release workflow (2026-11-17)

Request: create a manually dispatched GitHub Action that releases DevMentor. The
operator picks the new version (bump patch, minor or major, or a custom number). The
action publishes a GitHub Release for it, leaves a git tag for easy recovery, uses the
matching `CHANGELOG.md` entry as the release notes and bumps every `package.json`.

Branch: `feat/release-workflow`. Source doc: `.ai/specs/2026-11-17-release-workflow.md`
(written in Phase 1).

## Goal

One click in the Actions tab (`Release` → *Run workflow*) turns the `CHANGELOG.md`
entry for a version into a tagged GitHub Release, with all workspace versions bumped.

## Scope

- `.github/workflows/release.yml`: `workflow_dispatch` with a `bump` choice
  (`patch` / `minor` / `major` / `custom`) and a `version` text input for `custom`.
- `scripts/release/`: version resolution and changelog extraction in plain Node ESM
  (pure decisions in `release.mjs`, injectable I/O in `effects.mjs`, composition in
  `index.mjs`), unit-tested to the repo's 100% per-file coverage gate.
- `SDLC.md`: a short "Releasing" section (the repo's release process lives outside the
  PR flow; this documents the new step and its prerequisites).
- `.ai/specs/`, `.ai/lessons.md`, this run log.

## Findings that shape the design

1. **`main` cannot receive a bot commit.** The active `main protection` ruleset
   requires six status checks, has no bypass actors and blocks non-fast-forward. A
   commit pushed straight to `main` has no check runs, so GitHub rejects it. The
   bump commit therefore goes on a `release/vX.Y.Z` branch; the tag points at that
   commit, and the operator merges the branch through a normal PR so `main` carries
   the new versions. Tags are not covered by the ruleset, so the tag push works.
2. **Actions cannot open PRs** (`default_workflow_permissions: read`, PR creation not
   allowed) and a bot-opened PR would not trigger CI anyway. The workflow does not
   open the PR; it prints a prefilled compare link in the job summary.
3. **The changelog entry must already exist.** `CHANGELOG.md` is not on `main` yet
   (PR #97 carries `0.1.0`). The run validates the entry first and fails before
   changing anything when it is missing.
4. `npm version <v> --workspaces --include-workspace-root --no-git-tag-version
   --allow-same-version` bumps the root and four workspace `package.json` files plus
   the lockfile, with no other diff (verified locally). Same version is a no-op.
5. Because the bump reaches `main` only after the PR merges, the base for
   patch/minor/major is the **higher of** `package.json` and the newest `vX.Y.Z` tag,
   so an unmerged bump PR cannot make the next release go backwards.

## Behavior

| Input | Result |
| --- | --- |
| `patch` / `minor` / `major` | next = bump(max(package.json, latest tag)) |
| `custom` + `X.Y.Z` | valid semver, `>= package.json` and `>` latest tag; or the tag already exists (resume) |
| `custom` equal to `package.json`, no tag | first release of the checked-in version: no bump commit, tag `main` HEAD |
| a `version` typed with a non-custom bump | rejected, to avoid silently ignoring it |
| not run from `main` | rejected |
| release `vX.Y.Z` already published | rejected |
| tag exists, no release | resume: publish the release from the existing tag |

Order of operations (each step is safe to re-run): validate inputs and extract notes →
bump → commit on `release/vX.Y.Z` → annotated tag → one atomic push of branch and tag →
`gh release create --verify-tag` → job summary with the PR link.

## Non-goals

- Pushing to `main`, changing the ruleset, adding a PAT or GitHub App, or opening the PR.
- Writing the changelog entry (`om-auto-update-changelog` does that).
- Pre-releases, publishing to npm, deployment, or running the test suite in the release.
- Renaming or restructuring existing CI jobs.

## Risks

- First end-to-end run is only possible after merge (a `workflow_dispatch` workflow
  runs from the default branch). Mitigation: the logic is unit-tested, the CLI is run
  locally against the real changelog, and the YAML is linted.
- Operator forgets to merge the `release/vX.Y.Z` PR: next release still computes from
  the latest tag, so versions stay monotonic; the job summary says what to do.
- `.ai/lessons.md` is modified locally in the primary checkout; a rebase there may need
  a trivial conflict resolution on its first lines.

## Progress

PR: #98

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Spec and release logic

- [x] 1.1 Write the release workflow spec — 057d650
- [x] 1.2 Add version resolution and changelog extraction with unit tests — 7adb2b2

### Phase 2: Node effects and entry point

- [x] 2.1 Add injectable effects and the CLI entry point with tests — 0aa2799

### Phase 3: Workflow and docs

- [x] 3.1 Add the manually dispatched release workflow — c49be48
- [x] 3.2 Document the release process and record the lesson — a643591

### Phase 4: Verification

- [x] 4.1 Run the full validation gate and dry-run the CLI on the real changelog

## Review pass

An independent read-only review (fresh subagent; GitHub does not let the author approve
their own PR) found no blockers and these items, all addressed in the follow-up commit:

- major: a squash-merged bump PR leaves the tag unreachable from `main`, which breaks the
  changelog skill's tag-reachability window. Documented that the PR needs a merge commit
  (SDLC.md, spec, workflow header and job summary, lesson).
- minor: headings inside fenced code blocks cut the notes short; a trailing `---` rule was
  published and hid an empty entry. Both fixed in `extractChangelogEntry` with regression tests.
- minor: the spec said a changelog exists on `main` and mentioned `--latest`, which the
  workflow omits on purpose. Spec corrected.
- nit: echoed input in error annotations is JSON-quoted; the weak `listTags` default test
  now asserts the `v*` filter.
- not changed: `npm version` also installs packages (about 25 s); it works and leaves no
  tracked changes.

## Outcome

Status: complete (review pass above; PR #98 marked ready).

Files: `.github/workflows/release.yml`; `scripts/release/{release,effects,index}.mjs` with
tests; `vitest.config.mts` (coverage include); `SDLC.md` (Releasing); the spec; a lesson.

Verification (worktree off `origin/main` f52b572):

- `npm run typecheck`, `npm run test` (1881 tests) and the per-file 100% coverage gate
  (`test:unit:coverage`) pass; `npm run build` passes.
- `npm run lint` exits 1 because of 2 parse errors in vendored
  `.agents|.claude/skills/om-ux-design/references/assets/comments.js`, which are on
  `main` from #94 and not touched here. `scripts/release/` lints clean.
- CLI run against PR #97's real `CHANGELOG.md`: `custom 0.1.0` writes the notes (no TODO
  comment, no empty Highlights) and the outputs; `minor` fails on the missing `0.2.0`
  entry; `patch` with a typed version fails. Exit codes 0 / 1 / 1.
- The workflow's `prepare` step was extracted from the YAML and run against a local bare
  remote: a bump creates `release/v0.2.0` with 6 changed files authored by
  `github-actions[bot]`, an annotated tag on that commit and one atomic push; an
  unchanged version tags `main` and pushes no branch.
- Not verified: `gh release view` / `gh release create`, the Actions UI form and
  `workflow_dispatch` itself. A dispatch workflow runs from the default branch, so the
  first real run is after merge.

Follow-ups:

- Merge PR #97 (the `0.1.0` changelog); the first release is then `custom` / `0.1.0`.
- Open the `release/vX.Y.Z` PR after each release (the job summary links it).
- Fix the vendored `comments.js` lint parse errors (separate change).

