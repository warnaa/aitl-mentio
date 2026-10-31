# Mentio primitives — stage 2 batch 1

Date: 2026-10-31. Spec: .ai/specs/2026-10-31-mentio-design-system.md.
Requested: “dalej”; first commit stage 1. Local checkpoint bbd79ce created before any batch code; no push. Continue the already authorized first batch only.

- [x] Read progress/spec/lessons and record retained sizes and changed states with sources.
- [x] Adapt Button/Input/Textarea/Label and add approved generic Link/FormField.
- [x] Write six 13-section documentation pages and variants/state/interaction stories.
- [x] Run coverage, browser accessibility/interactions, responsive/themes and full repo gate.
- [x] Record remaining token findings; stop before batch 2.

Parallel documentation runs use /tmp/mentio-s2-actions and /tmp/mentio-s2-fields; root owns component sources/tokens/tests/config integration. No dependencies or unplanned variants added. FormField is presentation-only; CrudForm schema/mutation extensions remain for their planned pattern work.

Outcome: done — batch 1 only. Six documented components and 52 new stories. 118 combined light/dark browser story tests; 84 built-page checks; 28 MDX axe audits without findings; true hover/focus and frozen sample equality checked with real Playwright input. Unit 222 tests/100%, lint/typecheck/build/integration10/audit passed. Token findings reduced 13→7 in unadapted later-batch files. Full report and machine browser/state evidence live under packages/ui/storybook/verification/2026-10-31-stage-2-batch-1.md.

Resolved: screen-reader names omit aria-hidden requirement markers, while getByLabelText does not; use role/name assertions for those semantics. Synthetic userEvent.hover does not establish CSS :hover; actual pointer validation uses Playwright. Removed redundant Controls MDX tables which overflowed mobile; Playground controls remain in Storybook's panel and API tables are documented. Canvas source actions needed explicit semantic colors in dark mode. Lessons appended. No app source, new dependencies, push or batch-2 work.

## Local commit authorized

The user requested “czas na commit” after reviewing the completed batch. Reviewed the full local scope and existing validation evidence; source code has not changed since those checks. Commit the batch, its documentation, configuration and reports locally. No push and no batch-2 work.

## Needs from you

None for batch 1. Say “dalej” to start batch 2.
