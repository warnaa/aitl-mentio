Title: docs(readme): turn README into a product landing page, move technical docs to docs/development.md

## Goal

Make `README.md` a short landing page for DevMentor: centered title, what the product is, how it works, a feature tour with application screenshots, what is not built yet, a three-command Getting Started and a documentation index. The technical content that used to fill the README now lives in `docs/development.md`.

## Changes

- `README.md` rewritten (about 150 lines instead of 332). Emoji headings, centered title and nav, six screenshots.
- `docs/development.md` is the previous README moved with `git mv` (history follows). Only edits: new title/intro/contents line, links rewritten to `../AGENTS.md`, and the stray "Paying for reserved sessions" paragraph that sat above the introduction is now its own section before Scripts. No technical content was removed.
- `AGENTS.md` task-router row "Commands and local environment" now reads `docs/development.md` instead of `README.md`.
- `BACKWARD_COMPATIBILITY.md` and `docs/security/threat-model.md`: references to the operator/env/script documentation now point at `docs/development.md`.
- `.ai/qa/BOOKING/booking-pending-desktop.png`: a copy of the booking screenshot from `.ai/runs/2026-11-05-booking-flow/`, so the README does not depend on a run folder that context maintenance may archive.

## Screenshots

All taken from existing QA runs and integration artifacts under `.ai/qa/` (synthetic data, no secrets). No new screenshots were captured.

## Verification

- `node scripts/check-agent-routes.mjs` passes (21 tasks, 46 targets, budgets met).
- Every relative link and image path in `README.md` and `docs/development.md` resolves.
- `scripts/ci/change-scope.mjs` classifies the diff as docs-only (application checks skipped). Screenshots deliberately stay under `.ai/qa/` for this reason: a `.png` under `docs/` would force the full CI run.
- Not verified: rendering on GitHub (anchors such as `#-getting-started` follow GitHub's emoji-stripping rule).

## Notes for reviewers

- Feature claims were checked against the changelog and implemented specs. Mentor discovery and Stripe Connect payouts are stated as not built yet.
- The product is named DevMentor throughout, matching the previous README and the app UI.

## Breaking changes

None. Documentation only.
