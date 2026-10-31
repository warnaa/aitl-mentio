# Mentio design system — progress and stage 0 plan

Date: 2026-10-31. Status: **stage 3b in progress (accounts and E01).**
Documentation and story UI: English, as explicitly requested in `lekcja-06/storybook-mentio.md`. This file is the only output of stage 0. No dependencies, styles, components, application code or remote resources were changed.

## Stage checklist

- [x] 0 — inventory existing UI, materials, dependencies and screen requirements; propose a plan.
- [x] 1 — foundations, Storybook setup, token checks, accessibility test setup.
- [x] 2 — primitives, batches of approximately six; stop after each batch.
- [ ] 3 — product components, patterns and screen compositions.
- [ ] 4 — usage documentation and agent reference.
- [ ] 5 — build, lint, types, token audit, accessibility, responsive/theme/keyboard checks; prepare a separate-session agent test.

The instruction to write **only POSTEP.md in stage 0** takes precedence over creating separate spec/run/lesson files now. This file records the stage's work and outcome. Before implementation, turn the approved plan into a dated `.ai/specs/YYYY-MM-DD-mentio-design-system.md` with Done means and create the dated run log, subject to the agreed documentation exception to the directory scope. No implementation is authorized by this inventory alone.

## Sources and authority

- Task: `lekcja-06/storybook-mentio.md`; visual direction: `lekcja-06/referencje.md`; approved values: `lekcja-06/tokeny.md`.
- Product authority: `.ai/specs/product-brief.md`, `.ai/specs/backlog.md`, `research/decisions/D01–D23` and `N01/N02`.
- Feature designs: `2026-10-30-accounts-and-sign-in.md` (accounts), `2026-10-29-mentor-pages-and-discovery.md` (E01), `2026-10-29-book-and-pay.md` (E02), `2026-10-29-platform-primitives.md` (F1–F8, B1–B13), all under `.ai/specs/` and not implemented.
- Engineering baseline: `AGENTS.md`, `.ai/lessons.md`, `.ai/specs/implemented/`; package manifests, exports, ESLint, Vitest configuration, existing UI sources and routes. Local Next 16.4 CSS guide: `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`.
- Research: seven interviews, discovery board exports, five dated benchmark notes, Discord survey/export and mentor-list material in `.ai/specs/research/`. These justify user needs, not exact visual values. Board ideas about subscriptions, reviews, video and a vault are superseded by current decisions. The synthetic walkthrough/personas concern an older demo brief; they are not evidence for this build.
- Archived booking specification is historical, not current authority. E03–E05 have backlog requirements and brief rules, but no dedicated screen specifications. E06 is parked. No audit report or visual reference screenshots were supplied; GitHub/Slack reference descriptions are not observations from a live visual audit.

### Decisions in exactly ten lines

1. Character: readable, warm, focused; anti-character: generic, flashy, distracting (references, introduction).
2. Dense mentor/session lists with readable hierarchy and thin row separators (R01.1, R01.3).
3. Code and filenames use monospace; ordinary prose retains the existing system sans stack (R01.2; approved tokens).
4. Warm neutral, flat backgrounds and opaque surfaces; no new brand hue (R01.4, A01.1–A01.2; approved tokens).
5. The main action has a filled button; secondary actions have less visual weight (R01.5).
6. Conversation dominates the session; task-related secondary navigation remains separate (R02.1, R02.6).
7. Replies retain a connection to a specific message; author and time stay visible (R02.2–R02.3).
8. Friendly second-person language; no decorative UI emoji or sparkles; user-authored emoji remain content (U01.1, R02.5, A01.3).
9. Feedback stays near the changed element; minimal 150 ms color/border transitions, without duplicate pop-ups (R02.4, U02.1; approved tokens).
10. No course modules, learning completion, certificates or mentor ratings; public work is the trust signal. Conflicts resolved as dense lists / spacious conversation, warm neutrals / readable hierarchy, filled primary action / quieter secondary actions, local feedback / minimal movement (A02.1–A03.3; conflict table; N02).

### Already approved versus proposed here

Approved before this stage: references and token table, both themes, existing semantic shadcn names, system fonts, current radii/shadows/type sizes retained, contrast repairs including full ring with an offset and neutral input surfaces. Their values are not implemented yet.

Proposed in this file: dependency list, directory structure, component inventory, story estimates, additional role tokens and five decisions below. They are not approved merely because they appear here.

The task explicitly requests English UI and documentation. This overrides earlier Polish requirements **for this design-system deliverable**; the application, its URLs, API messages and product specs are not translated in this task. PLN, 25/50 minutes, mock payments and Europe/Warsaw remain product rules. English stories must not be advertised as literal snapshots of the existing Polish feature specs. A global application-language change would require separate scope.

## Repository inventory

| Area | Observed state | Plan implication |
| --- | --- | --- |
| Package manager | npm workspaces, root `package-lock.json` | npm only; no new workspace |
| App | Next 16.4.2, React/React DOM 19.3.1, App Router/Turbopack | UI package can use a React/Vite Storybook without importing Next pages |
| Styling | Tailwind 4.3.3, shared CSS in `src/styles/globals.css`, `tw-animate-css` | Reuse that entry point and scan UI/stories; no second competing theme |
| TypeScript / tests | TS 5.9.3, Vitest 5.0.5; global 100% unit thresholds | Separate browser story project; preserve unit/integration projects and thresholds |
| Base | shadcn `new-york`, Radix `radix-ui` 1.8.1; Lucide 1.61.0; `cn`, CVA | Keep the supplied base and icon library |
| Existing primitives (8) | Button, Input, Textarea, Label, Card, Badge, Separator, Table | Real exports, including subcomponents and every existing variant/size, get documentation |
| Existing patterns (5) | CrudForm, DataTable, LoadingMessage, ErrorMessage, EmptyState | Reuse and extend with tests; no parallel replacement implementations |
| API | `apiCall` / `apiCallOrThrow`, envelope, CSRF header | API examples use these; MSW intercepts requests, no story-owned fetch helper |
| Existing themes | Light/dark neutral OKLCH, radius 0.625rem, chart/sidebar roles | Preserve themes and names; approved warm values replace only covered roles |
| Existing app | Marketing home, admin overview/users, health/users API | Existing behavior remains; no feature implementation in app |
| Storybook / progress | No configuration, stories or prior POSTEP found | Start from existing package, not generated demo components |

Observed gaps: `ring/50`, arbitrary focus widths and table offsets, `text-white` on destructive variants, translucent dark inputs, generic `transition-all`; the task's token checker would flag several. `CrudForm` currently validates on submit and does not implement blur validation or first-error focus. Do not document these future requirements as working behavior. There has been no browser/accessibility audit in stage 0.

## Technical plan — proposed dependency allowlist

Use **Storybook 10.6.5** with `@storybook/react-vite` 10.6.5. npm registry checked 2026-10-31: addon-vitest 10.6.5 declares Vitest/browser support `^4 || ^5`; react-vite supports React 19 and Vite 5–8. This is a metadata check, not an installation/build verification. Pin all Storybook packages to the same version. Recheck before installing; do not silently choose a new major.

React/Vite is intentional: `@mentio/ui` is standalone and cannot import app/core/db. Screen stories compose exported presentational components with data/callback props; they do not import Next route files or execute services. No `@storybook/nextjs-vite` dependency is needed for this package. If actual Next APIs become necessary, return to the plan.

| Dependency | Purpose |
| --- | --- |
| `storybook`, `@storybook/react-vite` | Manager, renderer and Vite builder |
| `@storybook/addon-docs` | MDX, API documentation, Controls and source examples |
| `@storybook/addon-a11y` | Axe checks, `a11y: { test: 'error' }` |
| `@storybook/addon-vitest` | Run stories and play functions as browser tests |
| `@storybook/addon-themes` | Theme toolbar; apply `.dark` on preview document `html`, including portals |
| `vite`, `@tailwindcss/vite` | Storybook-only build and Tailwind 4 processing |
| `@vitest/browser`, `@vitest/browser-playwright`, `playwright` | Browser runner matched to installed Vitest 5.0.5; Chromium |
| `msw` (v2), `msw-storybook-addon` | Success, delayed, field/server error and offline API scenarios |

These are development dependencies in UI; tool versions not specified above are resolved and checked for peer compatibility at stage 1. Use JSX tables in MDX: no `remark-gfm` dependency. Play utilities come from `storybook/test`; viewport/controls are built in. No Chromatic, visual cloud service, addon-essentials, new icon/font/i18n library, or production data dependency. Any CLI-added dependency outside this list/existing manifest must be reviewed and removed before proceeding.

Proposed paths under `packages/ui/`:

```text
.storybook/{main.ts,preview.ts,manager.ts,preview.css,vitest.setup.ts}
.storybook/public/mockServiceWorker.js
storybook/{design-system,foundations,primitives,product,patterns}/
storybook/fixtures/                # deterministic fictional data, not exports
src/styles/globals.css            # existing Tailwind entry and sole literal token source
src/components/ui/                # generated primitives, then adapted
src/components/<concept>/         # approved reusable domain presentations
src/backend/{forms,tables,feedback,actions,layout}/
scripts/                          # token validation and two-theme test orchestration
vitest.storybook.config.ts
POSTEP.md
```

Do not place story fixtures inside `src`, where the global coverage include would treat them as production code. MDX uses `Unstyled` around previews and actual package components. Theme tests must run every story once per theme, with matching toolbar globals and root class, not merely test that the toolbar changes. Set reduced-motion behavior and exercise keyboard/overlay focus in play tests. The manager displays Mentio, with onboarding and update notifications disabled through supported Storybook options; provenance goes into a technical note.

Planned root scripts forwarding to UI: `storybook` (port 6006), `build-storybook`, `test:storybook` (both themes), `check:tokens`. Existing lint/typecheck must cover Storybook/config/scripts; built output is ignored. A separate browser config preserves the current unit coverage gate. New/changed handwritten production files need 100% unit coverage and meaningful behavior tests; stories complement those tests. Do not expand vendor exclusions to cover custom business components.

The checker covers UI components, story styling and documentation samples; CSS literals are permitted only in the agreed token source. It detects palette utilities, literal colors and arbitrary values, while distinguishing arbitrary selectors from arbitrary values. Structural utilities such as flex/grid remain valid. Existing spacing/type/radius/shadow values are exposed through tokens; new relational tokens come from the approved table. New hover/focus/disabled roles reuse existing approved appearances where possible; do not invent unchecked colors. A checker exception is never a substitute for a missing token.

## Component and screen map — proposed, not an implementation claim

Sources: **A** = accounts spec UI/UX; **M** = mentor-pages spec UI/UX; **B** = book-and-pay UI/UX; **F** = platform F1–F8; **T** = this task's minimum documentation/primitive requirements. E03–E05 mappings are explicitly preliminary. Each listed primitive has a documentation page with the task's 13 sections; non-applicable sections explain why.

### Primitives and shared feedback

| Component | Screen that needs it / source | Status |
| --- | --- | --- |
| Button, text action, Link | Sign-in, mentor editor publish, payment, navigation (A/M/B, R01.5) | Button exists; semantic Link proposed; actions reuse Button |
| Input, Textarea | Sign-in/register, rate, question, description (A/M/B) | Exist |
| Label, FormField | All auth/editor/booking forms; hint/error/required/optional linkage (A/M/B, T) | Label exists; shared field anatomy proposed |
| Select | Booking duration with prices (B, F4) | Add via CLI |
| Checkbox | Mentor listing opt-in (M, F4) | Add via CLI |
| RadioGroup | Choice documentation and alternative duration presentation (T) | Proposed for required minimum; booking spec still uses Select |
| Card/panel | Editor sections, booking summary, existing admin (M/B) | Exists |
| Badge | Booking/payment/publication status (B, F6) | Exists; status is also text |
| Alert | Slot conflict, payment simulation, pending/refund failures (B) | Add via CLI |
| Dialog | Optional editing/overlay guidance; existing booking edit remains inline (T) | Proposed for required minimum, no new modal flow implied |
| AlertDialog | Remove a slot, abandon/cancel booking (M/B, F5) | Add via CLI |
| DropdownMenu, Popover, Tooltip | Contextual action/overlay guidance (T) | Proposed minimum; no essential action hidden behind a tooltip |
| Skeleton | First-load list/detail shapes (T, M/B loading states) | Add via CLI |
| Separator, Table | Availability, bookings, admin/users and earnings rows (M/B, E05-S01) | Exist |
| LoadingMessage, ErrorMessage, EmptyState | Lists, details, retry and initial load (existing shared layer, T) | Exist; all documented |
| Switch, Avatar, Tabs | No specified screen currently requires them | Deferred to What is missing; do not fabricate profile photos/preferences/tabs |
| Toast | Local feedback already covers saves/actions (R02.4) | Not planned; no approved unique use case |
| Combobox, Sheet, date-picker/calendar | No approved search/sidebar overlay/calendar flow | Decision guides explain alternatives; no dependency or component added |

Proposed batches: (1) Button/Link/Input/Textarea/Label/FormField; (2) Select/Checkbox/RadioGroup/Card/Badge/Separator; (3) Alert/Dialog/AlertDialog/DropdownMenu/Popover/Tooltip; (4) Table/Skeleton/LoadingMessage/EmptyState/ErrorMessage. Stops after every batch. Existing Button and Badge variants and Button sizes remain in the catalog; document appropriate uses rather than deleting unused options. Deferred minimum components require a user decision before stage 2 can be considered complete against the original minimum.

### Generic patterns and product compositions

| Name / designated home | Required screen / source | Scope |
| --- | --- | --- |
| CrudForm / `backend/forms` | Sign-in, registration, editor, rate, availability, booking (A/M/B, F4) | Existing; blur validation, first-error focus, preserved input, duplicate guard and five API outcomes need implementation/tests |
| DataTable / `backend/tables` | Admin users, owner slots, booking list, earnings (M/B/E05, F3) | Existing; pagination and loading/error/empty states |
| ActionButton / `backend/actions` | Publish/unpublish, remove slot, cancel booking (F5, M/B) | Proposed early DS consumer; see Q1 |
| StatusBadge / `backend/feedback` | Booking details/list and settlement outcomes (F6/B) | Proposed; tone must not imply a new colored palette |
| PanelShell / `backend/layout` | Mentor editor/slots and mentee bookings (F8) | Proposed in UI only; app admin layout is not migrated here |
| AuthForm compositions / `components/auth` | `/logowanie`, `/rejestracja`, mentor registration, `/zostan-mentorem` (A) | Presentation and callbacks, no auth service |
| MentorSummary, PublicWorkList, SessionPriceSummary / `components/mentors` | `/mentorzy`, `/mentorzy/[slug]`, mentor editor preview (M) | Public work and prices; no ratings or fake reputation claims |
| MentorPageEditor / `components/mentors` | `/mentor/strona`, including dirty/publish/rate/listing states (M) | Composition of real shared forms/actions |
| AvailabilityList, AvailabilityEditor / `components/availability` | `/mentor/terminy`, mentor details (M) | Visible vs bookable vs unavailable; native datetime input, no invented calendar |
| BookingSummary, BookingStatus, PaymentStatus / `components/bookings` | `/rezerwacje`, new booking, payment, booking details (B) | Separate lifecycle from charge/refund outcomes |
| BookingForm, PaymentPanel, CancellationSummary / `components/bookings` | New booking, inline edit, pay and cancellation (B) | Explicit price changes, hold deadline, expected cancellation result |
| MentorDecision / `components/bookings` | Mentor paid-question list/detail, accept/decline (E03-S01, R12) | Preliminary; dedicated E03 UI contract missing |
| Message, MessageComposer, SessionHeader / `components/messages` | Text session for mentor and mentee, transcript (E04-S01, R01/R02/R10, R02.1–R02.3) | Preliminary; reply rendering, transport and ending behavior missing |
| SettlementNotice / `components/bookings` | No-show/declined/ended booking next visit (E04-S02, R09/R10/R22) | Preliminary beyond E02; no timer promises |
| EarningRow, EarningsSummary / `components/payments` | Mentor earnings per session (E05-S01, R06, D13) | Preliminary; mock ledger, not real payout UI |

Names/grouping in this table are proposals, not additional business models. Keep one designated home; group product stories by epic even when components share a concept folder. Add explicit product export subpaths without redirecting the existing `./components/*` primitive export. Do not import DTOs/schemas from core into UI: use structural props and local story schemas, with contract-alignment tests where needed. Every exported composition must be a reusable package component, never a story-only screen clone.

Patterns to document: form with API states (A/M/B); paginated list with filters (T); detail/not-found-or-no-access (M/B/F2); delete confirmation (M slot removal); publication with dirty draft and copy link (M); availability visibility/eligibility (M); booking → payment → recovery (B); outcome-specific cancellation (B); mentor accept/decline (E03); conversation/reply/transcript (E04); next-visit settlement (E04); per-session earnings (E05). Filters are a task-requested generic pattern: current mentor discovery specifies pagination, not product search filters. Do not add filtering to app or invent an API endpoint. Copy-link feedback stays local; no toast.

### Screen state coverage

| Screen stories | States beyond normal content | Source |
| --- | --- | --- |
| Sign-in, registration, become mentor (3 screens) | Invalid credentials, email conflict/lost response, 429 wait, network/server error, pending, session expiry | A / D18/D22/D23 |
| Mentor discovery and public detail (2) | Empty, no rate, no eligible slots, unlisted direct link, draft/missing, error, long work URLs | M / D02/N02 |
| Mentor editor and slots (2) | Incomplete saved draft, dirty input, publish errors, duplicate slug, price bounds, conflicting/DST slot, outside window | M / F4 |
| New booking, payment, details and list (4) | Disabled booking, already unpaid, slot taken, changed price/revision, hold expired, pending/failed charge, abandonment, pending/failed/succeeded refund, late cancellation | B / R14/R17/R21/R22 |
| Mentor decisions (list/detail, 2 proposed) | No pending questions, accept/decline, expired acceptance, refund pending/failure | E03-S01 / R09/R12; specification gap |
| Session room and transcript (2 proposed) | Not started, active, ended/read-only, no messages, failed send, long code, linked reply, no-show | E04-S01/S02; unspecified details remain proposals |
| Mentor earnings (1 proposed) | Empty, settled session, commission, late-cancel earnings, failure/loading | E05-S01 / R06; specification gap |
| Existing admin overview/users (2) | Loading, pagination, empty, failure, no access | Existing app; view compositions only, no app imports |

All data-dependent product components need loading, empty, error, partial data, high volume and long content as applicable; explain impossible states rather than inventing invalid DTOs. Verify at 320/768/1440, light/dark, keyboard and reduced motion. Missing E03–E05 contracts block final claims of backlog-wide coverage, not foundation work. E06 gets a parked documentation page, zero fabricated screens or stories. Invitation/dispute operator screens are mentioned in task context but not specified in the current backlog; list them as missing, not implemented. No change-password, verification-email or invitation-access gate is added (D22/D23).

## Storybook menu and estimates

```text
Design system
  Start here
  Components
  How to choose
  Usage and accessibility
  Content
  What to avoid
  What is missing
  Contributing
  E01 — Mentor page and discovery        # includes accounts prerequisite
  E02 — Book and pay
  E03 — Mentor decides
  E04 — The text session
  E05 — Mentor earnings
  E06 — Later (parked)
Foundations
  Color
  Typography
  Spacing and layout
  Shape and depth
  Motion
  Icons
  Themes
Primitives
  [one entry per approved primitive/shared feedback component]
Product
  Platform and accounts                  # includes existing admin patterns
  E01 — Mentor page and discovery
  E02 — Book and pay
  E03 — Mentor decides
  E04 — The text session
  E05 — Mentor earnings
Patterns
  Form
  List with filters
  Detail
  Delete confirmation
  Publication
  Availability
  Booking and payment recovery
  Cancellation
  Mentor decision
  Conversation and reply
  Next-visit settlement
  Earnings
```

Estimate, not observed counts: 21 top-level documentation/foundation pages (8 guides + 6 epics + 7 foundations), plus one 13-section page per component and one per pattern. Approximately **330–460 executable stories**: 150–200 primitives/shared feedback (including every existing variant/size), 70–100 product, 60–90 patterns, 50–70 screen states. Screen stories are under Product rather than another menu branch. Widths/themes are test dimensions, not duplicated story counts. Roughly 45–65 play tests covering meaningful interactions, all stories included in accessibility testing in both themes. E03–E05 portions remain conditional on contracts. Exact counts are reported only in stage 5.

## Preserve, change, remove — for the user's decision

| Action | Item | Reason / source |
| --- | --- | --- |
| Preserve | Existing package, exports, 8 primitives, five shared patterns, public APIs and tests | No replacement permission; reuse the actual library (task 5/12) |
| Preserve | Light/dark themes, semantic names, chart tokens, radius/shadow/type scales, system fonts | Approved token document explicitly retains these |
| Preserve | Radix behavior, Lucide, `cn`, CVA, existing dependency boundaries and API envelope | Fixed architecture; no second rendering/data stack |
| Change | Covered neutral/error/sidebar role values into approved raw → semantic → component aliases in existing CSS | Token table; contrast repairs, retaining both themes |
| Change | Component classes for full focus ring/offset, opaque input background, destructive foreground, semantic spacing and value tokens | Approved contrast corrections; token-only task rule |
| Change | CrudForm and shared feedback behavior where requirements are currently absent | Task form/accessibility states; regression tests required |
| Add | Proposed Storybook dev tools, docs, exports/compositions and approved CLI primitives | Makes the approved screen patterns usable and testable |
| Remove | Nothing from the existing system: no component, variant, theme, palette or page | Task 12; generated demo/onboarding content is not introduced |

Global CSS changes propagate into the app automatically even without editing app files. Therefore they require theme regression checks of existing admin/home pages and the full repository gate during implementation. Preserve unsupported chart values without claiming contrast coverage; add no charts to the plan.

## Five stage-0 decisions (all explicitly approved 2026-10-31)

1. **Build timing and scope:** approve UI-only presentational components/CrudForm extensions in this DS task ahead of their feature PRs, superseding platform's first-consumer timing for these UI pieces? Proposed: yes for the approved inventory, with no hooks/business endpoints/ORM/auth implementation and no application migration. Also allow required spec/run/lesson docs and stage 4's `docs/design-system.md` + AGENTS link outside UI. Otherwise narrow this run to existing components and record future components as missing.
2. **Density and typography roles:** retain current 36 px default controls, 24/32/40 px optional Button sizes, 6/8/10/14 px radii (`sm/md/lg/xl`), 1 px separators, and current shadow scale? Proposed role mapping: page 24/32 px semibold, section 20/28 semibold, body 16/24 regular, label 14/20 medium, metadata 12/16 regular, numbers tabular 14/20, code 14/20 monospace; all from the existing Tailwind scale, prose max 65ch. These role assignments are new proposals, not implied by R01.2. Keep current fonts; no font downloads/CDN.
3. **Responsive layout:** proposed maximum content width 1152 px; conversation prose 65ch; at 320 px one column and secondary session information after conversation; at 768 px one content column with compact navigation; at 1440 px separate task navigation plus conversation. Approve these values/relationships before writing new layout tokens? References do not specify widths or breakpoints beyond the task's test widths.
4. **Unspecified/deferred components:** approve deferring Switch/Avatar/Tabs/Toast and the exact E03–E05 screen contracts to What is missing until a consumer/spec exists? This makes original minimum/backlog completion conditional. Alternatively provide/authorize separate feature design decisions before stage 3; do not mark a partial catalog complete. RadioGroup/Dialog/menu/popover/tooltip are proposed only because the task requests the minimum, not because a feature spec needs a new flow.
5. **Reply interaction:** for R02.2, approve a proposed inline quoted-source reply (author + short excerpt + accessible “Go to message” link, cancel reply before send), with no nested side panel? The exact interaction, message transport, code format and post-session behavior still need E04's contract; this proposal does not define backend behavior or claim it exists.

## Verification and stage outcome

Checked: clean tracked baseline with pre-existing untracked lesson materials/run files; package manager/installed versions and manifests; eight real primitive sources and five shared UI patterns; themes, exports, lint boundaries, test/coverage configuration; existing routes; visual reference/token decisions; current backlog/spec coverage and authority conflicts; Storybook npm version/peer metadata. Local Next CSS guidance confirms shared global Tailwind entry and the need to inspect production CSS ordering.

External technical references: [Storybook installation](https://storybook.js.org/docs/get-started/install), [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon), [MSW integration](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-network-requests). Registry metadata was read with `npm view`; nothing was installed. Revalidate actual compatibility in stage 1.

Not checked: Storybook build, unit/lint/types/build/integration/audit gate, rendered contrast, accessibility, responsive layout or portals. No executable code changed; running the application validation gate is not stage 0 evidence. Contrast numbers in `tokeny.md` are prior calculations, not a fresh rendered audit.

Outcome: **stage 0 done; implementation pending**. Next: receive the five decisions/plan approval and explicit “dalej”, then execute stage 1 only. Stop again at its completion. No commit, push, publication or remote messaging.

## Needs from you

Stage 0 is approved. No unresolved input for completed stages. Say “dalej” to authorize stage 2, batch 1; no keys or screenshots are needed.

## Stage 1 approval — 2026-10-31

The user answered yes to Q1–Q5 and said “dalej”. All five proposals are accepted, including UI-first timing, typography/density, responsive widths, deferred components/contracts and inline quoted replies. Stage 1 is authorized; stage 2 remains gated. English applies to this deliverable; application business behavior stays outside scope.

## Stage 1 completion — 2026-10-31

Implemented approved tokens in existing CSS, both themes, seven Foundations pages, one stage/provenance page, seven stories, docs/a11y/theme/Vitest/MSW configuration and the token checker. Documentation-only helpers have no package exports. Storybook packages are pinned at 10.6.5; Vite 8.3.5, Playwright 1.64.1, MSW 2.15.0/addon 2.0.7 are within the approved dependency list. No new primitives or application feature implementation.

Verified: build-storybook; 14 story tests in both themes; negative a11y control; 48 built-page viewport/theme checks; zero axe violations in stories and 16 MDX audits; actual toolbar theme change and portal; lint/types; 212 unit tests at 100%; app build; 10 integration tests; production audit; existing app/dev browser regression. Details and exact remaining findings: `storybook/verification/2026-10-31-stage-1.md`.

The token checker correctly fails on **13 existing violations** in Badge/Button/Card/Input/Table/Textarea, all scheduled for stage 2. New documentation/preview styling has no findings. No baseline or exception hides the old findings. Component focus/destructive classes are not yet certified: changing the token palette is not completion of component adaptation. Unrelated existing lint warning and stale audit allowlist notice remain informational.

Resolved implementation findings: complete JSX table blocks are required by MDX; prebundle Zod/core-events for stable Vite browser tests; standalone MDX requires root-theme synchronization in addition to story decorators; docs typography overrides must preserve Unstyled and explicitly theme table text. Lessons recorded.

Next: **stage 2, batch 1 only — Button, Link, Input, Textarea, Label, FormField**, including the approved density/shape/state differences and tests. Stop after that batch. No further decisions are needed for stage 1. No push/publication/commit performed.

## Stage 2 batch 1 started — 2026-10-31

The user authorized continuation, then requested a local checkpoint first. Stage 1 was committed as bbd79ce; no push. Batch 1 now covers Button, Link, Input, Textarea, Label and FormField only. Approved retained density/shape: default 36px, optional 24/32/40px buttons, 8px medium radius, 1px border, existing padding. Differences: full 3px ring with 2px offset; opaque neutral field surface; explicit destructive foreground; local color/border transitions 150ms, no transition-all. Sources: approved Q2, token contrast repairs, R01.5/U02.1.

## Stage 2 batch 1 completion — 2026-10-31

Completed Button, Link, Input, Textarea, Label and FormField. Six 13-section documentation pages, 52 new stories; cumulative 14 MDX pages and 59 stories. Native/public API and existing variants/sizes retained; no dependencies added. FormField remains presentation-only and does not replace CrudForm.

Verified: 118 story tests in both themes; 84 built-page width/theme checks; zero axe findings in 28 MDX audits; real pointer/native focus equals frozen previews; 222 unit tests with 100% coverage; lint/types; app build; 10 integration tests; audit. `check:tokens` now reports 7 findings in later-batch Badge/Card/Table, down from 13, without exceptions. Full report: `storybook/verification/2026-10-31-stage-2-batch-1.md`.

Stage 1 is committed as bbd79ce per the user's checkpoint request; the user subsequently requested a local batch-1 commit (“czas na commit”). That checkpoint includes the verified batch and its reports. No push. Next: wait for “dalej”, then batch 2 only: Select, Checkbox, RadioGroup, Card, Badge, Separator. No pending design questions for completed work.

## Stage 2 batch 2 started — 2026-10-31

New session; the user asked to continue from the next step (treated as “dalej” for batch 2 only). Select, Checkbox and RadioGroup were added with the shadcn CLI; package.json and package-lock.json were unchanged by it. Run log: `.ai/runs/2026-10-31-mentio-primitives-batch-2.md`.

Approved by the user in this session where materials were silent: Badge radius-sm 6 px instead of the base pill; Checkbox 16 px with radius-sm 6 px, 24 px target through its clickable label; Select trigger default 36 px only (generated `sm` removed); CardTitle uses the approved section role 20/28 semibold, which also changes existing /admin cards.

Derived from earlier approvals, not new decisions: Select trigger 36 px/8 px/1 px (Q2); full 3 px focus with 2 px offset and opaque control surfaces (contrast repairs); no zoom/slide overlay motion (U02.1); Separator uses `--divider-width` (R01.3); Card keeps its 14 px radius, existing shadow and 24 px padding (tokens: radii/shadows retained); destructive Badge uses the explicit destructive pair instead of translucent dark fill.

## Stage 2 batch 2 completion — 2026-10-31

Completed Select, Checkbox, RadioGroup, Card, Badge and Separator: six 13-section documentation pages and 52 new stories, for a cumulative 20 MDX pages and 111 stories. No dependencies were added. All existing variants are kept, except the generated Select `sm`, which was removed by decision. Full report: `storybook/verification/2026-10-31-stage-2-batch-2.md`.

Verified:
- 222 story tests in both themes, plus 15 consecutive clean full runs.
- 120 built-page width/theme checks with no errors, and zero axe findings in 40 MDX audits.
- Real hover and focus equal the frozen samples.
- The Select portal inherits the theme, has no entrance motion and stays in the viewport.
- 228 unit tests with 100% coverage; lint and types; app build; 10 integration tests; audit.
- /admin regression in both themes.

`check:tokens` now reports only the 2 Table findings scheduled for batch 4.

Fixed during verification: a Card header overflow at 320 px (container-query reflow plus a regression story), invalid `p > div` nesting in Separator stories, and a flaky Select keyboard test (a late resize from the Narrow story closed the list) with a stability wait. FormField + Select composition is documented as FormField around `SelectTrigger`.

### Proposals awaiting your decision (marked Proposal in the docs)

1. Card header action moves under the title when the header is narrower than 24rem (`--container-sm`). Without it, a 320 px card overflows (WCAG 1.4.10 is the reason; the threshold value is the proposal).
2. RadioGroup for 2–5 visible options, ordered by value.
3. Badge weight guidance (filled = positive end state, outline = waiting on someone, destructive = failure needing attention), and status text up to about 40 characters. The final mapping belongs to F6 StatusBadge.
4. Price and date formats in examples: whole PLN with the currency after the amount; “6 November 2026 at 18:00 (Warsaw time)”. To be settled on the Content page, stage 4.
5. Inline metadata separators never start a wrapped line.

### Finding for decision

Digits render with Noto Color Emoji on Linux systems that have none of the named fonts in Tailwind's default `--font-sans` (which you approved keeping) but do have Noto Color Emoji. The glyphs come out grey and offset. This predates this batch, and changing the font stack would revise an approved decision.

*Corrected 2026-10-31 after measurement:* the cause is not the “Noto Sans” entry. Removing it changes nothing. The cause is the emoji fonts at the end of the stack combined with a generic `sans-serif` fallback. Options were measured and presented to the user.

Next: wait for “dalej”, then batch 3 only: Alert, Dialog, AlertDialog, DropdownMenu, Popover, Tooltip.

The user then asked for a local commit and continuation (“commit aktualnych postępów i dalej”). Batch 2 is committed locally on main; no push. The five proposals and the font finding remain open; batch 3 does not depend on them.

## Stage 2 batch 3 started — 2026-10-31

Authorized by “commit aktualnych postępów i dalej”. Alert, Dialog, AlertDialog, DropdownMenu, Popover and Tooltip were added with the shadcn CLI. The overwrite of the adapted Button was declined, and the manifests are unchanged. Run log: `.ai/runs/2026-10-31-mentio-primitives-batch-3.md`.

Approved by the user where materials were silent:
- The modal scrim is a new `--overlay-scrim` token: warm neutral-950 at 50%.
- Dialog and AlertDialog titles use the body role, 16/24 semibold.
- AlertDialog has only the default size (generated `sm` removed).
- Tooltip keeps the inverted foreground/background pair with an arrow.

Derived, not new decisions:
- No entrance animations (U02.1).
- Opaque popovers (A01.2).
- Menu rows use the batch-2 menu tokens.
- The destructive menu highlight uses `--error-surface`.
- The dialog close control is a 32 px ghost icon Button (WCAG 2.5.8).
- Text is left-aligned at every width.
- AlertTitle wraps instead of being clamped.

## Stage 2 batch 3 completion — 2026-10-31

Completed Alert, Dialog, AlertDialog, DropdownMenu, Popover and Tooltip. That adds six 13-section pages and 42 stories, for a cumulative 26 MDX pages and 153 stories. No dependencies were added. Report: `storybook/verification/2026-10-31-stage-2-batch-3.md`.

Verified:
- 306 story tests in both themes, with 8 clean full runs.
- 156 built-page checks and 52 MDX axe audits with zero findings.
- Overlays opened from docs pages use the docs theme and stay in the viewport.
- Real menu hover equals the frozen samples.
- The tooltip is hoverable and dismissible.
- The dialog footer stacks below 640 px and is a row above.
- No long-content overflow.
- Batch-2 states show no regression.
- 234 unit tests with 100% coverage; lint and types; app build; 10 integration tests; audit.

`check:tokens` reports only the 2 Table findings scheduled for batch 4.

Fixed during verification:
- Popovers lacked an accessible name. `aria-labelledby` or `aria-label` is now a documented rule.
- Long menus overflowed at 320 px and are now capped to the available width.
- A nowrap popover trigger overflowed and now uses the long-label Button classes.

Open overlay states are separate stories rather than nested docs frames, because nested frames broadcast their own globals and reset the docs theme (rule 9).

### Proposals awaiting your decision (new in batch 3; batch 2's list above still applies)

6. No confirmation dialog for reversible actions such as unpublishing a page; the specs do not require one.
7. Mentor page and row actions are placed in a DropdownMenu, with about seven items as a practical maximum.
8. Dialog is documented as not needed by any current screen, with an illustrative “How a text session works” example. Popover is illustrated by the share link and booking-window explanations.

### Finding for decision

Radix closes a tooltip on scroll, including the scroll caused by keyboard focus on an off-screen trigger. This conflicts with the persistence rule of WCAG 1.4.13. Impact is limited because tooltips only repeat a name. Options: accept and document it, or wrap Tooltip to reopen after focus-scroll, which changes behavior.

Next: wait for “dalej”, then batch 4 only: Table, Skeleton, LoadingMessage, EmptyState, ErrorMessage. Batch 3 is not committed; no push.

## Decisions on batch-3 proposals — 2026-10-31

The user approved:
- 6: no confirmation for reversible actions.
- 7: page and row actions in a DropdownMenu, at most about seven items.
- 8: Dialog and Popover are not required by current screens; the examples stay illustrative.

The tooltip-scroll finding is accepted as is and documented as a known limitation on the Tooltip page. The corresponding “Proposal” marks in the docs are replaced with the decision. The batch-2 proposals 1–5 remain open; the font options are presented to the user for a decision.

## Font decision — 2026-10-31

The user chose to keep the approved Tailwind system font stack unchanged (option 1 of 4 measured options: keep; local emoji alias with unicode-range; system-ui before sans-serif; self-hosted font). Known effect, accepted: on Linux hosts with none of the named families but with Noto Color Emoji, digits render with the emoji font. No code change.

## Decisions on batch-2 proposals — 2026-10-31

The user approved proposals 1, 2, 3 and 5 as written. Proposal 4 is approved with one change: show the currency as “zł” after a whole amount (“240 zł”), not “PLN”. The currency itself stays PLN (D10); the date format “6 November 2026 at 18:00 (Warsaw time)” is approved for examples, with final wording on the Content page in stage 4.

Applied: every example amount in stories, docs and unit tests now reads “… zł”, including rate labels (“Rate per 25 minutes (zł)”). The “Proposal” marks for 1–5 are replaced with the decision and its date, including the Card container-query comment in the token file.

No open decisions remain for stages 0–2 so far. Next: “dalej” for batch 4 (Table, Skeleton, LoadingMessage, EmptyState, ErrorMessage), or a local commit of batch 3 first.

## Stage 2 batch 4 started — 2026-10-31

Batch 3 and the decisions were committed locally as dd10f0f; no push. A separate commit (16a8309) added a CI job that runs the story tests in both themes. Skeleton was added with the CLI and the manifests are unchanged. Run log: `.ai/runs/2026-10-31-mentio-primitives-batch-4.md`.

User decisions:
- The spinner stays; Skeleton is static, with no pulse.
- ErrorMessage keeps `--error-surface` with a full destructive border.
- EmptyState stays centred, as a recorded exception to “everything centred”.
- Table rows have no hover highlight.

Derived:
- The aria-expanded row tint is removed.
- The table footer uses full `--muted`.
- The checkbox cell offset becomes a token.
- Skeleton is `aria-hidden` by default.

## Stage 2 batch 4 completion — 2026-10-31

Completed Table, Skeleton, LoadingMessage, EmptyState and ErrorMessage. That adds five 13-section pages and 35 stories. Report: `storybook/verification/2026-10-31-stage-2-batch-4.md`.

Verified:
- **`check:tokens` passes with zero findings in the whole package.**
- 376 story tests, with 3 clean runs.
- 186 built-page checks and 62 MDX axe audits with zero findings.
- Real hover leaves table rows unchanged.
- The spinner runs without a motion preference and stops with reduced motion.
- Skeletons are static.
- No regressions in batches 2–3.
- /admin with a database (cards, users DataTable with a signed session) and without one (ErrorMessage), in both themes at 320 and 1440 px.
- 237 unit tests with 100% coverage; lint and types; app build; 10 integration tests; audit.

Open proposals, marked Proposal in the docs:
- Table: about four columns at most on mobile-first screens.
- Skeleton: shape heights h-4, h-5 and h-6.

## Stage 2 summary — 2026-10-31

23 primitive and shared-feedback documentation pages, each with all 13 sections:
- Batch 1: Button, Link, Input, Textarea, Label, FormField.
- Batch 2: Select, Checkbox, RadioGroup, Card, Badge, Separator.
- Batch 3: Alert, Dialog, AlertDialog, DropdownMenu, Popover, Tooltip.
- Batch 4: Table, Skeleton, LoadingMessage, EmptyState, ErrorMessage.

Totals:
- Storybook: 31 MDX pages, 188 stories and 44 play tests, all tested in both themes with axe set to fail.
- Unit tests: 237, with 100% coverage.
- Token checker: zero findings, down from 13 when stage 2 began.
- No dependencies were added after stage 1, and no existing component, variant, theme or page was removed. Two generated base sizes (Select `sm`, AlertDialog `sm`) were not adopted, by decision.

Against the task's minimum set, these are deferred by the approved Q4 and will go on the What is missing page (stage 4): Switch, Avatar, Tabs and Toast (no approved use case; R02.4 local feedback). Combobox, Sheet and the date picker remain decision-guide entries only.

Not yet done, by plan:
- Product components, patterns and screen state maps (stage 3).
- Teaching pages, epic pages and the agent reference (stage 4).
- The final audit (stage 5).

E03–E05 still lack dedicated screen contracts, so their stage-3 stories stay preliminary, as recorded in stage 0.

Next: wait for “dalej”, then stage 3 only. Batch 4 is not committed; no push.

## Decisions on batch-4 proposals — 2026-10-31

The user approved both remaining proposals: tables have about four columns at most on mobile-first screens, and skeleton shape heights are h-4 (line), h-5 (badge) and h-6 (title). The “Proposal” marks are replaced with the decision. No open decisions remain for stages 0–2. Next: “dalej” for stage 3, optionally after a local commit of batch 4.

## Stage 3 started — 2026-10-31

Batch 4 was committed as fd1f4fa; no push. Run log: `.ai/runs/2026-10-31-mentio-stage-3a-shared-patterns.md`.

User decisions for stage 3:
1. **Public presentation components** may live in `@mentio/ui/components/mentors`: plain Tailwind on tokens, with no Radix or shadcn and no client JS. The AGENTS.md rule and the E01 spec will get a note in 3b, together with those components.
2. **Copy through props:** product components have no copy or date/money formatting of their own. Stories pass English text; the app passes Polish (F1). Concept label maps are built by feature PRs.
3. **Behavior built now, except the F3 hooks:**
   - CrudForm extensions: blur and submit validation, focus on the first error, preserved input, duplicate guard, the F4 field kinds, external errors and dirty tracking.
   - ActionButton, with an internal guard and confirmation.
   - StatusBadge and PanelShell.

   `/admin` is not migrated.
4. **Stage 3 parts**, with a stop after each:
   - 3a: shared components and generic patterns.
   - 3b: accounts and E01.
   - 3c: E02.
   - 3d: E03–E05, as preliminary proposals.

## Stage 3a completion — 2026-10-31

What was built (report: `storybook/verification/2026-10-31-stage-3a.md`):
- **CrudForm (F4):** blur and submit validation, focus on the first error, a duplicate guard, Required/Optional markers, the five field kinds, external errors and dirty tracking.
- **ActionButton (F5)** with confirmation, and **StatusBadge (F6)**.
- **PanelShell (F8)** at `@mentio/ui/backend/layout`.
- **apiCall:** a fixed network-error message (F1).
- **Docs:** five component pages and four pattern pages (Form with five API outcomes via MSW, List with filters, Detail, Delete confirmation).
- **Totals:** 88 new stories; cumulative 276 stories, 40 MDX pages and 75 play functions.

Verified:
- `check:tokens` with zero findings.
- 552 story tests, 2 clean runs.
- 240 page checks and 80 axe audits, all clean.
- PanelShell layout at 320/768/1440 and the skip link on a real Tab.
- No overflow in any new story.
- 265 unit tests with 100% coverage; lint, types, app build, 10 integration tests, audit.

Fixed during verification:
- Lost focus after ActionButton's confirmation.
- Zod's technical text shown for empty required fields (the schema-message rule is now documented).
- The browser's network error text shown to users.
- A long ActionButton label overflowing (regression story proven to fail without the fix).
- The PanelShell breakpoint contradicting Q3.
- setState inside effects in CrudForm.

### Proposals for your decision (marked in docs)

None new. Every new rule cites a spec, WCAG/WAI-ARIA, an earlier decision or a verification finding. One adjustment is worth your attention:
- The PanelShell sidebar appears from 1024 px (Tailwind `lg`). Q3 fixes only 768 = compact and 1440 = separate. **Approved by the user 2026-10-31.**

Next: “dalej” for 3b (accounts and E01). That part includes the public mentor components in `@mentio/ui/components/mentors` and the AGENTS.md/E01 spec note. Not committed; no push.

