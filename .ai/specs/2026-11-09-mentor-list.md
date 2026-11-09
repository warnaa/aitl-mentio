# Mentor list filtered by stack tag (E03-S01, #39)

## 📝 TLDR

A public page at `/mentors` lists every mentor a mentee could book right now: one card per mentor, with
name, stack tags, both session prices and the next bookable time. The mentee can filter by one of the four
stack tags (TypeScript, React, Python, AI agents). The list is ordered by
`MentorProfile.lastPublishedAvailabilityAt`, newest first, and nothing else. It has no search box, score,
rating or featured placement (R13, D21, N02). The same data is served as JSON at `GET /api/mentors?tag=`.
It is the second way to find a mentor, next to the share link, for mentees who arrive without one.

## Resolved assumptions (autonomous defaults)

Written unattended by `om-auto-write-spec` (via `om-auto-fix-issue 39`). Each answer below is the most
reversible option. Override any of them on the spec PR before it merges.

| # | Question | Default applied | Rationale |
|---|---|---|---|
| A1 | What makes a mentor *listed*? | The mentor is **offer-ready** (`mentorOfferReady`: profile complete, published, both prices inside the *current* platform bounds), **and** has at least one **bookable** slot: not removed, `startsAt ≥ now + MIN_LEAD_MINUTES`, and at least one viable length under active occupancy (`viableLengths`). | B26 (platform primitives II) says the ordering key is not an eligibility test, and that once bookings exist (they do, #40) eligibility must exclude slots with no viable length. A mentor whose only times start within two hours (D22) or are already taken would be a dead end, so the list reuses the predicates the mentor page and the booking service already apply. |
| A2 | Ties and missing ordering key? | `lastPublishedAvailabilityAt DESC NULLS LAST`, then `slug ASC` | A deterministic order keeps the integration snapshot and the API stable. `slug` is unique and carries no score. |
| A3 | How many tags at once? | One, as `?tag=<value>`. No multi-select. | This is the issue's wording ("filterable by one of the four tags"). It needs the least UI, and a second tag can be added later without breaking anything. |
| A4 | An unknown `?tag=` on the API? On the page? | API: **422** `validation_failed` (B18: "an unknown `?tag=` must be 422, not an empty list"). Page: the tag links and an error message ("We do not list that stack. Choose one of the stacks above.") with no cards. The page returns 200, not a 404. | The API follows B18. A human who mistypes a URL gets a way back on the page instead of an error page. |
| A5 | Pagination or limit? | None | B18 says pagination is not built until a list needs it. R13 reopens the design above 30 published mentors, which is far below a size that would need paging. |
| A6 | What does a card show? | Avatar or initials, display name, a plain description (the bio, clamped to three lines with CSS), public-work link, stack tags, both prices with currency, the next bookable time (`LocalTime`), and a "View profile" link to `/m/<slug>` | R04: a plain description and a link to public work. The prices and next time let a mentee compare without a score. |
| A7 | Should the list record visits (Q20)? | **No.** Nothing is recorded. | Q20 is open with founder A and founder B. The issue keeps visit recording out of scope until they decide. |
| A8 | Should the landing page link to the list? | Yes. A secondary "Browse mentors" action in the hero and in the closing band, next to the existing actions. The "Choose a mentor" step text is unchanged. | The issue asks for it. Spec 2026-11-05 (align screens) A12 left the catalogue link out only because the page did not exist. |
| A9 | What about the prototype's s19 search, price filter, rating summary and profile dialog? | Left out. Cards link to the existing mentor page. | R13 (no search, no ranking) and N02 (no ratings) are active and override the prototype. The profile dialog would duplicate `/m/<slug>`. |

No assumption is marked `⚠ NEEDS HUMAN CONFIRMATION`. Each one follows an active rule (R04, R13, N02,
D21, D22) or the issue text, and none touches security, data scoping or a protected contract.

## 📝 Problem Statement

D21 and R13 give a mentee two ways to find a mentor: a list filtered by stack tag, and the mentor's share
link. D13 left the list out of the first iteration ("mentors bring their own audience"), so today a mentee
without a share link has no way in. The landing page even sends "Find your mentor" visitors to
registration (spec 2026-11-05, A12). This story adds the list (#39, epic #28). Its dependencies, the mentor
page (#35) and availability slots (#36), are merged.

## 📝 Proposed Solution

A read-only query in `MentorProfileService`, exposed in two ways:

- **Server-rendered page** `packages/app/src/app/mentors/page.tsx`. It calls the service through
  `withScope`, as `/m/[slug]` does. It is a navigated surface, so it does not fetch its own API.
- **JSON route** `packages/app/src/app/api/mentors/route.ts` (`GET`, public, `apiHandler`). It serves the
  same DTO for API consumers and pins the 422 contract.

Alternatives rejected:

- **Reusing `MentorSearch`** from the UI package. It is built around free-text search, a price filter,
  sorting and ratings. R13 and N02 forbid all of these, and stripping them out would leave a different
  component.
- **Computing eligibility in SQL with a correlated `EXISTS`**. Viable lengths depend on half-open interval
  overlap across the two session lengths, and `occupancy.ts` already implements that in TypeScript. Doing
  it in SQL would duplicate the rule (B26 forbids recomputing derived facts in a second place). The data
  is small (R13's 30-mentor trigger), so the service loads candidates and filters them in memory with
  three bounded queries.

## 📝 Architecture

```
/mentors?tag=react ─┐                            ┌─ MentorProfile (published, prices in bounds, tag)
                    ├─ MentorProfileService ─────┼─ Slot (future ≥ now+lead, not removed)
GET /api/mentors ───┘    .listPublished(tag?)    └─ Booking (activeOccupancy, overlapping those slots)
                              │
                              └─ MentorListItemDto[] → MentorList / MentorCard (packages/ui)
```

### Core: `MentorProfileService.listPublished(tag?: StackTag)`

1. `now = clock.now()`, `settings = platformSettingsService.get()`, `earliest = now + MIN_LEAD_MINUTES`.
2. **Candidates:** `em.find(MentorProfile, { publishedAt: { $ne: null }, price25Cents: { $gte, $lte }
   (p25 bounds), price50Cents: { … } (p50 bounds), ...(tag && { stackTags: { $contains: [tag] } }) },
   { populate: ['user'], orderBy: [{ lastPublishedAvailabilityAt: 'desc nulls last' }, { slug: 'asc' }] })`.
   Then filter with `mentorPagePublishable.evaluate(...).ready`, which is defensive because publication
   already enforces it. The DTO selects fields by allowlist, like `publicFields`.
3. **Slots:** one query, `Slot` where `mentorProfile ∈ ids`, `removedAt: null`, `startsAt ≥ earliest`,
   ordered by `startsAt`.
4. **Occupancy:** one query, `Booking` where `mentorProfile ∈ ids`, `activeOccupancy(now)`, and
   `startsAt > earliest − 50 min`. This is the widest window that can overlap any candidate slot.
5. For each candidate, keep the first slot (in time order) whose `viableLengths(slot.startsAt, that
   mentor's bookings)` is non-empty. That slot's `startsAt` becomes `nextSlotStartsAt`. A candidate with
   no such slot is dropped.
6. Return the DTOs in the candidate order. No ordering is recomputed in memory.

The method takes no free-text parameter, and none may be added under R13. It reads only, writes nothing,
and emits no events.

### Validator

`packages/core/src/validators/mentors/mentor-list-query.schema.ts`:
`z.object({ tag: StackTags.schema.optional() }).strict()`, parsed with `parseWith`, so an unknown value
fails as `ValidationError` (422). Unknown extra query keys are ignored by reading only `tag` from
`searchParams`. `strict` applies to the object built from that one key.

### App

- `api/mentors/route.ts`: `export const dynamic = 'force-dynamic'`, then
  `GET = apiHandler(req => withRequestScope(req, ({ mentorProfileService }) =>
  mentorProfileService.listPublished(parseWith(mentorListQuerySchema, { tag: … }).tag)))`.
  It returns `{ mentors }`. This sits alongside `[slug]` and `me` without conflict, because Next resolves
  the static segment `route.ts` at `/api/mentors` before the dynamic one.
- `mentors/page.tsx`: public and `force-dynamic`. It reads `searchParams.tag`, validates it with the same
  schema (a `ValidationError` renders the A4 message), calls the service via `withScope`, maps tags to
  labels with `StackTags.labelOf`, and renders `PublicPage` → `MentorList`. Any other error renders
  `ErrorMessage` "The mentor list is unavailable. Please try again later.", as `/m/[slug]` does.
- `page.tsx` (landing): adds the "Browse mentors" secondary actions (A8) and updates the doc comment
  that says the catalogue is not built.

### UI (`packages/ui/src/components/mentors/`)

- `MentorCard.tsx` is presentational. Its props are plain values: name, initials or avatar URL, bio,
  public-work URL, stack labels, formatted prices, the next-slot ISO string and the profile `href`. It
  reuses `TechnologyChips`, `LocalTime`, `Card` and `Badge`. It renders no rating component and has no
  `searchbox` role.
- `MentorList.tsx` contains the tag links as a `nav` with `aria-label="Filter by stack"`: "All" plus four
  links using `aria-current="page"` for the active one. The tag options come in as props, because UI
  must not import core (platform primitives II, A11 caveat). It also renders the card grid and an
  `EmptyState` when the list is empty.
- The price formatter in `MentorPageView` (`Intl.NumberFormat('en-GB', …)`) is extracted to a shared
  `packages/ui/src/components/mentors/format-price.ts` and used by both components.
- There are stories for both components (populated, filtered, empty, invalid tag).

## 📝 Data Model

No changes. The list reads `MentorProfile.publishedAt`, `stackTags`, `price25Cents`, `price50Cents`,
`lastPublishedAvailabilityAt`, `slug`, `bio`, `publicWorkUrl`, the `User` fields `displayName` and
`avatarUrl`, `Slot`, and `Booking`. `lastPublishedAvailabilityAt` is already written in the slot-publish
transaction (`slot.service.ts`), following the B26 convention. There is no new index:
`mentor_profiles` stays small, as R13's trigger assumes, and slot and booking lookups by
`mentor_profile_id` are already indexed by their foreign keys.

## 📝 API Contracts

`GET /api/mentors[?tag=typescript|react|python|ai-agents]`. It is public: no session is read and no
CSRF check applies (GET).

```jsonc
// 200
{ "ok": true, "data": { "mentors": [ {
  "slug": "alex-laurent",
  "displayName": "Alex Laurent",
  "avatarUrl": null,
  "bio": "…",
  "publicWorkUrl": "https://github.com/…",
  "stackTags": ["typescript", "react"],
  "prices": { "price25Cents": 4000, "price50Cents": 7000, "currency": "EUR" },
  "nextSlotStartsAt": "2026-11-12T09:00:00.000Z"
} ] } }
// 422 for ?tag=rust
{ "ok": false, "error": { "code": "validation_failed", "message": "…", "fieldErrors": { "tag": ["…"] } } }
```

The DTO is new and the endpoint is additive (`BACKWARD_COMPATIBILITY.md` §1). The DTO contains no score,
rank or rating field, and no user id, email or profile id.

## 📝 UI/UX

- Route: `/mentors`, plus `/mentors?tag=<value>`. The heading is "Find a mentor", followed by one line
  of copy: "Mentors with open times, newest availability first."
- Filtering uses plain links, so it works without JavaScript and the URL can be shared. There is no
  search input, no sort control, no price filter and no "featured" section.
- Each card's "View profile" link points to `/m/<slug>`, which handles booking.
- Empty: "No mentors have open times right now." With a tag: "No {Tag} mentors have open times right
  now.", followed by a link to "All stacks".
- Invalid tag: the A4 message above the tag links, and no cards.
- Accessibility: the cards are `article` elements in a list. The filter `nav` marks the active tag with
  `aria-current`. Next-slot times use `<time dateTime>` through `LocalTime`, and the page has no
  horizontal overflow at 375 px (`expectFitsMobile`).
- Mockup: [`assets/mentor-list/mockup-01-mentor-list.png`](assets/mentor-list/mockup-01-mentor-list.png)
  (static HTML in the same folder). It is illustrative: the copy and placeholder data are not product
  data.

## 📝 Edge Cases & Failure Scenarios

- **A mentor lowers a price below a raised bound, or the operator narrows the bounds.** The bounds are
  read at request time, so the mentor drops out of the list, matching the mentor page's `offerReady`.
- **A mentor unpublishes.** `publishedAt` is null, so the mentor is not listed.
- **The only slot is removed or booked.** The mentor drops out. The ordering key is not lowered (B26), so
  when the mentor publishes again they return in a position that reflects that new publication.
- **The only slot starts within two hours.** The mentor is not listed (D22 lead time), which is
  consistent with the mentor page, where that slot is not bookable.
- **A pending hold expires.** `activeOccupancy(now)` stops counting it, so the mentor reappears without
  any write.
- **The database is unavailable.** The page shows the generic error message. The API returns the
  standard 500 or 503 envelope from `apiHandler`.
- **A race between the list and booking.** The list is advisory. The booking service re-checks
  everything under its locks.

## 📝 Risks & Impact Review

- **Blast radius:** this adds a new read-only route and page, adds a method to an existing service, and
  makes an additive change to the landing page. There are no writes, migrations, events or new
  permissions.
- **Privacy:** the DTO is an explicit allowlist that matches the mentor page's public fields, plus
  prices and one time. It exposes no account identifiers.
- **Product rules:** R13 and N02 are enforced by the absence of inputs (no free-text parameter, no rating
  component) and pinned by tests: no `searchbox` role, and no rating text in the snapshot.
- **Rollback:** reverting the PR removes the page, the route and the landing links. Nothing persists.

## 📝 Decisions in play

- **D21 / R13** (founder A): list by stack tag or share link, ordered by most recent published
  availability, no search, no ranking. This spec implements them as written.
- **N02 / R04** (founder A): no ratings or reviews; a plain description and a public-work link. The card
  carries both.
- **D22**: two hours' notice. It is applied to "bookable" through `MIN_LEAD_MINUTES`.
- **D13**: this is 1.1 work, filed after the first iteration.
- **Q20** (founder A with founder B, open): visit recording is not part of this spec (A7).
- **Prototype s19**: it deviates from the prototype on search, filters, ratings and the dialog (A9).
  R13 and N02 are the authority.

No decision is superseded.

## 📋 Phasing

Phase 1 is one shippable PR: the service, the route, the UI components, the page, the landing links and
the tests. The feature is small enough that splitting it would ship a route with no page or a page with
no entry point.

## 📋 Implementation Plan

### Phase 1 — Mentor list

1. **Query schema and service method.** Add `mentor-list-query.schema.ts` and
   `MentorProfileService.listPublished(tag?)` with the `MentorListItemDto` type, exported from the core
   index. Unit tests in `mentor-profile.service.test.ts` must cover:
   - inclusion when the mentor is offer-ready with a bookable slot;
   - exclusion when unpublished, when a price is missing or out of bounds, when there is no future slot,
     when the only slot is removed, when the only slot is inside the lead time, and when the only slot is
     fully occupied;
   - a slot freed by an expired hold being listed again;
   - the tag filter;
   - ordering, including the `slug` tie-break and nulls last;
   - `nextSlotStartsAt` skipping an occupied earlier slot.

   Add the schema file to `coverage.include` in `vitest.config.mts`.
2. **API route.** Add `packages/app/src/app/api/mentors/route.ts` with `route.test.ts` covering 200 with
   and without a tag, and 422 for `?tag=rust` and `?tag=`. Add the route file to `coverage.include`.
3. **UI components.** Extract `format-price.ts` and switch `MentorPageView` to it, with behaviour
   unchanged and its tests green. Add `MentorCard.tsx` and `MentorList.tsx` with tests:
   - the card renders its fields and the profile link;
   - the filter marks the active tag;
   - the empty states, generic and per tag;
   - the invalid-tag message;
   - no `searchbox` role and no rating text.

   Add stories for both components and add the files to `coverage.include`.
4. **Page and landing link.** Add `packages/app/src/app/mentors/page.tsx` with `page.test.tsx`
   (service mocked; list, filtered, invalid tag, service error). Add the landing page's "Browse mentors"
   actions and update `page.test.tsx` and the doc comment.
5. **Integration snapshot.** Add `tests/integration/mentor-list.integration.test.ts`. It seeds two
   bookable mentors with different tags and publication order, plus one mentor without prices. It then
   asserts:
   - the order of the two;
   - that the mentor without prices is absent;
   - that `?tag=` narrows the list;
   - that the snapshot has no `searchbox` role;
   - a 422 for an unknown tag from the API;
   - that the page fits at mobile width.

   The database is shared across runs, so assertions concern the seeded mentors' relative order and
   presence, never the absolute list. Record QA evidence under `.ai/qa/MENTOR-LIST/`.

## Acceptance criteria

- Given published mentors, when a mentee opens `/mentors`, then mentors with at least one bookable slot
  and valid prices appear, most recently published availability first. (R13)
- Given the list, when the mentee filters by a stack tag, then only mentors carrying that tag remain.
  (R13)
- Given the list, when it renders, then there is no search box, no score, no rating and no featured
  placement. (R13, N02, negative)
- Given a mentor with no bookable slot or no valid prices, when the list renders, then that mentor is
  not listed. (negative)
- Given `GET /api/mentors?tag=rust`, then the response is 422 `validation_failed`. (B18)
- Given the landing page, then it links to `/mentors`.
