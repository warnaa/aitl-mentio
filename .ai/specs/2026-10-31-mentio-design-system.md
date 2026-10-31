# Mentio design system and Storybook

Date: 2026-10-31. Status: approved plan, staged implementation underway.

Authority: user approved all five decisions in packages/ui/POSTEP.md and authorized stage 1. Detailed scope, sources, component/screen mapping, dependency allowlist, menu and estimates live in that file and lekcja-06/storybook-mentio.md. Approved appearance and token values: lekcja-06/referencje.md and tokeny.md. Later stages require explicit “dalej”; stage 2 additionally stops after each batch.

## Decisions

English documentation and story UI; current app language and business APIs unchanged. Existing @mentio/ui package, shadcn/Radix, npm, Tailwind 4, system fonts, light/dark themes retained. Approved UI compositions may precede feature implementation. Width 1152px, prose 65ch, typography/control/radius roles per approved Q2/Q3. Reply rendering uses inline source quotes. Switch/Avatar/Tabs/Toast and unspecified E03–E05 contracts remain documented gaps. No deployment, push, publication or new business implementation.

## Implementation stages

0. Inventory and approved plan (complete).
1. Install pinned Storybook 10.6.5 React/Vite and approved addons. Recalculate contrasts before writing warm neutral/error tokens into existing theme. Add raw/semantic/compatibility aliases, semantic type/spacing/layout/motion roles with source comments. Add seven Foundations pages using computed CSS variables, MDX JSX tables, root theme switch and browser interaction/a11y tests in both themes. Add token checker that reports existing violations without suppressing them. Existing primitive fixes belong to stage 2.
2. Batch 1 completed 2026-10-31 (Button, Link, Input, Textarea, Label, FormField); batch 2 completed 2026-10-31 (Select, Checkbox, RadioGroup, Card, Badge, Separator); batch 3 completed 2026-10-31 (Alert, Dialog, AlertDialog, DropdownMenu, Popover, Tooltip); batch 4 completed 2026-10-31 (Table, Skeleton, LoadingMessage, EmptyState, ErrorMessage). Stage 2 complete; Switch/Avatar/Tabs/Toast deferred per Q4. Adapt/document existing and approved new primitives in approved batches, preserving APIs/variants.
3. Build reusable product presentations/patterns and screen state maps; do not fabricate unspecified behavior. Split by user decision into 3a (shared components + generic patterns — completed 2026-10-31), 3b accounts + E01, 3c E02, 3d E03–E05 preliminary; stop after each.
4. Add usage guides, all epic pages and agent documentation/reference.
5. Run complete audits and report evidence; prepare independent-session agent test.

## Validation

Storybook build, lint, typecheck, unit coverage, app production build, integration and audit gate. Browser verify built Foundations pages at 320/768/1440, both themes, keyboard, root/portal inheritance and reduced motion. All story a11y violations fail browser tests. Token checker must report violations honestly: existing legacy component violations are expected until stage 2; no blanket baseline. Never imply all stages done because stage 1 passes.

## Done means

- [x] Stage 1: seven working Foundations pages; approved tokens have measured contrast and source comments; themes work at document root, including portals.
- [x] Stage 1: story build and browser tests in both themes, lint/types/coverage/app build/integration/audit results recorded; checker catches bad fixtures and reports existing violations.
- [x] Stage 2: each approved component has 13 documentation sections, variants and state matrix, interaction/a11y evidence (23 pages; token checker at zero; deferred Q4 components listed for What is missing).
- [ ] Stage 3: patterns cover API/data states; specified key screens have stories and state maps; unresolved contracts appear in What is missing.
- [ ] Stage 4: guides/epics/component catalog/agent reference complete and linked.
- [ ] Stage 5: full gate and responsive/theme/keyboard/overlay checks documented; counts and prepared independent-session test recorded.
- [ ] Separate-session agent test performed by the user and its documentation gaps resolved or tracked.
- [ ] Fully implemented spec moved to implemented only after all applicable criteria are met.
