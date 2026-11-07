# Telling both parties about a confirmed booking and sorting their sessions

## 📝 TLDR
Issue #42 (E03-S04) makes a confirmed booking visible to both people. When `bookings.booking.confirmed` fires, the mentor and the mentee each receive one in-product notification and one email (start, length, the other party's display name). Each role's existing sessions list is sorted into **Upcoming** and **Past**, and each role home shows an unread-notifications line. Nothing is sent for a booking that is not confirmed.

## Resolved assumptions (autonomous defaults)
| Question | Choice | Reason |
| --- | --- | --- |
| Q1: the issue asks for new `listForMentee`/`listForMentor` methods, `GET /api/bookings` and `/sessions` pages | Reuse what #41 shipped: `PaymentService.listMine(role)`, `GET /api/bookings?role=mentee\|mentor` and `BookingsPanel` on `/home` (mentee, "My sessions") and `/mentor`. Add only the Upcoming/Past grouping. | The issue was written before #41 landed. A second scoped list would duplicate the owner-scoping that is already tested and protected by `BACKWARD_COMPATIBILITY.md`. Stripe's `successUrl` already returns to `/home?booked=<id>`, so `/home` is the mentee sessions page. |
| Q2: the issue says `student` | Use the repository's `mentee` role. | `student` is not a role here (same resolution as the booking-flow spec). |
| Q3: durability of the in-product record | The subscriber writes both rows first, in one idempotent step, then sends email. A crash between the payment commit and the subscriber still loses the notification; this is recorded as a residual risk, not solved with an outbox. | `BACKWARD_COMPATIBILITY.md` already states that the in-process bus offers no durable delivery. An outbox or backfill sweep is a separate, independently deployable change. |
| Q4: email transport | Use the existing `Mailer` port; production already has `ResendMailer`. No new adapter. | The issue's "a real adapter is needed" is satisfied by E01-S02. |
| Q5: open question about `.ics` calendar invites | Out of scope; non-blocking per the ticket. | No decision record asks for it. |
| Q6: reading a notification | A single `POST /api/notifications` marks a bounded set of the caller's own ids read; foreign or unknown ids are ignored without revealing existence. | Matches the "never trust a client user id" rule; idempotent and safe to retry. |

## 📝 Problem Statement
A mentor can be away from the product when a booking arrives, and a mentee needs a place to find the session. Today a payment confirmation changes a booking row and emits an event that nobody consumes: no one is told, the sessions list is one flat newest-first list, and the role homes do not say anything has changed.

## Goal
On confirmation, tell each participant once, in the product and by email, and let each role see upcoming sessions apart from past ones, scoped to the signed-in caller.

## Non-goals
- Reminders before the start, cancellation or refund notices (E03-S05 emits its own event), `.ics` invites, push or SMS.
- A durable outbox, retry sweep or backfill for notifications lost to a process crash.
- New `/sessions` routes or a second bookings list endpoint (see Q1).
- Notifying about pending, unpaid or expired bookings.
- Changing booking, payment, role or cookie contracts.

## 📝 Proposed Solution
Add a `Notification` record and a `NotificationService`. A subscriber registered in the container's `build()` listens for `bookings.booking.confirmed`, creates one notification per participant (idempotently), then emails each participant through the `Mailer` port. Two session-scoped endpoints expose the caller's notifications and mark them read. The existing `BookingsPanel` groups the already-scoped booking projection into Upcoming and Past, and a small `NotificationsPanel` on both role homes shows the unread line and the messages.

## 📝 Architecture
- **Trigger.** `PaymentService.emitConfirmed` already emits `bookings.booking.confirmed` after the confirmation transaction commits. The subscriber runs in its own awilix scope (`container.createScope()`), not the request scope, and is disposed in `finally`. `EventBus.emit` logs and swallows handler errors, so a failing notification never fails the payment webhook.
- **Gate.** `NotificationService.onBookingConfirmed(bookingId)` loads the booking with mentee and mentor user. A missing booking, or any status other than `confirmed`, writes nothing and sends nothing (the negative criterion). Pending and expired bookings are never even a subscription target because only the confirmation path emits.
- **Idempotency.** A unique index on `(user_id, kind, booking_id)` makes a replayed event (webhook retry plus reconcile both reaching `emitConfirmed`) create each row once. A unique-violation on insert is treated as "already exists". Email is sent only for a row whose `emailSentAt` is null, and `emailSentAt` is set after the provider accepted the message, so a replay never double-mails and a failed send can be retried by a later replay.
- **Failure isolation.** The two parties are independent: a failed send to one is logged (no address or body in the log) and does not prevent the other's send. The in-product row exists regardless of email success.
- **Privacy.** Emails and notifications carry the *other party's display name* only, never their address. The email subject is a fixed string; names appear only in the body, with control characters stripped.
- **Scope of reads.** `NotificationService.listMine()` and `markRead(ids)` authenticate from the live scoped `session` and filter on `user = session.userId`; the client never supplies a user id. Any signed-in role may read its own notifications.

## 📝 Data Model
`notifications`: `id`, `created_at`, `updated_at` (base), `user_id` → `users` (no action), `booking_id` → `bookings` (no action), `kind` (`booking_confirmed`, check constraint), `read_at` nullable, `email_sent_at` nullable. Unique index `notifications_user_kind_booking_unique (user_id, kind, booking_id)`; index `notifications_user_created_index (user_id, created_at)` for the bounded newest-first read. Additive, reversible migration generated through the repository CLI and verified up/down/up on ephemeral PostgreSQL. No existing rows change. Rollback: stop the subscriber, then drop the table; notifications are derived and can be regenerated only for future events.

## 📝 API Contracts
- `GET /api/notifications` — requires a session (401 otherwise). Returns the envelope `{ ok, data: { unreadCount, items } }` where `items` is at most 50, newest first: `{ id, kind, audience: 'mentee'|'mentor', counterpartName, startsAt, lengthMinutes, readAt, createdAt }`. No emails, user ids or payment data.
- `POST /api/notifications` — body `{ ids: uuid[] }` (1–50, unknown keys stripped); standard `x-devmentor-request` CSRF header via `apiHandler`; marks only the caller's own unread rows read; answers `{ updated: n }`. Foreign or unknown ids update nothing and are indistinguishable from already-read ones.
- `GET /api/bookings?role=` is unchanged (owner-scoped by #41). It remains the only sessions list.

## 📝 UI/UX
- `BookingsPanel` renders **Upcoming** (start in the future and status pending or confirmed, soonest first) and **Past** (everything else, newest first) as two labelled sections with their own empty copy; each card keeps start, length, counterpart, price and status. The section split uses the browser clock and is presentation only. The shared `SessionIsTextNotice` stays on the panel (R03).
- `NotificationsPanel` (shared by both homes, so it lives in `components/notifications/`) shows a heading, an unread line ("You have 2 unread notifications" / "No unread notifications"), the messages ("Your session with Alex is confirmed: <local time>, 25 minutes." / "Sam booked a 25-minute session with you: <local time>."), and a "Mark all as read" button that is disabled when nothing is unread and while a request is in flight. Loading and error states reuse `ResourcePanel`. The start time is the slot's start (D22). It is rendered above the sessions panel, which carries the R03 text-session notice.
- `/home` reads `?booked=<uuid>` (validated server-side; anything else is ignored) and shows a short, non-confirming note beside the matching booking: "You returned from Checkout for this session." plus the booking's real status line. It never claims confirmation on its own.
- Mentor and mentee homes both render the panel. No new navigation entries.

## 📝 Edge Cases & Failure Scenarios
- The same event delivered twice → still exactly one notification and one email per party.
- Mail provider down for the mentee only → the mentee row exists with `emailSentAt` null, the mentor is still mailed; logged, no thrown error.
- Booking row deleted or not confirmed between emit and handling → nothing written.
- A mentor who is also a mentee of another booking sees each notification with the right `audience`.
- Mentor A cannot read, list or mark mentor B's notifications or bookings (isolation tests at service and integration level).
- `?booked=` with a non-uuid, an unknown id or another user's id → ignored; no existence is revealed because the list is already scoped.
- A user whose display name contains newlines or markup → stripped in email; React escapes it in the product.
- Process crash after the payment commit but before the subscriber runs → no notification. Residual risk, see Q3.

## 📝 Risks & Impact Review
`risk-medium`: one additive table and two additive routes, one new subscriber on an existing event, no change to protected contracts. Residual risks: lost-on-crash notifications (named, not solved), email address exposure in logs (mitigated: the log line carries no address or body), and alert fatigue is not a concern at one notification per party per booking. `BACKWARD_COMPATIBILITY.md` gains an additive entry for the table, the routes and the consumer of `bookings.booking.confirmed`.

## 📝 Decisions in play
R03 sessions are text (notice stays on the panel); D22 the displayed start is the slot's start; R14 makes no speed promise (emails say so). No active decision is superseded. Owner: founder A.

## Acceptance criteria
1. Given a booking confirmed through payment, then the mentor and the mentee each have one in-product notification and each receives one email containing start, length and the other party's display name; replaying the event creates no duplicates.
2. Given a booking that was never confirmed (pending, expired or cancelled, or missing), then no notification row exists and no email is sent.
3. Given a mentee or a mentor, when they open their sessions, then Upcoming and Past sessions appear in separate sections with start, length, counterpart and status.
4. Given mentor A and mentor B, then A's sessions list and notifications never contain B's booking (service and integration level).
5. Given an unreadable or failing mailer, then the in-product notification still exists, the other party is still mailed, and the payment confirmation is unaffected.
6. Given a signed-in user, when they mark notifications read, then only their own ids change and foreign ids are silently ignored; signed-out requests get 401 and a missing CSRF header is rejected.
7. Both role homes show an unread-notifications line that updates after "Mark all as read"; `/home?booked=<id>` highlights the matching booking without claiming confirmation.
8. Typecheck, lint, unit tests with per-file 100% coverage, build and the new integration scenarios pass, reported truthfully.

## 📋 Phasing
Phase 1 delivers the durable record and the confirmed-booking consumer; Phase 2 exposes and shows it; Phase 3 verifies across the boundary. Each step leaves the application buildable.

## 📋 Implementation Plan
| Phase | Step | Title | Verification |
| --- | --- | --- | --- |
| 1 | 1.1 | Add `Notification` entity, registration and reversible migration | ORM discovery, migration up/down/up, entity and migration tests |
| 1 | 1.2 | Add `NotificationService` (consumer, list, mark read), mail copy and DI + subscriber | Unit tests: confirmed only, idempotency, per-party failure isolation, scoping, mark-read ownership |
| 2 | 2.1 | Add `GET`/`POST /api/notifications` and validators | Route envelope, CSRF, 401, bounds and strip tests |
| 2 | 2.2 | Group `BookingsPanel` into Upcoming/Past, add `NotificationsPanel`, wire both homes and `?booked=` | Component and page tests, 320px and desktop QA |
| 3 | 3.1 | Add integration scenarios and QA documents | Confirmation notifies both once; unconfirmed sends nothing; mentor isolation; mark-read ownership |
| 3 | 3.2 | Coverage, compatibility notes, independent verification | Full configured gate, `test:unit:coverage`, `test:integration`, review |
