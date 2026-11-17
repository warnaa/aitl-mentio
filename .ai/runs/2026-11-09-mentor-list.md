# Mentor list filtered by stack tag (E03-S01, #39)

Source doc: .ai/specs/2026-11-09-mentor-list.md (spec PR #85)
Issue: #39
Run: `om-auto-fix-issue 39` → feature route → `om-auto-write-spec` (#85) → `om-auto-implement-spec` → `om-auto-create-pr`

## Request

The request is to implement issue #39 (E03-S01): a public mentor list filtered by one stack tag and
ordered by most recent published availability, with no search, score, rating or featured placement
(R13, D21, N02).

## Goal

Ship `/mentors` and `GET /api/mentors?tag=` as specified, with eligibility per spec A1. The landing page
links to the list.

## Scope

- core: `validators/mentors/mentor-list-query.schema.ts`, `MentorProfileService.listPublished`, and the
  `MentorListItemDto` export.
- app: `api/mentors/route.ts`, `mentors/page.tsx`, and the landing page actions.
- ui: `components/mentors/format-price.ts` (extracted from `MentorPageView`), `MentorCard.tsx`,
  `MentorList.tsx`, and their stories.
- tests: unit tests per file, `coverage.include` entries, and the
  `tests/integration/mentor-list.integration.test.ts` integration test.

## Non-goals

- Search, sort controls, price filters, ratings and featured placement (R13, N02).
- Visit recording (Q20).
- Pagination (B18).
- Any schema change.

## Implementation Plan

### Phase 1: Mentor list

1. Add the query schema and `listPublished`, with unit tests.
2. Add the public `GET /api/mentors` route, with tests.
3. Add the UI: extract `format-price`, then add `MentorCard`, `MentorList`, stories and tests.
4. Add the `/mentors` page and the landing page links, with tests.
5. Add the integration test.

## Risks

- The `$contains` operator on the `text[]` column and the `desc nulls last` ordering are only exercised
  against Postgres by the integration test, because unit tests mock the `EntityManager`.
- The integration database is shared across runs, so assertions must be relative to the mentors each
  scenario seeds.

## Progress

PR: #87

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Mentor list

- [x] 1.1 Query schema and listPublished service method — c22d901
- [x] 1.2 Public GET /api/mentors route — 70756df
- [x] 1.3 MentorCard, MentorList and shared price formatter — 46ab86e
- [x] 1.4 /mentors page and landing links — 9594136
- [x] 1.5 Integration test — 50ca5f7

## Outcome

The work is implemented on `feat/mentor-list` (PR #87; spec PR #85).

- **Service:** `MentorProfileService.listPublished(tag?)` uses three bounded queries (candidates, future slots, active occupancy). Eligibility reuses `mentorPagePublishable`, the current price bounds, `MIN_LEAD_MINUTES` and `viableLengths`.
- **API:** `GET /api/mentors`; an unknown or empty `?tag=` returns 422 `validation_failed`.
- **Page:** `/mentors` reuses the design system's `MentorDirectory` (built for #39) and adds a new public `MentorCard`. The landing page links to it with "Browse mentors" in the hero and the closing band.
- **Integration test:** `tests/integration/mentor-list.integration.test.ts` checks the order, the tag filter, the 422 and the page itself (no search box, no rating text, fits a mobile viewport). The home scenario now expects the new links.

Deviations from the spec, all reversible:

- The stack filter is the design system's `MentorDirectory`: buttons with `aria-pressed` that drive `?tag=` through the router, instead of plain links with `aria-current`. This reuses the canonical component built for #39. The URL stays shareable.
- No separate `MentorList` component. `MentorDirectory` already provides the filter, the result count and the empty slot.
- The price formatter and `initials` are imported from `MentorPageView` rather than extracted into a new `format-price.ts`.

Validation: `npm run typecheck`, `npm run typecheck:storybook`, `npm run lint` (0 errors; 2 warnings that were already there), `npm run test:unit:coverage` (1849 tests, 100% per file) and `npm run build` all pass. The mentor-list and home integration tests pass.

Follow-ups: Q20 visit recording, which is still open with the founders. The spec moves to `implemented/` after this PR and spec PR #85 merge.
