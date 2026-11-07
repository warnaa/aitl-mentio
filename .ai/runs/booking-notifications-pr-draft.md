Closes #42
Tracking plan: .ai/runs/2026-11-06-booking-notifications.md
Source doc: .ai/specs/2026-11-06-booking-notifications.md
Status: implementation complete; manual QA pending

## 🎯 Goal
Tell the mentor and the mentee about a confirmed booking (in the product and by email) and show each role its sessions as Upcoming and Past.

## What Changed
- `notifications` table (unique per user, kind and booking) with a reversible migration; `NotificationService` consumes `bookings.booking.confirmed`, writes one row and sends one email per participant. Replays are idempotent, unconfirmed bookings send nothing, and one party's failed email does not block the other.
- `GET`/`POST /api/notifications`, scoped to the signed-in user; foreign ids are ignored.
- Reuses #41's `GET /api/bookings?role=` instead of adding a second list (the issue predates #41). `BookingsPanel` now shows Upcoming and Past; both role homes show a notifications panel with an unread line; `/home?booked=<uuid>` only marks the returned booking.
- Spec, compatibility notes, lessons, QA documents and run log are included.

## 🧪 Tests
- `tsc` clean, lint 0 errors, build passes, unit tests 1616 passing at 100% per-file coverage.
- `npm run test:integration`: 45 files, 88 tests passing, including NOTIFY-001..003 and SESSIONS-001.
- Not done: desktop and 320px screenshots of the new panels; human review of the new QA documents.

## 💥 Breaking Changes
None. Additive table, routes and event consumer; the event payload is unchanged. Rollback: stop the consumer, then drop `notifications`.

## 📋 Decisions touched
R03 (sessions are text; the notice stays on the sessions panel and in the email), D22 (start shown is the slot's start), R14 (no speed promise). No active decision is superseded.

## Known gap
The event bus is in-process: a crash between the payment commit and the consumer loses that notification. An outbox or backfill sweep is a separate story.
