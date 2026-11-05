# Choosing a mentor slot and reserving a pending booking

## 📝 TLDR
Issue #40 gives a mentee a pending, unpaid reservation for a published mentor slot at least two hours ahead, for 25 or 50 minutes at the stored mentor price. The reservation lasts 30 minutes. Payment, confirmation and cancellation remain separate stories.

## Resolved assumptions (autonomous defaults)
| Question | Choice | Reason |
| --- | --- | --- |
| Q1: occupancy versus history | Booking has a many-to-one slot reference and a partial unique index on slot for pending/confirmed statuses. Expired pending rows become expired under the slot lock before insertion. Cancelled/expired history never occupies. | A permanent unique slot FK would prevent rebooking; time-dependent index predicates are invalid in PostgreSQL. Preserve history rather than overwriting it. |
| Q2: scope split | Implement reservation only; #41 will extend this contract with payment and confirmation. | Each is independently deployable; no provider, payment or cancellation behavior is invented. |
| Q3: historical examples | Use the current mentee role and apiHandler's central CSRF guard. | Preserve the protected role and HTTP contracts; student is not a role in this repository. |

## 📝 Problem Statement
The public mentor page currently displays availability and prices but cannot reserve a time. A mentee needs a truthful choice of time and duration, a secure sign-in return, and a server-authoritative reservation protected against concurrent attempts.

## 📝 Proposed Solution
Reuse the published mentor page, session and returnTo helpers, readiness policy, injected clock, scoped services and apiCall. Display the price before the explicit reserve action. Success states that the booking is pending and unpaid, with the hold expiry; it must never claim confirmation. A stale or competing selection receives a conflict with recovery instructions. A pending hold is exactly 30 minutes as specified in #40, not a new payment-expiration policy.

## 📝 Architecture
Add the bookings concept in db, core validators/services and the app route, registered explicitly in DI. The BookingService authenticates independently of its route. Identity comes exclusively from the live request scope. Inside a fresh transaction lock the mentor profile first, then the slot, refreshing both. The profile lock serializes price/unpublish changes; the slot lock serializes reservation and removal. Read the clock after locks, enforce the 120-minute inclusive threshold (D22), nonremoved slot and mentorOfferReady with this future slot. Expire stale pending occupants and flush before inserting the new hold; do not catch unrelated database errors as conflicts. Slot removal holds its existing slot lock, expires stale holds, and refuses active pending/confirmed occupancy. No new scheduler is needed: expiry is evaluated lazily using server time.

## 📝 Data Model
Booking spreads baseProperties and stores slot (many-to-one), mentee User, mentorProfile, lengthMinutes (25/50), priceCents (positive integer snapshot), currency (PLN), status (pending/confirmed/cancelled/expired), startsAt snapshot, nullable bookedAt, nullable expiresAt and unique nullable stripeCheckoutSessionId reserved for #41. Pending rows require an expiry. A named partial unique slot index covers statuses pending and confirmed; history has no slot uniqueness. Add check constraints for duration, status and positive price. Generate the additive migration and snapshot through the repository CLI; verify up/down/up on ephemeral PostgreSQL. Rollback requires stopping booking writes and exporting any booking history before dropping the new table. No existing data changes.

### Occupancy across different start times
E02's handoff additionally requires no overlapping active intervals for one mentor, even across different slot IDs. Intervals are half-open [startsAt, startsAt + lengthMinutes), so adjacent sessions are allowed. Under the mentor-profile lock expire all stale pending holds for that mentor before checking any active interval intersecting the requested interval. The slot unique index remains a second same-slot safeguard; mentor-profile serialization protects the cross-slot invariant. Public slot DTOs add viableLengths (25/50), computed against confirmed and unexpired pending intervals; the picker enables only viable durations. A stale read is rechecked inside the booking transaction. Tests include cross-slot contenders, 25-only viability, adjacency and expired overlapping holds.

### Retry recovery and abuse boundary
A retry by the same authenticated mentee for the same slot and duration returns their existing unexpired pending hold with 200, without changing its price or extending its expiry. New holds return 201. A different duration, owner, or confirmed booking remains a conflict. This recovers a committed reservation whose response was lost, without adding a booking-list API or revealing another user's identity. Use the existing rate limiter for a modest per-account request budget (20 attempts per 10 minutes, operational protection rather than a product booking quota); throttled requests return the existing 429 contract. Multi-account inventory abuse remains a named residual risk requiring later product controls, not assumed accepted by an owner.

## 📝 API Contracts
POST /api/bookings accepts {slotId: uuid, lengthMinutes: 25 | 50}, stripping unknown keys consistently with existing schemas. apiHandler enforces x-devmentor-request: 1, then requireSession and requireRole mentee. Service reparses and rechecks authorization. Return 201 with the standard envelope and an explicit DTO: id, slotId, mentorProfileId, lengthMinutes, priceCents, currency, status, startsAt, expiresAt. Do not expose another mentee, payment-session identifier or account data. Missing/removed slot: 404; inside two hours or unbookable mentor: 422 validation_failed; active occupancy: 409 conflict; no session: 401; wrong role/CSRF: 403. No GET/list, payment or cancellation endpoint.

## 📝 UI/UX
Keep the public mentor composition (prototype s1). Inject a colocated SlotPicker into the existing booking card with a shared SessionIsTextNotice: "Sessions are text. DevMentor makes no promise about how soon an answer arrives." Use native labelled slot/duration controls, shared buttons and feedback; display local date/time with timezone and both stored prices. Times inside two hours are disabled and explain why. The reserve action rechecks on the server; page eligibility is only a convenience. Signed-out selection navigates to /sign-in?returnTo=<encoded /m/slug?slot=id&length=25-or-50>; use the existing safe returnTo pipeline and restore selection after sign-in. No automatic write after authentication. Missing, invalid or vanished selection requires choosing again. Wrong-role viewers see that a mentee account is required. Disable duplicate submits, retain selection on failure and announce progress/errors/success accessibly. The shared notice also appears in mentor preview session descriptions through MentorPageView. Future session screens must reuse it. No payment button or fabricated payment success.

## 📝 Edge Cases & Failure Scenarios
Exactly two hours is allowed; one millisecond below is refused. Exactly expiresAt is expired. Two mentees racing get one 201 and one 409. Expired/cancelled history allows a fresh booking; confirmed history does not. Booking versus removal either removes first and refuses booking or books first and refuses removal. A mentor price changed after viewing is snapped at the current authoritative value; response displays that value. Forged price/currency/identity fields are stripped. Unpublish and price edits serialize with booking; a stale page is never authority. Database failures produce the existing error envelope and visible retry state. No provider call occurs and no confirmation is sent.

## 📝 Risks & Impact Review
This is risk-high because it adds schema, authorization and money snapshots. The existing threat model is extended, preserving threat IDs and recording planned controls and tests. Active-slot uniqueness is explicit rather than incorrectly claiming a permanent one-to-one relation. Existing slot removal now rejects an occupied slot with 409; document this additive business restriction in BACKWARD_COMPATIBILITY.md. No role, cookie, envelope, existing migration, environment or package dependency changes.

## 📝 Decisions in play
R01 25/50 minutes; R03 text sessions; R06 sign-in; R08/R21 mentor prices within approved PLN bounds; R14/D22 at least two hours and no speed promise; R15 bookedAt remains null until #41 confirms. D28 approved prices are reused unchanged. Owners remain the founders/operator recorded in product-brief.md. No active decision is superseded.

## Research
PostgreSQL partial indexes support a subset of rows, while index expressions must be immutable: https://www.postgresql.org/docs/current/indexes-partial.html and https://www.postgresql.org/docs/current/sql-createindex.html. Cal.com separates booking state from availability: https://github.com/calcom/cal.com/blob/main/packages/prisma/schema.prisma. Reuse only the state/history principle; recurring schedules, payment providers and calendar integrations add no value to this slice.

## Acceptance criteria
1. A mentee can reserve either duration at a server-computed, bounded mentor price for an active published slot at least 120 minutes ahead.
2. The public page disables nearer slots with a reason, displays price before reservation and always states text/no-speed-promise copy.
3. Signed-out selection returns to the same slot and duration after real test-adapter sign-in, without creating a reservation automatically.
4. Authorization, CSRF and invalid-input paths deny writes; client identity/price fields cannot control persistence.
5. Concurrent bookings have one winner; expired/cancelled history releases occupancy while remaining stored; booking/removal cannot both succeed.
6. Configured typecheck/lint/test/build, per-file 100% coverage and explicit npm run test:integration are executed and reported truthfully. Integration scenarios are linked Markdown deliverables with human review pending.

## 📋 Phasing
Phase 1 supplies the durable reservation contract, Phase 2 exposes it on the existing public page, and Phase 3 verifies the cross-boundary behavior. Each step leaves the application buildable; no payment capability is bundled.

## 📋 Implementation Plan
| Phase | Step | Title | Verification |
| --- | --- | --- | --- |
| 1 | 1.1 | Add booking entity and reversible migration | ORM discovery, migration up/down/up, entity tests |
| 1 | 1.2 | Add transactional booking service and occupancy-aware removal | Unit clock/auth/readiness/history/locking tests |
| 1 | 1.3 | Expose guarded booking route and DI | Route envelope, CSRF, role and schema tests |
| 2 | 2.1 | Add slot selection, sign-in return and shared session notice | Component/page/return selection tests, 320px and desktop QA |
| 3 | 3.1 | Add documented booking integration scenarios | Happy paths, validation, authorization, concurrent contenders; expired hold race, stale/forged prices, removal race |
| 3 | 3.2 | Complete coverage, compatibility and independent verification | Full configured gate, coverage, integration, review and QA evidence |

## 🔍 Architectural review
Fresh-context skeptical review found one high issue: same-slot uniqueness alone did not meet E02's cross-slot overlap invariant. The occupancy subsection now defines mentor serialization, half-open intervals, public viable lengths and additional tests. Two medium findings are resolved by matching-owner retry recovery and existing operational throttling with explicit residual multi-account abuse risk. Scope cohesion passed: reservation, truthful availability and occupied-slot removal form one capability.
