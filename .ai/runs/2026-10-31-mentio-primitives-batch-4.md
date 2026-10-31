# Mentio primitives — stage 2 batch 4

Date: 2026-10-31. Spec: .ai/specs/2026-10-31-mentio-design-system.md.
Requested: “commit i dalej” — batch 3 and decisions committed as dd10f0f (no push), then batch 4: Table, Skeleton, LoadingMessage, EmptyState, ErrorMessage. Rules of lekcja-06/storybook-mentio.md remain in force. A parallel commit 16a8309 added a CI job running `npm run test:storybook` in both themes.

- [x] Add Skeleton with the shadcn CLI; manifests unchanged. Read existing Table and backend/feedback components and tests.
- [x] Ask where materials are silent; record answers.
- [x] Adapt Table/Skeleton and the three feedback components to tokens and decisions; keep APIs and 100% coverage.
- [x] Five 13-section documentation pages with variants, state matrices, long/narrow, play tests.
- [x] Storybook build/tests, built-page and real-state checks, /admin regression (feedback components are used by the app), full gate; check:tokens must pass with zero findings.
- [x] Update POSTEP/spec/report/lessons; stage 2 completion summary; stop before stage 3.

## Decisions (user, 2026-10-31)

1. Loading motion: LoadingMessage keeps its spinner (stops under reduced motion); Skeleton is static — no pulse.
2. ErrorMessage: keeps the approved, measured `--error-surface` (destructive 5%) with a full destructive border instead of the unapproved `/40`.
3. EmptyState stays centred — an explicit, recorded exception to “everything centred” in What to avoid.
4. Table rows get no hover highlight (rows are not interactive).

Derived: the aria-expanded row tint (`muted/50`) is the same unapproved translucent tint and is removed; table footer uses the full `--muted` auxiliary-surface role; checkbox cell offset becomes a token; Skeleton is aria-hidden by default (decorative; a status text announces loading — WAI-ARIA).

## Outcome

Done — batch 4 and stage 2. Five components were adapted and documented, with 35 new stories (cumulative: 188 stories, 31 MDX pages, 44 play tests). Evidence:
- check:tokens passes with zero findings.
- 376 story tests (3 clean runs).
- 186 page checks and 62 axe audits with zero findings.
- Real-state checks; batch 2–3 regression scripts pass.
- /admin checked with and without a database.
- Unit 237 at 100% coverage; lint, types, build, integration (10) and audit pass.

Report: packages/ui/storybook/verification/2026-10-31-stage-2-batch-4.md.

My first /admin run was invalid: a `setsid`-detached server survived, and the second variant hit it. I stopped only my own process tree by PID and reran with direct PIDs. Lessons appended.

Files: table.tsx, skeleton.tsx, the three backend/feedback components and tests; data-display.test.tsx; globals.css; five stories and five MDX pages; verification report and JSON; POSTEP.md; spec; lessons.

## Decisions after the batch

The user approved the table column and skeleton shape-height proposals (2026-10-31). The docs were updated.

## Local commit authorized

The user asked for “commit i dalej”. Batch 4, the stage 2 summary and the decisions are committed locally on main; no push. Stage 3 continues in its own run log.

## Needs from you

- Say “dalej” for stage 3 (product components, patterns, screens), optionally after a local commit of batch 4.
