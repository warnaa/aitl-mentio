# Run: system-wide threat model update

**Date:** 2026-11-09. **Request:** `/threat-model` with no narrower scope, so the whole system.

## Work

Updated the existing model in place. Read route handlers and the auth, invitation, payment, notification and text-session services at `f5408a4`, and confirmed each candidate threat against code. T01–T25 keep their IDs; added T26–T39, a system profile, status of earlier threats, test scope, and diagram coverage for accounts, operators, text sessions, GitHub and Resend.

## Files

- `docs/security/threat-model.md`
- `docs/security/threat-model.mmd`

## Outcome

Documentation only. No application code changed, no attacks or scans run, nothing committed. Not rendered to SVG: no Mermaid renderer was installed and the skill says not to add one; render with `npx @mermaid-js/mermaid-cli -i docs/security/threat-model.mmd -o docs/security/threat-model.svg`.

Highest priority findings: T26 (a password set on an unverified row survives the real owner's verification, with no reset path), T27 (per-IP limits off by default), T17 (one account can hold about 60 slots).

## Not verified

`npm audit` was denied by the session's permission mode, so dependency vulnerabilities are unchecked (recorded in the model's open questions). Findings come from reading code; none was reproduced against a running app.

## Update: decisions and first items

Each in-scope threat was re-checked against code. Damian approved the work order and owns the accepted risks (T30, T35, residuals of T28, T34, T38), recorded in the model. Added `Secret scan`, `Dependency audit` and `CodeQL` jobs to `.github/workflows/ci.yml`, a note in `tests/AGENTS.md`, and the spec `.ai/specs/2026-11-09-verification-bound-to-browser.md`, using Damian's answers (browser binding, GitHub takeover, reset separate, no real users). An independent subagent review found a race where a link could sign another request's version (confirmed in `user-version.ts:30-31`), a missing post-lock re-check and a wrong claim about old links; all applied to the spec. The new CI jobs have not run: that needs a pushed PR. T26 code not started.

## Follow-ups

Offer one tracker issue per missing High-impact mitigation (T26, T37, T39). Before paid traffic: schedule `payments:reconcile`, register the webhook.
