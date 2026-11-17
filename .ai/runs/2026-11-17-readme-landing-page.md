# Run: README landing page

- **Date:** 2026-11-17
- **Request:** Prepare a pull request with a new README.md for DevMentor: simplified landing page presenting the features, emoji, centered title, application screenshots from earlier AI runs or integration-test artifacts, a short Getting Started, technical details moved to a separate documentation page.

## Work

- Read the old README (332 lines, mixed landing/setup/config/architecture), product brief, changelog and candidate screenshots under `.ai/qa/` and `.ai/runs/`.
- Chose six screenshots: mentor page with booking, text session (desktop and 320px), written answer, private note awaiting approval, operator workspace.
- `git mv README.md docs/development.md`, retitled it, fixed relative links, and moved the stray payments paragraph into a proper section.
- Wrote the new `README.md`; kept screenshots under `.ai/qa/` so the docs-only CI classification still applies (a `.png` under `docs/` triggers full CI).
- Updated references to the old README in `AGENTS.md` (task router), `BACKWARD_COMPATIBILITY.md`, `docs/security/threat-model.md`.
- No spec written: a documentation-only change, judged small and obvious.

## Files

`README.md`, `docs/development.md` (moved), `AGENTS.md`, `BACKWARD_COMPATIBILITY.md`, `docs/security/threat-model.md`, `.ai/qa/BOOKING/booking-pending-desktop.png`, `.ai/pr-drafts/readme-landing-page.md`, this log.

## Outcome

Committed locally on `t3/09565bdc`. Not pushed and no PR opened: AGENTS.md requires explicit approval for remote writes.
Checks run: `node scripts/check-agent-routes.mjs` (pass), link/image path check (pass), change-scope classification (docs-only).

## Follow-ups

- Approve a push and PR (draft body: `.ai/pr-drafts/readme-landing-page.md`).
- Specs under `.ai/specs/` still say "README.md" for env/script docs; left untouched because specs are not edited after writing.
- Code comments in `scripts/setup/*.test.mjs` mention the README's "Bring your own PostgreSQL" section; the section now lives in `docs/development.md`.
