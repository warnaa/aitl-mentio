# Mentio primitives — stage 2 batch 3

Date: 2026-10-31. Spec: .ai/specs/2026-10-31-mentio-design-system.md.
Requested: “commit aktualnych postępów i dalej” — batch 2 committed locally as 9b758c6 (no push), then batch 3 only: Alert, Dialog, AlertDialog, DropdownMenu, Popover, Tooltip. Rules of lekcja-06/storybook-mentio.md remain in force.

- [x] Add the six primitives with the shadcn CLI; declined overwriting the adapted button.tsx; package.json and package-lock.json unchanged.
- [x] Ask where materials are silent; record answers.
- [x] Adapt the six components to tokens and approved decisions; unit regression tests.
- [x] Six 13-section documentation pages; variants, state matrices, long/narrow, play interactions (keyboard, focus trap/return, Escape, theme in portals).
- [x] Storybook build/tests both themes, built-page and real-state checks, full repo gate, token checker.
- [x] Update POSTEP/spec/verification report/lessons; stop before batch 4.

## Decisions (user, 2026-10-31)

1. Modal scrim: new token --overlay-scrim, raw neutral-950 at 50% (warm, base strength, no blur).
2. Dialog and AlertDialog titles: body role 16/24 semibold (not the section role used by CardTitle).
3. AlertDialog: default size only; the generated `size="sm"` is removed.
4. Tooltip: inverted foreground/background pair with arrow, as in the base; values tokenized.

Derived from earlier approvals: no zoom/slide/fade entrance on overlays (U02.1); opaque popover surfaces (A01.2); menu rows reuse batch-2 --menu-* tokens; destructive menu item highlight uses the approved --error-surface; dialog close control is a 32px ghost icon Button (WCAG 2.5.8); dialog text left-aligned at every width (task What to avoid: everything centred); AlertTitle wraps instead of line-clamp (WCAG 1.4.10, longer languages).

## Outcome

Done — batch 3 only. Six components were adapted and documented, with 42 new stories (cumulative: 153 stories, 26 MDX pages). Evidence:
- 306 story tests in both themes (8 clean full runs).
- 156 built-page checks and 52 MDX axe audits with zero findings.
- Docs-opened overlays checked for theme and viewport; real menu hover equals the frozen samples; the tooltip is hoverable and dismissible; the dialog footer layout is correct at each width.
- 234 unit tests at 100% coverage; lint, typecheck, app build, integration (10, throwaway Postgres) and audit pass.
- check:tokens: only the 2 Table findings remain.

Report: packages/ui/storybook/verification/2026-10-31-stage-2-batch-3.md.

Fixed during verification:
- Unnamed popover dialogs.
- Long menus overflowing the viewport.
- An overflowing popover trigger.
- A dialog header running under the close button.

An attempt to show open modals in docs through nested story frames was reverted: the nested preview broadcast its own globals and switched the docs page to light. Lessons appended.

Files: six component sources; globals.css (batch-3 tokens and classes); preview.css (frozen menu rows); six stories and six MDX pages; overlays.test.tsx; verification report and JSON evidence; POSTEP.md; spec stage line; .ai/lessons.md.

Temporary servers and the throwaway Postgres were stopped by PID and removed. The user's dev server and the environment's Postgres were left running.

## Decisions after the batch and local commit

The user decided proposals 6–8 (approved), accepted the tooltip-scroll limitation, kept the font stack unchanged (4 measured options presented), and approved batch-2 proposals 1–5, with amounts shown as “zł” instead of “PLN”. Docs, stories and tests were updated, and validation was re-run: stories 306, unit 234 at 100%, lint, types, build-storybook, 156 page checks with zero axe findings. The earlier “Noto Sans” font diagnosis was corrected after measurement.

The user then asked for “commit i dalej”. Batch 3 and the decision updates are committed locally on main; no push. Batch 4 continues in its own run log.

## Needs from you

None — all decisions recorded; batch 4 authorized.
