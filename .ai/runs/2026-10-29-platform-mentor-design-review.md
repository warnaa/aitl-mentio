# Platform primitives and mentor discovery — design review

Date: 2026-10-29
Outcome: review complete; revisions recommended before implementation.

## Request and scope

Review `.ai/specs/2026-10-29-platform-primitives.md` and
`.ai/specs/2026-10-29-mentor-pages-and-discovery.md` for inconsistent or mutually
exclusive designs, anti-patterns, and unnecessary complexity. The specs and application
code are unchanged. This file records the review required by `AGENTS.md`.

## Checklist

- [x] Read both complete specs, the product decisions, compatibility rules, and lessons.
- [x] Compare proposed contracts against the existing form, API client, HTTP helpers,
  import rules, and installed Next.js prefetching guidance.
- [x] Verify the datetime serialization mismatch with a non-mutating Zod/JSON example.
- [x] Cross-check the independent scope-cohesion review.
- [x] Prepare the severity-ranked review and simplification recommendations for delivery.

## Findings

### High — transformed datetime values cannot be submitted using the shared schema

Platform B4 transforms `YYYY-MM-DDTHH:mm` into `Date` (platform spec:161), while
F4 promises that the datetime field sends the wall-time string (platform spec:304;
mentor spec:131). Existing `CrudForm` calls `onSubmit(parsed.data)` after validation
(`packages/ui/src/backend/forms/CrudForm.tsx:61`), and `apiCall` JSON-serializes that
data (`packages/ui/src/backend/api/apiCall.ts:48`). A `Date` becomes an ISO UTC string,
which the route's wall-time schema rejects. The service description also still names
the argument `wallTime` (mentor spec:56).

Correction: make the shared transport schema validate and retain the wall-time string,
then convert its validated value in the service with B4. Alternatively specify separate
wire and server transformation schemas. Add a form → JSON → route-schema test.

The representative check using installed Zod returned a `Date` after client validation,
serialized `{"startsAt":"2026-11-04T17:00:00.000Z"}`, and failed server validation. This
checks the specified contract; there is no implemented slot schema to test yet.

### High — link-list form values disagree with the API and stored model

F4 supports `string | boolean | string[]`, and `urlList` sends `string[]` (platform
spec:300–302). The mentor API expects `{ url, label? }[]` (mentor spec:126), and the
entity stores objects with nullable labels (mentor spec:75). The planned editor cannot
populate or submit that contract through the specified field kind.

Correction: use `string[]` consistently if labels are unnecessary. If labels are a real
requirement, define a structured link field, its initial values, and its object-array
output explicitly. Avoid hiding an incompatible shape behind page-level coercion.

### High — editing a published page can bypass publication requirements

Draft updates allow an empty description and zero links (mentor spec:74–75), but
`publishOwn` alone enforces a 50-character description and at least one public-work
link (mentor spec:127,228). Updates to already published pages are supported
(mentor spec:160), with no rule preserving these requirements. A mentor can publish
a valid page and then save no links while retaining `published` status. Concurrent
publish and update requests create the same problem.

Correction: validate the resulting complete page on every content write when published,
or explicitly transition invalid edits to draft. Serialize publication and content edits
on the same row and test both sequential and concurrent cases. A separate draft-copy
system is unnecessary for this requirement.

### High — the transition-only side-effect rule conflicts with durable retries

B8 permits side effects only when `applied` is true (platform spec:221). B9 promises
that an external payment failure leaves a pending operation which the next read retries
(platform spec:227). After the status transition commits, a crash before the port call
or a failed call leaves later reads with no new due transition. The blanket rule blocks
the promised retry if it also applies to executing the pending payment operation.

Correction: distinguish creating a durable pending operation exactly once, inside the
winning transaction, from executing/retrying that operation on any later authorized
read using the same idempotency key. Define completed/failed/pending behavior and test
crashes after commit and after provider success. B8–B10 are future design guidance;
resolve this before their adoption, rather than blocking unrelated E01 work.

### Medium — publish errors cannot reach the editor's fields

The publish action is an `ActionButton`, whose contract displays an inline failure
(platform spec:314–317). The editor must display the publish response's `fieldErrors`
at the named form fields (mentor spec:158,163). Existing `CrudForm` accepts field
errors only from its own `onSubmit` result and has no external-errors prop or action
error callback (`packages/ui/src/backend/forms/CrudForm.tsx:25,72`).

Correction: define a small controlled field-error input and an action failure callback,
or explicitly combine saving/publishing into the form's submit flow. State whether a
publish action validates saved content or first saves the current editor values.

### Medium — "bookable" alternately includes and excludes the price requirement

The rate column says null means nothing is bookable (mentor spec:78), but the public
`bookableSlots` remain visible without a rate (mentor spec:118,135,182). The list's
`nextBookableQuery()` uses only the time window (mentor spec:152), so an unpriced
mentor can outrank a priced, reservable mentor despite "bookable slot first" ordering.
The owner status also calls slots visible without incorporating the page's published
status (mentor spec:166).

Correction: distinguish a time-window predicate from final booking eligibility. Keep
unpriced availability visible if desired, but expose it as availability, and calculate
actual booking eligibility and list priority using publication, price, time, and later
hold status consistently. Test a draft page and an unpriced mentor with an early slot.

### Medium — delivery order is contradictory and misses a hook dependency

The mentor spec says phases 2–4 can ship in any order after phase 1 (mentor spec:24),
then prescribes the strict sequence 1 → 2 → 3 → 4 (mentor spec:214). Additionally,
its prerequisites name platform phase 1a and accounts (mentor spec:208), but its phase
1 `ActionButton` requires `useApiMutation`, built in platform phase 1b
(platform spec:287,317,376).

Correction: choose one authoritative dependency graph. Retaining the strict order and
updating the introductory claim is the smallest editorial fix; allowing rates and slots
to follow the page independently removes unnecessary coupling, since slots without a
rate are explicitly supported. Keep the complete discovery list after both. Move
`useApiMutation` to the first `ActionButton` consumer, or explicitly add platform
phase 1b as a prerequisite. The existing users table performs only GET requests
(`packages/app/src/app/admin/users/users-table.tsx:40`), so it proves `useApiQuery`,
not the proposed mutation hook; moving the latter also fulfills the first-consumer rule.

### Medium — role-scoped CRUD is built before its actual consumer

B13 names slots (#16) as its first consumer (platform spec:249), but E01 schedules
the factory extension in the page phase (#14) (mentor spec:223). That phase explicitly
uses `apiHandler` for its routes (mentor spec:233), and therefore supplies no actual
role-scoped `makeCrudRoute` consumer. The first use appears with slots
(mentor spec:253), contradicting the first-consumer build policy (platform spec:48).

Correction: move B13's implementation and tests to slots. The page routes retain their
existing explicit role checks through `apiHandler`; no parallel authorization mechanism
or early factory extension is needed.

### Medium — the proposed validator import rule forbids its own implementation

F1 bans direct Zod imports across `core/src/validators/**` while requiring
`core/src/validators/z.ts` to import/configure/re-export Zod (platform spec:260,389).
Without an explicit exception, the new wrapper itself fails lint.

Correction: exempt exactly `validators/z.ts`. Compose the restrictions with the existing
core restrictions. For the client-safe boundary (platform spec:68), test nested relative
imports and package subpaths, rather than only the listed `../...` spellings.

### Medium — Phase 1a's Polish-only guarantee omits exposed error producers

Phase 1a changes AppError defaults and UI component labels (platform spec:385–391),
but existing HTTP/client layers produce their own English messages:
`packages/core/src/http/request.ts:19`, `packages/core/src/http/apiHandler.ts:59,63`,
and `packages/ui/src/backend/api/apiCall.ts:54,62`. A 500 always uses `INTERNAL_ERROR`,
so translating AppError defaults cannot translate that response. The users table renders
the returned message (`packages/app/src/app/admin/users/users-table.tsx:61`).

Correction: include all exposed HTTP/client fallback messages in the Polish sweep and
return a fixed Polish network error rather than a browser exception's arbitrary message.
Verify malformed JSON, missing CSRF, a 500, invalid envelopes, and network failures.

## Anti-patterns and simplification recommendations

- B9 explicitly mutates in GET/page loaders (platform spec:230), conflicting with the
  blanket API-only mutation description (platform spec:104). Installed Next.js guidance
  warns that render side effects can run during prefetch
  (`node_modules/next/dist/docs/01-app/02-guides/prefetching.md:229`). Checking only
  `<Link>` leaves manual prefetch and render retries unaddressed. Prefer an explicit,
  CSRF-protected settlement POST when the participant opens the booking, followed by
  refresh; it preserves next-visit settlement and uses no timer. If render settlement is
  deliberately retained, amend the blanket rule and define all speculative-render paths.
- B8/B9's generic lifecycle/persistence engine has no implemented lifecycle consumer
  yet. Keep the guidance provisional. Implement concrete booking transition and pending
  payment operations first; extract a generic engine once another actual lifecycle
  establishes which behavior is shared. This is a simplification recommendation, not
  a violation of the spec's explicit guidance-only policy.
- `nextBookableQuery()` exposes ORM query construction between services
  (mentor spec:55,152). The one-way dependency avoids an Awilix cycle, but callers still
  inherit query aliases, joins, parameters, and transaction context. Keep this query
  local to the discovery read operation, or define that coupling precisely before
  treating it as a shared public service contract.
- The 50-minute block plus 15-minute start grid (mentor spec:90) implies a minimum
  effective spacing of 60 minutes. A 25-minute booking therefore leaves at least 35
  minutes unavailable. This is compatible with "at least 50", but should be explicit
  when approving R18; choose a finer grid if back-to-back 50-minute sessions are intended.

## Existing unresolved product decisions

Open publishing conflicts with invited publishing until D22 is approved; R18 and R19
also await owner decisions (mentor spec:199–203,270–271). The spec already identifies
these gates. They are unresolved direction calls, not newly discovered implementation
defects. The accounts spec was not present among the inspected active specs, so its
session, redirect, and returnTo contracts could not be independently compared.

## Verification and limits

Both specs were read completely. This is a design review, supported by selected current
implementation references and a representative Zod/JSON check. No application build,
test suite, database mutation, tracker operation, or browser QA was performed. The
specs describe future behavior; findings identify contract consequences and omissions,
not verified defects in an implemented mentor feature.

A fresh-context subagent checked scope cohesion and delivery dependencies. Its phase
ordering, missing mutation-hook dependency, and premature B13 findings were checked
against the source specs. `git diff --check` passed. Only this review log and the
required append-only lesson on transformed form values were added/updated.

## Accepted follow-up

The user accepted all recommended corrections and simplifications on 2026-10-29.
They were applied to both source specs in
`.ai/runs/2026-10-29-platform-mentor-spec-corrections.md`. The findings above and their
line numbers record the pre-correction versions; they are historical review evidence,
not claims that the corrected specs still contain those designs.

## Needs from you

None to complete the review. Implementation still needs the owner decisions already
recorded in the mentor spec (D22, R18, R19).
