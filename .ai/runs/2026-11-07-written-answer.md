# Execution plan — the written answer (E04-S02, #46)

Source doc: .ai/specs/2026-11-07-written-answer.md
Spec PR: #76 (design-only)
Issue: #46

## Goal
The booking's mentor posts (and may replace) one plain-text written answer on `/sessions/[bookingId]` once the session has started; the mentee sees it there indefinitely, sees "The written answer is still owed." after the end while there is none, and is told once in the product and by email (never with the answer text).

## Scope
- `packages/db`: two nullable `bookings` columns with checks, widened `notifications.kind` check, reversible migration `written-answer`.
- `packages/core`: `answerUpdateSchema`, `TextSessionService.postAnswer` + `answer`/`answerOwed` on the read, `sessions.answer.posted` event, `NotificationService.onAnswerPosted` with an atomic email claim, `answerPostedMail`, container subscriber.
- `packages/app`: `PUT /api/sessions/[bookingId]/answer`, `SessionRoom` answer states, `NotificationsPanel` `answer_posted` item.
- `packages/ui`: `WrittenAnswer` owed copy as a prop.
- Tests (unit, route, component, integration), `BACKWARD_COMPATIBILITY.md`, run log.

## Non-goals
Notes (#47/#48), answer history or deletion, markdown, deadlines/reminders, polling after the end, operator access, changing `booking_confirmed` send logic.

## Implementation Plan
Phases and Steps follow the spec's Implementation Plan one-to-one.

## Risks
- Migration generation rewrites unrelated `.snapshot-devmentor.json` entries and adds a spurious `bookings_currency_check` (lessons 2026-11-05/06/07): keep only the new changes.
- The email claim must release on failure or the mentee is never emailed.
- `SessionRoom` must keep the answer editor at a stable tree position (lesson 2026-11-07).

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Storage and rules

- [x] 1.1 Booking answer columns, notification kind check, written-answer migration — 0c29387
- [x] 1.2 answerUpdateSchema, TextSessionService.postAnswer and read fields, sessions.answer.posted event — db3cc56

### Phase 2: Route and screen

- [x] 2.1 PUT /api/sessions/[bookingId]/answer route — bd3218c
- [x] 2.2 WrittenAnswer owed copy prop and story — 635cf49
- [x] 2.3 SessionRoom mentor editor and mentee answer states — c6068cf

### Phase 3: Telling the mentee

- [x] 3.1 NotificationService.onAnswerPosted, answerPostedMail, container subscriber — d167d2d
- [x] 3.2 NotificationsPanel answer_posted item — 3b3f406

### Phase 4: Verification

- [x] 4.1 Integration scenario and QA document — 8f5e89b
- [ ] 4.2 BACKWARD_COMPATIBILITY.md, run log, full gate, review
