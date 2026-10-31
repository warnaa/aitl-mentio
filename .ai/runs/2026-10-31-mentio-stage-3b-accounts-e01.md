# Mentio design system — stage 3b: accounts and E01

Date: 2026-10-31. Spec: .ai/specs/2026-10-31-mentio-design-system.md.
Requested: “1024 px ok, commit i dalej” — 3a committed as 3089c61 (no push); then 3b only. Rules of lekcja-06/storybook-mentio.md remain in force.

## Applied decisions

- Stage-3 decision 1: AGENTS.md now allows `(marketing)` pages to use the plain-Tailwind, server-safe presentational components in `@mentio/ui/components/mentors` and `/auth`; the E01 spec carries a note. Decision 2: all copy and formatted values through props (stories English, app Polish).
- Fixed before starting: the 3a slot removal stories used `/api/availability/slots/:id`; the spec's contract is `DELETE /api/availability/slots?id=<uuid>`.

## Derived (not new decisions)

- Mentor list as dense rows with thin separators (R01.1, R01.3; ten-line decision 2), although the spec calls each entry a “card”: content follows the spec, presentation the references.
- Public pages: page role 24/32, prose 65ch, content width 1152 (Q2/Q3); no ratings (N02); work links open in a new tab with `rel="noopener noreferrer nofollow ugc"` and a visually hidden “opens in a new tab” (WCAG 3.2.5 advisory) passed as a prop.
- The slug warning on a published page is a persistent field hint before saving (spec: “shows a warning before saving”).

## Plan

- [x] Components with 100% unit tests: `components/mentors/MentorDirectory`, `MentorProfile`, `MentorPageStatus`; `components/auth/AccountNav`, `AuthPanel`; package exports.
- [x] 13-section pages for the five components (Product › E01 / Platform and accounts).
- [x] Screen stories with MSW and state maps: sign in, registration (+ mentor variant), become a mentor; mentor list, mentor page, my page editor, my slots.
- [x] Token checker, stories both themes, page/axe checks, screen browser checks (widths, themes, overflow, keyboard), full gate; report; POSTEP; stop before 3c.

## Outcome

Done — 3b only. See packages/ui/storybook/verification/2026-10-31-stage-3b.md.

Evidence:
- 704 story tests (3 clean runs).
- 282 page checks and 94 axe audits.
- No overflow in any product story.
- Visual review.
- 274 unit tests at 100% coverage; lint, types, build, integration and audit pass.
- check:tokens: zero findings.

Files:
- AGENTS.md (approved exception) and the E01 spec note.
- ui: components/mentors/* and components/auth/* (+ tests), package exports, globals.css.
- Storybook: product/accounts and product/e01 stories and MDX, fixtures/mentors.ts, the 3a slot-endpoint correction, the PanelShell docs update, verification files.
- POSTEP.md.

Servers and the throwaway Postgres were stopped and removed.

## Local commit authorized

The user asked for “commit i dalej” (typed with a typo). 3b is committed locally on main; no push. The four interpretations were not addressed and remain open in POSTEP.md. 3c continues in its own run log.

## Needs from you

- Confirm the four interpretations listed in POSTEP.md (list rows, slug hint, DST error state, 404/error pages deferred).
- Say “dalej” for 3c, optionally after a local commit.
