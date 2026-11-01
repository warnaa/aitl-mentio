# Mentio design system — stage 5 audit

Date: 2026-11-01. Spec: `.ai/specs/2026-10-31-mentio-design-system.md`.
User requested continuation from POSTEP.md. Next authorized stage: 5 only.
The requested `lekcja-06/prompt-storybook.md` does not exist; POSTEP identifies
`lekcja-06/storybook-mentio.md` as the governing prompt, which was read instead.
No push, publication, application feature work or same-session agent test.

## Checklist

- [x] Build Storybook; lint, types, token and agent-reference checks.
- [x] Unit coverage, application build, integration tests, dependency audit.
- [x] Built docs and stories: 320/768/1440, light/dark, axe, console, overflow.
- [x] Keyboard, overlays, root theme, reduced motion and visual samples.
- [x] Count docs/components/stories/interaction tests and review coverage.
- [x] Prepare a new backlog-screen test for a separate agent session, without running it.
- [x] Report evidence/limitations, update spec and POSTEP, preserve open decisions.

## Outcome

Done — stage 5 audit and test preparation. Separate-session test remains pending; spec stays active. Read-only inventory review was cross-checked against the built index and browser output.

## Verification notes

- Storybook build, lint, typecheck, token checker and agent table pass.
- 298 unit tests, all four coverage metrics 100%; application build passes.
- 10 integration tests pass on an isolated trust-auth PostgreSQL cluster on port
  5434 (`/tmp/mentio-stage5/pg`), stopped after the suite; shared database untouched.
- Dependency audit passes. It also says the existing braces allowlist entry is
  no longer reported; removal is outside this design-system audit.
- First cold browser gate while other heavy checks ran: 952/958, six timing
  failures. Identical complete rerun without source changes: 958/958 in 56.32 s.
  No test timeout/retry changes or accessibility checks disabled.
- Audit harness readiness corrected for portal-only stories (not a component fix).
- 36 keyboard checks, 6 overlay width/theme groups, 8 motion groups pass.
- Actual manager toolbar switch updates the root and an already-open portal.
- Independent read-only review found two stale E04 counts (25 → 23), corrected.

## Final results

Report: `packages/ui/storybook/verification/2026-11-01-stage-5.md`.
450 docs checks / 150 axe audits / 89 links pass. Initial 2,874 story width/theme
checks found three narrow fixture defects; Badge, Card and Skeleton stories were
corrected without changing production components/tokens. All 48 final targeted
checks pass, as do six Message-doc checks/two axe audits. Three negative controls
restore the original overflow; fixed versions have none. Final story gate: 958/958;
after the final Skeleton adjustment, affected suite: 14/14. Final lint/types/tokens
pass. Counts: 75 MDX, 37 components, 479 stories, 151 authored play definitions,
157 stories with effective play. POSTEP and spec checklist updated; spec not moved.
Initial transient service-worker/unfinished-play errors are preserved in the initial
state report and cleared by the final phase-aware recheck.

## Local checkpoint

User requested “commit” after the audit. Stage-5 changes, evidence and progress
are included in a local commit; no push or publication. Diff whitespace check passes.

## Needs from you

Run the prepared Users-screen test in a fresh agent session, then review its decision
ledger and resolve or track every documentation gap. Existing interpretations 1–8
and product-spec gaps remain open. No further authorization was assumed.
