# Align the remaining app screens with the prototype

Status: active, 2026-11-05. Epic: E01/E02 (#27). Design source:
`prototypes/devmentor-journey/` and the [E01/E02 design handoff](2026-09-09-e02-design-handoff.md).

## 📝 TLDR

The E01 and E02 app screens were built from the behaviour specs alone, with generic
primitives and ad-hoc Tailwind, so they do not look like the approved prototype. `/mentor`
was rebuilt as prototype screen s11 in PR #63. This spec does the same for every other
existing screen: the public mentor page, the profile editor, the invitation, the
authentication pages, the landing page, the mentee home and the operator pages. Behaviour
specs keep governing data, validation, copy facts and security; routes, guards and API
contracts do not change.

## 📝 Problem Statement

`packages/app/AGENTS.md` requires a page with a prototype screen to reproduce that screen's
composition: sections, order, headings and the design-system components it uses. The
2026-11-05 lesson records the user's correction that E02 screens matched the specs but not
the designs. Every screen listed below still diverges: different headings and copy
hierarchy, missing public header and footer, Tailwind one-offs instead of `dm-*` layout
classes, and app-level compositions where a designed component exists (`MentorProfileEditor`).

## 📝 Goal and screen map

| App route | Prototype screen | Source |
| --- | --- | --- |
| `/m/[slug]` | s1 Mentor profile, s2 No available times (empty state) | `MentorProfileScreen.tsx`, `BookingScreens.tsx` |
| `/mentor/profile` | s27 Edit mentor profile, with the share/publish aside | `MentorScreens.tsx` |
| `/invitation/[token]` | s26 Mentor invitation | `MentorScreens.tsx` |
| `/sign-in`, `/register` | s12 Sign in, s20 Create an account, s21 Check your inbox, s22 Email verification | `AuthScreens.tsx` |
| `/` | s17 Home | `LandingScreen.tsx` |
| `/home` | s6 My sessions (empty workspace) | `SessionScreens.tsx` |
| `/admin`, `/admin/users` | s24 Operator home, s25 Operator users | `AuthScreens.tsx` |

## 📝 Non-goals

- Booking and checkout (s3–s5, s13, s14), sessions and notes (s7–s10, s15, s16, s18),
  payouts and Stripe (s28, s29), the mentor catalogue (s19). No link may point at them.
- Mentor reviews and ratings: no backend stores them yet.
- Route, guard, service or API contract changes. No new data is fetched for design-only
  sections.
- Demo-only controls (scenario toggles, demo clock, Stripe or GitHub simulations).
- The Storybook launcher's cross-drive path bug.

## 📝 Approach

- Read each prototype screen's source and CSS first; reproduce its sections, order, headings,
  copy hierarchy and DS components (`Card` + `dm-product-panel`, `EmptyState`, fact chips,
  `TechnologyChips`, `AuthLayout`, `AccountForm`, `MentorProfileEditor`, right-aligned
  `dm-form-actions`).
- Promote the `proto-*` layout CSS each screen needs into `packages/ui` as `dm-*` classes,
  as `mentor-workspace.css` did for s11. The app never imports prototype CSS.
- The prototype's `PublicPage` frame (wordmark header, navigation, footer) becomes a
  `PublicLayout` in `packages/ui/src/backend/shell/`, next to `AuthLayout` and `AppShell`.
  The app supplies its links, as it does for `AppShell`.
- `MentorProfileEditor` takes the production field contract (`publicWorkUrl`, `bio`,
  `stackTags`), host-supplied stack options and an optional host schema, so the app uses
  the designed component without a second composition. The prototype adapts at its call
  site.
- Navigation labels follow the prototype's workspace menu: Operator home, Users, My
  sessions, Mentor workspace, Edit profile.

## 📋 Decisions where the design and a behaviour spec disagree

Behaviour specs govern data, validation, copy facts and security; the design governs
structure. Each conflict below is listed again in the PR body.

| Id | Screen | Design | Behaviour spec / product fact | Decision |
| --- | --- | --- | --- | --- |
| A1 | s1 | "Choose a session" button and booking hint | Booking is E03; no booking action before it (mentor-prices AC) | Booking card keeps prices, published-availability days and the included-features list; no booking button or hint. |
| A2 | s1 | Day chips only for availability | `/m/[slug]` shows every future slot, disabled with its reason inside two hours (availability-slots) | Day chips in the booking card, plus an "Available times" section in the content column listing each time and its status. |
| A3 | s1 | Session language, mentor timezone, "What I can help with", sample answer, "How I run a session", reviews | No such data exists; reviews have no backend | Omitted. Sections render only from stored mentor data: header, intro, technologies, public work, about. |
| A4 | s1 | Price display `PLN 180` | Prices are stored in grosze and may carry cents | Formatted with `Intl` in PLN; whole amounts show no decimals. |
| A5 | s27 | Display name field; complete-profile validation on save | Saves are partial drafts (`mentorProfileUpdateSchema`, all optional); publication enforces completeness; the name is the account's | No display-name field; required markers stay as "needed to publish"; the server's publish refusal is shown in the aside. |
| A6 | s27 | "Preview public page" for drafts | An unpublished page has no public route; the owner preview must not drift from the public view (mentor-page) | Published: the button opens `/m/<slug>`. Draft: it reveals the same `MentorPageView` inline, labelled as a preview. |
| A7 | s27 | "Local preview link" copy | Production share link `${APP_URL}/m/<slug>`, stable across renames | Field label "Share link"; the copy action and its failure state follow the design. |
| A17 | s27 | Aside lists requirements in prose; no unpublish; local-preview wording | Unmet readiness items are shown before publishing, a refused publish lands on its fields, an Unpublish action exists, and the share link carries the slug-stability sentence (mentor-page) | The aside lists the readiness items ("Required:"/"Complete:"), refusal errors reach the editor's fields, "Unpublish page" follows the share actions, and the published description is the slug-stability sentence. |
| A8 | s26 | Separate expired, unknown and used messages | `lookup` deliberately answers one `NotFoundError` for all three | One "This invitation link cannot be used" state whose copy covers expired, used and unknown links. |
| A9 | s26 | No "other email" state | A signed-in account with another email cannot accept (invitations spec) | Same card; the message names both addresses and offers Sign out. |
| A10 | s22 | Verified link opens a session ("Open my workspace") | An already-verified link creates no session (E01 edge case 16) | `/sign-in?verified=1` shows the s22 "Your email is verified" heading and status, then the sign-in form. A freshly verified link still redirects home with a session. |
| A11 | s22 | Expired and invalid shown separately | The route reports both as `?error=verification` | One s22 "Check your verification link" state with the invalid-link feedback and "Request a new verification link" (→ `/register`). |
| A18 | s20, s21 | Registration description promises finding mentors and booking; s21 shows a demo email preview | Booking and the catalogue are not built; the inbox preview is a demo-only control | s20 keeps the design heading with the factual description (GitHub or email, confirm before sign-in); s21 keeps its heading, copy and recovery actions without the preview. |
| A12 | s17 | "Find your mentor" → catalogue; example mentor band with reviews | The catalogue (s19) is out of scope; no link to nonexistent pages; no fictional mentors as product data | Primary action "Create an account" (→ `/register`); the mentor band is omitted. The labelled example conversation and answer stay as illustrations. |
| A13 | s6 | "Find a mentor" empty-state action | No catalogue yet | "No sessions yet" with copy that does not promise a missing page; no action. |
| A14 | s24 | Account access card only | `/admin` reports the database connection and degrades to "Unavailable" (bootstrap) | Keep the design's card first, then a "Service status" panel with the database state. |
| A15 | s25 | Payout setup column | Stripe Connect is iteration 1.1 and out of scope | Column omitted. Roles show as neutral chips from the stored role set. |
| A16 | all | Prototype prices PLN 90–600 and 180–1,200 | Approved bounds 80–600 and 160–1,200 | Only the approved bounds are shown (s11 already). |

## ✅ Acceptance criteria

1. Each route in the screen map renders the prototype screen's sections in order, with its
   headings, copy hierarchy and DS components, except where a decision above says otherwise.
2. Prototype layout CSS used by these screens lives in `packages/ui` as `dm-*` classes; no
   app file imports prototype CSS and no new ad-hoc Tailwind layout is introduced.
3. Routes, server guards and API contracts are unchanged; existing redirects and error paths
   keep working.
4. Visitors never see a booking action, a mentor setup checklist or a link to an unbuilt page.
5. Every changed component and page has unit tests at 100% per-file coverage and is listed in
   `coverage.include`. Integration tests whose headings or labels change are updated and
   assert on roles and text.
6. Desktop (1280px) and 320px screenshots of each screen are compared side by side with the
   prototype; nothing overflows the document and no text collapses to one word per line.
7. `npm run typecheck`, `lint`, `test`, `build`, the prototype checks and the integration
   suite pass.

## 📝 Implementation breakdown

One commit per screen, in the order of the screen map, with a checkpoint after every two or
three screens. The execution plan lives in the local run folder
`.ai/runs/2026-11-05-align-screens-with-prototype/`.
