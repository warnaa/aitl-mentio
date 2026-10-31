# Mentio design system — stage 3a: shared panel components and generic patterns

Date: 2026-10-31. Spec: .ai/specs/2026-10-31-mentio-design-system.md.
Requested: “commit i dalej” after stage 2 (batch 4 committed as fd1f4fa, no push). Stage 3 is split into 3a–3d with a stop after each (user decision). Rules of lekcja-06/storybook-mentio.md remain in force.

## Stage-3 decisions (user, 2026-10-31)

1. Public-page presentation components may live in `@mentio/ui/components/mentors`: plain Tailwind on tokens, no Radix/shadcn, no client JS. Requires an AGENTS.md rule change and a note in the E01 spec — applied in 3b together with those components.
2. Product components carry no copy of their own and no date/money formatting: all text and formatted values arrive through props. Stories pass English; the app passes Polish (F1). Concept label maps (e.g. F6 booking-status) are built by feature PRs.
3. Build behavior except the F3 hooks: CrudForm extensions (blur + submit validation, first-error focus, preserved input, duplicate guard, field kinds select/checkbox/money/datetime/urlList, externalFieldErrors, onDirtyChange), ActionButton with an internal duplicate guard and confirmation, StatusBadge, PanelShell. useApiQuery/useApiMutation stay with feature PRs; /admin is not migrated to PanelShell in this task.
4. Stage 3 parts with stops: 3a shared components + generic patterns; 3b accounts + E01; 3c E02; 3d E03–E05 as preliminary proposals.

## 3a plan

- [x] Read CrudForm/DataTable tests, admin layout, MSW setup; derive PanelShell from the admin layout.
- [x] CrudForm: field kinds, blur/submit validation, first-error focus (client and server), external errors, dirty tracking, five API outcomes; 100% unit coverage; existing tests unchanged.
- [x] ActionButton (backend/actions), StatusBadge (backend/feedback), PanelShell (backend/layout + package export); unit tests 100%.
- [x] 13-section pages: CrudForm, DataTable, ActionButton, StatusBadge, PanelShell.
- [x] Patterns: Form (MSW: success, pending, field error, server error, network error), List with filters (count, removable active filters, no-results vs empty), Detail (key info and main action above the fold, not found / no access), Delete confirmation (object named, verb button, easy cancel).
- [x] Token checker, story tests both themes, built-page/axe checks, real-state checks, full gate; report; POSTEP; stop.

## Outcome

Done — 3a only. See packages/ui/storybook/verification/2026-10-31-stage-3a.md.

Evidence:
- 552 story tests (2 clean runs).
- 240 page checks and 80 axe audits.
- 3a browser checks.
- 265 unit tests at 100% coverage; lint, types, build, integration and audit pass.
- check:tokens: zero findings.

Fixed during verification:
- Focus return after ActionButton's confirmation.
- Messages for empty required fields.
- The network error message (F1).
- ActionButton long-label wrap.
- The PanelShell breakpoint aligned with Q3.
- CrudForm effects.
- The filter's option source.

Files:
- ui src: backend/forms/CrudForm.tsx (+ kinds test), backend/actions/ActionButton.tsx (+ test, index), backend/feedback/StatusBadge.tsx (+ test, index), backend/layout/* (new), backend/api/apiCall.ts (+ test, index), styles/globals.css.
- packages/ui/package.json (backend/layout export) and vitest.config.mts (barrel pattern).
- Storybook: 5 component stories and MDX, 4 pattern stories and MDX, fixtures, verification.
- POSTEP.md and .ai/lessons.md.

The throwaway Postgres and static servers were stopped by PID.

## Needs from you

None. The user approved the 1024 px sidebar breakpoint and asked for “commit i dalej”. 3a is committed locally on main (no push); 3b continues in its own run log.
