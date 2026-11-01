# Mentio design system — stage 3d: E03–E05 (preliminary)

Date: 2026-11-01. Spec: .ai/specs/2026-10-31-mentio-design-system.md.
Requested: “commit i dalej” — 3c committed as 353e099 (no push); then 3d only. Interpretations 1–8 from 3b/3c were not addressed and remain open. Rules of lekcja-06/storybook-mentio.md remain in force.

## Sources

E03–E05 have no screen specs (approved stage-0 Q4: their contracts stay gaps; stories are preliminary). Inputs used:
- Backlog E03-S01, E04-S01, E04-S02, E05-S01.
- Brief rules R01, R02, R06, R09, R10, R12, R14, R21, D07, D13, D14, D16, D19, N01.
- Book-and-pay spec: the contract with E03 (`accepted`/`declined`, decline refund via `booking:<id>:refund`, R12 due check, settle widened to the mentor), `MentorEarning` (price, commission, share, reason `mentee_late_cancel` / `session_held` / `mentee_no_show`).
- References R01.1–R01.3, R02.1–R02.6, U02.1; approved Q3 (session layout) and Q5 (inline quoted reply).

Anything not in those sources (routes, endpoints, error codes, copy, keyboard shortcut) is marked **Proposal**.

## Component decision (derived, for the user)

- **E03:** no new component. The mentor's decision screen reuses BookingSummary, ActionButton and DataTable; the stage-0 “MentorDecision” is a composition.
- **E04:** `components/messages/Message` and `MessageComposer`, used by both participants' session screens. The stage-0 SessionHeader is a composition (page heading, StatusBadge and BookingSummary in the side column). The stage-0 SettlementNotice is an Alert composition, documented as a pattern.
- **E05:** `components/earnings/EarningsSummary` (price − commission = share), used on the earnings page (totals) and on a settled session's details. The folder is named after the spec's `earnings` concept, not the stage-0 `payments` placeholder. EarningRow is a DataTable column set.

## Plan

- [x] Message + MessageComposer (100% unit tests), export `./components/messages/*`.
- [x] EarningsSummary (100% unit tests), export `./components/earnings/*`.
- [x] 13-section pages for the three components.
- [x] Screen stories with MSW and state maps: E03 mentor sessions list and decision; E04 session room and transcript, settlement on next visit; E05 earnings.
- [x] Patterns: Mentor decision, Conversation and reply, Next-visit settlement, Earnings.
- [x] Gate: tokens, stories in both themes, page/axe, product browser checks, visual review, unit coverage, lint, types, build, integration, audit; report; POSTEP; lessons; stop before stage 4.

## Outcome

Done — 3d only, preliminary. See packages/ui/storybook/verification/2026-11-01-stage-3d.md.

Evidence:
- 79 new stories (477 cumulative) and 10 new MDX pages (61).
- 954 story tests; 366 page checks; 122 axe audits (WCAG A/AA) with zero violations.
- No overflow in 201 product and pattern stories.
- Visual review of 4 screens.
- 289 unit tests at 100%; lint, types, build, 10 integration tests and audit pass.

Fixed during the run:
- Message accessible names.
- Composer focus on the first render.
- A shell declared inside render.
- Multi-line MDX tables.
- A width-dependent play test.

The throwaway Postgres cluster was stopped and removed. The untracked `.ai/runs/2026-11-01-git-ca-repair.md` is not from this run and was left untouched.

## Follow-up — user decisions 2026-11-01

- [x] Decisions 9–15 recorded; Proposal marks replaced; E02 “Accepted”.
- [x] Short table dates applied and documented; measured as not sufficient at 320 px (decision 16).
- [x] Axe best-practice fixed: `useId` in three components (regression tests), slot days not landmarks, docs pointers instead of duplicate canvases; 0 findings on 61 pages.
- [x] Gate re-run. Root lint is blocked by 29e9281 in `.agents/` (decision 17).

- [x] Decision 16: DataTable rows stack below 48rem (container query); no table scrolls at any width; gate green.
- [x] Decision 17: `.agents/**` ignored by ESLint; root lint passes.

## Needs from you

- Confirm interpretations 1–8.
- Say “dalej” for stage 4, optionally after a local commit.
