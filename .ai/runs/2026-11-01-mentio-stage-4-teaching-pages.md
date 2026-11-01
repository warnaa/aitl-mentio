# Mentio design system — stage 4: teaching pages, epics, agent reference

Date: 2026-11-01. Spec: .ai/specs/2026-10-31-mentio-design-system.md.
Requested: “commit i dalej” — 3d with decisions 9–17 committed as 81023e2 (no push); then stage 4 only. Interpretations 1–8 (3b/3c) remain open. Rules of lekcja-06/storybook-mentio.md remain in force.

## Scope (task, stage 4)

- Start here, Components, How to choose, Usage and accessibility, Content, What to avoid, What is missing, Contributing.
- One page per backlog epic E01–E06: flow, screens and stories, states, source files, remaining product work.
- Agent reference `docs/design-system.md` (character, component table with import/when/when not, semantic tokens, “if… use…”, what to avoid, Storybook commands), referenced from AGENTS.md (approved stage-0 decision 1 allows these files outside the package).

Approach: one inventory module (`storybook/design-system/inventory.ts`) feeds Start here, the Components catalog and the agent file's component table, so they cannot drift. Every rule carries a source; anything without one is marked Proposal and reported.

## Plan

- [x] Inventory module + Components catalog (live previews; page-level components shown inert because they own page landmarks).
- [x] Start here, How to choose, Usage and accessibility, Content, What to avoid, What is missing, Contributing.
- [x] Epic pages E01–E06; menu order under Design system.
- [x] docs/design-system.md + AGENTS.md reference.
- [x] Gate: build, tokens, stories both themes, page/axe checks incl. link targets, unit coverage, lint, types, app build, integration, audit; report; POSTEP; stop before stage 5.

## Outcome

Done — stage 4. Report: packages/ui/storybook/verification/2026-11-01-stage-4.md.

Evidence:
- 14 new MDX pages (75 in total).
- 450 docs-page checks and 150 axe audits with zero findings (best-practice included).
- 89 internal links resolve.
- 201 stories with no overflow or table scrolling.
- Visual review of 4 pages.

Gate:
- lint 0;
- typecheck 0;
- 298 unit tests at 100%;
- 958 story tests;
- tokens and the agent table check pass;
- app build, 10 integration tests (throwaway Postgres, removed) and audit pass.

Fixed during the run:
- Nested-table contrast in dark mode.
- MDX asterisks.
- Forbidden-class examples in prose.
- Ordered-list numbers.
- Docs tables at 320 px.
- Name wrapping.
- The PanelShell thumbnail.

Files outside packages/ui (approved stage-0 decision 1): `docs/design-system.md`, the AGENTS.md pointer, and the root `package.json` scripts `docs:agent` and `check:agent-doc`.

## Follow-up — decisions 18–22 (2026-11-01)

- [x] 18 tone examples and 19 long date approved; Proposal marks removed.
- [x] 20 Damian alone approves everything (Contributing).
- [x] 21 priorities asked item by item (13 questions) and recorded on What is missing.
- [x] 22 `npm run check:agent-doc` added to the CI lint job.

## Needs from you

- Confirm interpretations 1–8 in POSTEP.md.
- Say “dalej” for stage 5, optionally after a local commit.
