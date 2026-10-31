# Mentio primitives — stage 2 batch 2

Date: 2026-10-31. Spec: .ai/specs/2026-10-31-mentio-design-system.md.
Requested: new session; read lekcja-06 prompt and packages/ui/POSTEP.md, continue from the step POSTEP marks as next (batch 2: Select, Checkbox, RadioGroup, Card, Badge, Separator). The prompt file named by the user, `lekcja-06/prompt-storybook.md`, does not exist; `lekcja-06/storybook-mentio.md` is the task prompt used. Prompt rules remain in force.

- [x] Read progress/spec/lessons/batch-1 sources; add Select/Checkbox/RadioGroup via shadcn CLI; package.json and lockfile unchanged.
- [x] Ask the user where materials are silent; record answers.
- [x] Adapt the six components to tokens and approved decisions; behavior tests.
- [x] Six 13-section documentation pages; variants, frozen state matrix, long/narrow, play interactions.
- [x] Storybook build/tests both themes, built-page width/theme/a11y checks, real pointer state equality, full repo gate, token checker.
- [x] Update POSTEP/spec/verification report/lessons; stop before batch 3.

## Decisions (user, 2026-10-31, this session)

1. Badge shape: radius-sm 6px from the approved scale instead of the base pill.
2. Checkbox: 16px box, radius-sm 6px; the clickable label provides the 24px target (WCAG 2.5.8 spacing exception).
3. Select trigger: keep only the default 36px size; the generated `size="sm"` option is removed.
4. CardTitle: approved section role 20/28 semibold (also changes existing /admin cards).

Applied without asking because they follow from approved decisions: 36px/8px/1px Select trigger (Q2), full 3px/2px focus and opaque control surfaces (token contrast repairs), no zoom/slide overlay motion (U02.1), separator via --divider-width (R01.3), Card keeps 14px radius, existing shadow and 24px padding (tokeny.md: radii/shadows retained), destructive Badge uses the explicit destructive/destructive-foreground pair.

## Outcome

Done — batch 2 only. Six components were adapted and documented, with 52 new stories (cumulative: 111 stories, 20 MDX pages). Evidence:
- 222 story tests in both themes, plus 15 consecutive clean runs.
- 120 built-page checks and 40 MDX axe audits with zero findings.
- Real pointer/focus states equal the frozen samples, and the portal theme is checked.
- 228 unit tests at 100% coverage; lint, typecheck, app build, integration (10, throwaway local Postgres) and audit pass.
- /admin regression checked in both themes.
- check:tokens: 2 remaining findings, both in Table (batch 4).

Report: packages/ui/storybook/verification/2026-10-31-stage-2-batch-2.md.

Fixed during verification: a Card header overflow at 320 px (container query plus a regression story proven to fail without it), `p > div` nesting in Separator stories, and a flaky Select keyboard test caused by a late resize event closing the Radix list. Lessons appended.

Files: the six component sources in packages/ui/src/components/ui/; globals.css (batch-2 tokens and classes); .storybook/preview.css (frozen states); six stories and six MDX pages in storybook/primitives/; choices.test.tsx; verification report and JSON evidence; POSTEP.md; spec stage line; .ai/lessons.md.

A temporary Postgres and the production server used for checks were stopped and removed. The user's own `next dev` on port 3000 was left running.

## Local commit authorized

The user asked for “commit aktualnych postępów i dalej”. No source changes since the validation gate. Commit the batch, its documentation, reports and memory files locally on main, as with the earlier checkpoints (bbd79ce, e45632b). No push. Batch 3 continues in its own run log.

## Needs from you

- Decide the five proposals and the emoji-digit font finding listed in POSTEP.md.
- Say “dalej” to start batch 3, or ask for a local commit first.
