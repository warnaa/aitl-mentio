# Run: booking notifications and sessions (issue #42, E03-S04)

## Request
`/om-auto-fix-issue 42`: take issue #42 end to end. The issue is a feature request, so the feature route applied.

## Triage
- Feature, not a bug (`feature` label, new capability). Not implemented: no notification entity, service, route or consumer existed. No open PR referenced the issue; #41 (payments, dependency) is merged.
- Ticket-level Definition of Ready met (problem, who, outcome, out of scope, one non-blocking question).
- No covering spec, so one was written: `.ai/specs/2026-11-06-booking-notifications.md`.
- Finding that changed the design: #41 had already shipped `GET /api/bookings?role=`, `PaymentService.listMine` and `BookingsPanel` on `/home` and `/mentor`, and Stripe returns to `/home?booked=<id>`. The issue's `listForMentee`/`listForMentor`, new `GET /api/bookings` and `/sessions` pages were therefore not built; the spec records this (Q1).

## Work
- `Notification` entity, registration and reversible migration `Migration20261106153514_notifications` (up/down/up verified on a throwaway PostgreSQL 17; snapshot diff is additive).
- `NotificationService` (`onBookingConfirmed`, `listMine`, `markRead`), `booking-confirmed-mail`, `notificationReadSchema`; DI in `container.ts`/`cradle.ts`; subscriber on `bookings.booking.confirmed` in its own disposed scope.
- `GET`/`POST /api/notifications`.
- `BookingsPanel` split into Upcoming/Past via `split-sessions.ts`; `NotificationsPanel` on `/home` and `/mentor`; `/home?booked=<uuid>` marks the returned booking without claiming confirmation.
- `BACKWARD_COMPATIBILITY.md` additive entries; lessons; QA documents under `.ai/qa/NOTIFICATIONS/`.
- Integration scenarios NOTIFY-001..003 and SESSIONS-001 with a notification fixture; the booking fixture now deletes notifications before bookings.

## Files
Spec, entity + index, migration + test + snapshot, core service/mail/validator/DI/index and tests, app route, components, pages and tests, `vitest.config.mts` coverage entries, integration tests and fixtures, `BACKWARD_COMPATIBILITY.md`, `.ai/lessons.md`, `.ai/qa/NOTIFICATIONS/*`.

## Verification (all local, 2026-11-06)
- `npx tsc --noEmit`: clean.
- `npm run lint`: 0 errors (2 pre-existing warnings).
- `npm run test:unit:coverage`: 188 files, 1616 tests, 100% statements/branches/functions/lines.
- `npm run build`: passed.
- `npm run test:integration`: 45 files, 88 tests passed (815.9s), including the four new scenarios and the existing payment suite.
- `node scripts/check-agent-routes.mjs`: OK.
- Not done: desktop and 320px browser screenshots of the new panels; human QA review of the new QA documents is pending.

## Outcome
Implemented and verified locally on branch `issue-42`, uncommitted. Nothing was pushed, no PR opened, and the issue was not claimed or commented on, because `AGENTS.md` requires explicit approval for any remote write.

## Follow-ups
- Approval needed to commit, push, open the implementation PR (`Closes #42`, `Refs` the spec) and claim the issue; spec move to `implemented/` happens after merge.
- Residual risk (spec Q3): a crash between the payment commit and the consumer loses the notification; an outbox or backfill sweep is a separate story.
- The `.ics` invite question stays open and non-blocking.
