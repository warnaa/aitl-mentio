# Release workflow

## Problem / Goal

DevMentor has a `CHANGELOG.md` but no way to cut a release: versions are bumped by
hand in five `package.json` files, nothing is tagged and no GitHub Release exists.

Goal: a manually dispatched GitHub Action (`Release`) where the operator selects
`patch`, `minor`, `major` or `custom` (with a version number). One run bumps every
`package.json`, creates a git tag and publishes a GitHub Release whose notes are the
matching `CHANGELOG.md` entry.

## Non-goals

- Pushing to `main`. The `main protection` ruleset requires six status checks and has
  no bypass actors, so a bot commit cannot land there.
- Opening the follow-up PR (Actions cannot create PRs here and a bot PR would not
  trigger CI), changing the ruleset, or adding a token or GitHub App.
- Writing the changelog entry; `om-auto-update-changelog` owns that.
- Pre-releases, npm publishing, deployment, running the test suite during release.

## Approach

`.github/workflows/release.yml` (`workflow_dispatch`, `contents: write`, one run at a
time) calls `scripts/release/index.mjs`, then does the git work in shell.

1. Refuse to run from any ref other than `main`.
2. `scripts/release/` resolves the version and writes the release notes, before
   anything is changed:
   - base = higher of root `package.json` version and the newest `vX.Y.Z` tag;
   - `patch`/`minor`/`major` bump the base; `custom` takes `MAJOR.MINOR.PATCH` that is
     `>= package.json` and `>` the newest tag, or an existing tag (resume);
   - a `version` supplied with a non-custom bump is rejected;
   - notes are the `# <version> (date)` section of `CHANGELOG.md` up to the next
     level-1 heading, with HTML comments and empty `##` sections removed; a missing or
     empty entry fails the run.
3. Refuse when a GitHub Release for the tag already exists.
4. If the tag does not exist: `npm version <v> --workspaces --include-workspace-root
   --no-git-tag-version --allow-same-version` (root, four workspaces and the
   lockfile). When that changes files, commit them on `release/vX.Y.Z`; otherwise
   (first release of the checked-in version) tag `main` as it is. Create an annotated
   tag `vX.Y.Z` and push branch and tag in one `--atomic` push.
5. `gh release create vX.Y.Z --verify-tag --notes-file ... --latest`.
6. The job summary links the release and a prefilled compare URL for the
   `release/vX.Y.Z` → `main` PR that carries the bump to `main`.

**Recovery.** The tag exists before the release does. If publishing fails, re-run with
`custom` and the same version: the tag exists and no release does, so only the release
is created. If the run fails before the push, nothing changed and any input can be
retried. Because the base includes the newest tag, an unmerged bump PR cannot make the
next release go backwards.

## Acceptance criteria

1. The workflow can only be started manually and offers `patch`, `minor`, `major`,
   `custom` plus a version field.
2. A run produces tag `vX.Y.Z` and a GitHub Release `vX.Y.Z` with the changelog entry
   as its body.
3. Root and all workspace `package.json` files and `package-lock.json` carry the new
   version on the release commit.
4. A missing changelog entry, invalid or non-increasing custom version, mismatched
   inputs, a non-`main` ref or an already published release fails before any push.
5. Re-running with `custom` and the same version after a failed publish creates the
   release from the existing tag.
6. Workflow inputs reach shell steps only through environment variables.
7. `scripts/release/*.mjs` have unit tests with 100% per-file coverage.
