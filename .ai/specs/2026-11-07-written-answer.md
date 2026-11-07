# The written answer: the mentor posts it on the session, the mentee keeps it there

## 📝 TLDR
Issue #46 (E04-S02) adds the deliverable of a 1.0 session (D05): one written answer per confirmed booking, posted by that booking's mentor on the existing `/sessions/[bookingId]` screen once the session has started, shown to the mentee on the same screen and kept there for good. After the session ends with no answer, the mentee sees that it is still owed. The first post tells the mentee in the product and by email. Everyone who is not the booking's mentor is refused.

## Resolved assumptions (autonomous defaults)
| Question | Choice | Reason |
| --- | --- | --- |
| Q1: may the answer be changed after it is posted (the ticket's open question)? | Yes: `PUT` replaces the body while the booking is confirmed; there is still one answer per booking, no history. `written_answer_at` is the time of the latest save and the screen labels it "Posted". Only the first successful notification reaches the mentee (Q7). | The ticket's "plain reading" is "one answer, replaceable until the note is approved"; notes (E04-S03) do not exist yet, so there is no lock to apply. A write-once answer would leave a mentor's typo permanent, which is harder to undo than a replace. A later story can freeze it when the note is approved. |
| Q2: when may the mentor post? | Window `open` or `ended`; before the start, 409 "You can post the written answer when the session starts." No closing deadline after the end. | The ticket says `open` or `ended`. A deadline is a product rule nobody has decided (it would need an owner); D03's "answerable" only asks that the answer can be given. |
| Q3: what does a caller who is not the booking's mentor get? | A stranger (including the mentor of a different session) and an unconfirmed or unknown booking get **404**, the same as the session read; the booking's **mentee** gets **403** "Only the mentor can post the written answer." | Keeps the text-session rule that a stranger cannot learn a booking exists (text-session spec Q2). The mentee already knows the booking, so 403 reveals nothing. The ticket's "another mentor 403" is met in substance ("refused"); switching the stranger case to 403 is a one-line change in the service. |
| Q4: where is the answer stored? | Two nullable columns on `bookings`: `written_answer text` and `written_answer_at timestamptz`, with a check that both are null or both are set. | The ticket names this, the answer is one-to-one with the booking, and it is additive (`BACKWARD_COMPATIBILITY.md` §3). A separate table would add a join and an entity for a single field. |
| Q5: the ticket names `session.service.ts` / `getForParty` | Extend `TextSessionService` (`text-session.service.ts`): add `postAnswer` and add `answer`/`answerOwed` to `getForParticipant`. | `SessionService` means authentication in `core` (`.ai/lessons.md`, 2026-11-07); E04-S01 shipped `TextSessionService`. |
| Q6: format and limits of the answer | Plain text, rendered with preserved line breaks (no markdown, no HTML); 1–20,000 characters after trim, `\r\n` normalised, NUL rejected; 30 saves per account per minute. | The ticket gives 1–20,000. Markdown would be a new rendering surface with sanitising risk; plain text matches the transcript. The rate limit mirrors the message-post policy. |
| Q7: how is the mentee told? | A new notification kind `answer_posted`: at most one row per booking (the existing unique index) and one successfully sent email through the `Mailer` port, linking to `/sessions/{bookingId}`. Neither contains the answer's text. Every save emits the event; the row and an atomic email claim make repeats harmless, and a save after a failed email retries it. | The ticket asks for "in product and by email through the mailer port". Emitting only on the first save would lose the email for good if that one send failed. The answer is private free text (R02, R19), so it never goes into an email. |
| Q8: may the mentee see an answer posted before the session ends? | Yes, as soon as it is saved. | Hiding a saved answer until `endsAt` adds a rule nobody asked for; the ticket's "after the session" describes when it is normally written. |
| Q9: does the ended screen poll for the answer? | No. Polling still stops at the end; the notification and email link to the session, and opening or reloading it shows the answer. | Least change to the E04-S01 polling contract and load. A mentee who keeps an ended tab open learns of the answer from the notification. |

## 📝 Problem Statement
D05 makes the written answer what a 1.0 session produces, and D03's bar for the first iteration is an "answerable" session. The mentee interviewed on 2026-08-20 wants an answer they can act on and keep. Today the session screen (E04-S01) ends with a `WrittenAnswer` card permanently in its `owed` state: nothing stores an answer, the mentor has nowhere to write it, and the mentee cannot tell whether one is coming.

## Goal
The booking's mentor can post (and correct) one plain-text written answer from the session screen; the mentee sees it on the same screen indefinitely, is told when it first arrives, and sees "still owed" after the end while there is none.

## Non-goals
- Session notes and their approval (E04-S03/S04, #47/#48); freezing the answer when a note is approved.
- Answer history, versions, deletion, attachments, markdown or rich text.
- A deadline for the answer, reminders to the mentor, refunds or disputes over a missing answer (E03-S05, E05-S03).
- Publishing anything (R02); operator access to answers.
- Polling or push for the answer after the session ended (Q9).
- Changing booking, payment, role or cookie contracts beyond the additive fields below.

## 📝 Proposed Solution
The answer is two columns on the booking. `TextSessionService` already decides "is this caller a party to a confirmed booking, and where is now relative to its window"; it gains a mentor-only `postAnswer` and returns the answer in the read it already serves. A `PUT` route exposes the write. The existing `SessionRoom` renders an answer editor for the mentor and the answer (or the owed state) for the mentee. Every save emits `sessions.answer.posted`; a container subscriber hands it to `NotificationService`, which records one in-product notification and sends one email to the mentee, reusing the `booking_confirmed` machinery.

Alternatives that lost: a `written_answers` table (an entity and a join for one field, with nothing else to hang on it yet); write-once answers (Q1); sending the answer by email (private content leaves the product, R02/R19); a separate `/sessions/[id]/answer` page as in prototype s8 (a second screen and route to keep in sync, when the session screen already has the card; s8's card is reused in place).

## 📝 Architecture
- **Concept `sessions`**, existing files extended: `packages/core/src/services/sessions/text-session.service.ts` (`postAnswer`, read fields), new `packages/core/src/validators/sessions/answer-update.schema.ts`, new `packages/app/src/app/api/sessions/[bookingId]/answer/route.ts`, the existing `SessionRoom.tsx`.
- **`postAnswer(bookingId, input)`** — gate order: signed in (401) → uuid (422) → confirmed booking where the caller is a party (else 404, reusing `party()`) → caller's role is `mentor` (else 403 `ForbiddenError`) → rate limit `{ scope: 'session-answers', kind: 'account', limit: 30, windowMs: 60000 }` (429; consumed after the party check like the message policy) → body validation (422) → window from one `clock.now()` read: `not_started` → 409 → one statement, `nativeUpdate(Booking, { id, status: 'confirmed' }, { writtenAnswer, writtenAnswerAt: now, updatedAt: now })`; zero rows affected (cancelled between the read and the write) → 404. Then emit `sessions.answer.posted { bookingId }`. The DTO `{ body, postedAt }` is built from the validated input and `now` (the `nativeUpdate` bypasses the identity map, so the loaded booking is stale). `TextSessionServiceDeps` gains `eventBus: Pick<EventBus, 'emit'>`.
- **Concurrent saves.** Last write wins on the body; there is no first-post detection in the service. Repeated events are made harmless on the notification side (below).
- **Read.** `getForParticipant` adds `answer: { body, postedAt } | null` (both roles; `postedAt` is the latest save) and `answerOwed: window === 'ended' && answer === null`. There is no "edited" flag: that would need a third column for the first-post time, and nothing in the brief asks for it.
- **Event.** `packages/core/src/events/event-map.ts` gains `'sessions.answer.posted': { bookingId: string }` — no body, no user ids. `container.ts` registers a subscriber in its own system scope, exactly like `bookings.booking.confirmed`, calling `notificationService.onAnswerPosted(bookingId)`. `EventBus.emit` awaits handlers but logs and swallows a failure, so a mail outage never fails the save; it can slow the `PUT` by the mail call's duration, which is accepted (the confirmed-booking path has the same property).
- **Notification.** `onAnswerPosted` loads the booking (confirmed and answer not null, else log and return), records one `answer_posted` row for the mentee through the existing idempotent `record()` (generalised to take the kind), then **claims** the email atomically: `nativeUpdate(Notification, { id, emailSentAt: null }, { emailSentAt: now })`; only the call that changed one row sends `answerPostedMail`, and a failed send resets `emailSentAt` to null (logged without address or body) so the next save retries it. Concurrent or repeated events therefore send at most one successful email. The mentor gets no notification. `booking_confirmed` keeps its current send logic (out of scope). `toDto` adds `sessionPath: '/sessions/{bookingId}'` for every kind so the panel can link to the session.
- **Reused, not invented:** `party()`, `parseWith`, `rateLimiter.consumeFor`, `apiHandler` (CSRF enforced there; routes never call `requireCsrfHeader`), `CrudForm` with `method: 'PUT'`, the `WrittenAnswer` ui card, `Mailer`, `plainName`.

## 📝 Data Model
- `bookings.written_answer text null`, `bookings.written_answer_at timestamptz null`, check `bookings_written_answer_pair_check`: `(written_answer is null) = (written_answer_at is null)`. Length is enforced by the validator, plus a check `char_length(written_answer) <= 20000` as a backstop.
- `notifications.kind` check widens to `kind in ('booking_confirmed', 'answer_posted')`.
- One reversible migration `written-answer` (`npm run db:migration:create -- --name written-answer`). Keep only the new columns and the two check changes; restore unrelated `.snapshot-devmentor.json` churn and drop spurious `bookings_currency_check` lines (`.ai/lessons.md`, 2026-11-05/06/07). The down migration deletes `answer_posted` notification rows before narrowing the check, then drops the columns.
- Sensitive data: the answer is free text that may quote the mentee's code (R19). It is returned only to the booking's two parties, never logged, never in events or emails, rendered as text. Kept indefinitely with the booking (D05 "kept"). Rolling back drops every answer; the PR body must say so.

## 📝 API Contracts
- `GET /api/sessions/[bookingId]` — unchanged gates; `data` gains `answer: { body: string; postedAt: string } | null` and `answerOwed: boolean`. Additive (`BACKWARD_COMPATIBILITY.md` §1).
- `PUT /api/sessions/[bookingId]/answer` — new. `apiHandler`; body `{ body: string }` validated by `answerUpdateSchema` (trim, normalise `\r\n`, 1–20,000, no NUL, unknown keys stripped). 200 `{ ok, data: { body, postedAt } }`; 401; 403 `forbidden` (the booking's mentee); 404 `not_found` (stranger, other mentor, unknown or unconfirmed booking); 409 `conflict` before the start; 422; 429 with `retryAfterSeconds`; missing CSRF header rejected by `apiHandler`.
- `GET /api/notifications` — items gain `sessionPath`; `kind` may be `answer_posted`. Additive.
- Event `sessions.answer.posted { bookingId }` — new (§6).

## 📝 UI/UX
All on `/sessions/[bookingId]` below the transcript, where the `WrittenAnswer` card already sits; prototype s8's card content is reused in place.

- **Mentee, answer saved (any window):** `WrittenAnswer state="posted"` with "From {mentor}", the body as text with preserved line breaks (`whitespace-pre-wrap break-words`), and `publishedLabel` "Posted {local date and time}".
- **Mentee, ended and no answer:** `WrittenAnswer state="owed"` with the callout "The written answer is still owed." (the card's callout copy becomes a prop with this default for the mentee).
- **Mentee, not ended and no answer:** no card (unchanged from E04-S01).
- **Mentor, `open` or `ended`:** a card "Written answer for {mentee first name}" holding a `CrudForm` (`method: 'PUT'`, schema `answerUpdateSchema`, one textarea labelled "Written answer", initial value = the saved answer), submit "Post written answer" or, once saved, "Update written answer"; hint "{Mentee first name} sees it on this page as soon as you post it." Under the form, the saved answer is previewed with the same `WrittenAnswer` posted card. A 409/403/422 shows the server message and keeps the draft. Success shows "Written answer saved." in a status region and updates the preview without a reload.
- **Mentor:** the existing E04-S01 `owed` card rendered with `mentorName="you"` is replaced by the states below, never shown beside them.
- **Mentor, `not_started`:** the owed card's text reads "You can post the written answer when the session starts." No form.
- The editor keeps a stable position in the tree so a window change under it never remounts it empty (`.ai/lessons.md`, 2026-11-07).
- `NotificationsPanel` renders `answer_posted` as "{Mentor} posted the written answer for your session on {local start}." with a "Read the written answer" link to `sessionPath`. `booking_confirmed` items render as before.
- Every state keeps the sessions-are-text and R19 notices (unchanged). Accessibility: the textarea has a visible label; status changes are announced via `role="status"`.

## 📝 Edge Cases & Failure Scenarios
- Mentee `PUT` → 403, nothing stored. Mentor of another booking `PUT` → 404, nothing stored, no existence revealed.
- `PUT` before `startsAt` → 409; at exactly `startsAt` → allowed; long after `endsAt` → allowed.
- Booking cancelled or expired → 404 for both roles; any saved answer becomes unreachable until a cancellation story defines access (residual risk inherited from E04-S01).
- Second save → body replaced, `postedAt` moves; the event fires again but finds the row and a sent email, so nothing new reaches the mentee.
- Two concurrent saves → last body wins; both events race on the row (unique index) and the email claim, so one row and one email.
- Mail provider down → the save succeeds, the row exists, the claim is released (`emailSentAt` null), logged without address or body; the mentor's next save retries the email. If the mentor never saves again, the mentee still has the in-product notification.
- Whitespace-only, 20,001 characters, or NUL → 422; `<script>` is stored and shown as text.
- Mentee leaves an ended tab open while the mentor posts → sees it after reload or through the notification (Q9).
- A user who is mentee of this booking and mentor of another can post only on the other.

## 📝 Risks & Impact Review
Additive: two columns, a widened check, one route, one event, additive DTO fields. `BACKWARD_COMPATIBILITY.md` gets entries for §1 (route, DTO fields), §3 (columns, check) and §6 (event). `risk-medium`, `needs-qa`. Rollback order: run the down migration first (it deletes `answer_posted` rows, so older code never renders them as booking confirmations), then revert the code; answers and `answer_posted` notifications are lost (stated in the PR body). Residual risks: answers can be silently replaced after the mentee read them (Q1; the timestamp moves), private code in plaintext rows (as for messages), no deadline or reminder for an owed answer.

## 📝 Decisions in play
- **D05** 1.0 delivers the written answer (this spec) and a privately kept note (not here). **D03** the first iteration leaves an answerable session.
- **R02** nothing is published; the answer is visible to the two parties only and never emailed.
- **R03** sessions are text (notices unchanged). **R19** the screen keeps the share rule; the answer may quote shared code and is treated as private.
- **D13** first-iteration story. No active decision is superseded; Q1 records the ticket owner's open question (founder A) as answered by default and overridable.

## Acceptance criteria
1. Given a held session (window `open` or `ended`), when its mentor posts the written answer, then the mentee sees it on `/sessions/[bookingId]` and receives one `answer_posted` notification and one email (however many times the answer is saved) linking to the session, neither containing the answer text. (D05)
2. Given a session with no written answer after its end, when the mentee opens it, then the screen says "The written answer is still owed." and the read returns `answerOwed: true`. (negative; D03)
3. Given a posted answer, when the mentee opens the session weeks later (clock advanced), then the same answer is shown and returned by the read. (D05)
4. Given the mentor of a different session, when they `PUT` an answer to this one, then they get 404 and nothing is stored; the booking's mentee gets 403; a signed-out caller gets 401; a missing CSRF header is rejected. (data scoping; negative)
5. Given a save before `startsAt`, then 409; invalid bodies get 422; the 31st save in a minute gets 429.
6. Given a second save, then the body is replaced and no second notification or email is sent.
7. Typecheck, lint, unit tests with per-file 100% coverage for new and changed files, build and the new integration scenario pass, reported truthfully; desktop and 320px screenshots of the mentor editor, the mentee posted card and the owed card.

## 📋 Phasing
Phase 1 delivers storage and rules (nothing visible, unit-tested). Phase 2 exposes the route and the screen. Phase 3 tells the mentee. Phase 4 verifies across the app/db boundary. Each step leaves the gate green and adds the files it creates to `coverage.include` in `vitest.config.mts` in the same commit.

## 📋 Implementation Plan
| Phase | Step | Title | Verification |
| --- | --- | --- | --- |
| 1 | 1.1 | Add `writtenAnswer`/`writtenAnswerAt` and the pair check to `Booking`; widen the `Notification.kind` check; generate the reversible `written-answer` migration and its test | Migration up/down/up; entity tests; snapshot churn restored |
| 1 | 1.2 | Add `answerUpdateSchema`; `TextSessionService.postAnswer` (single conditional `nativeUpdate`, `eventBus` dep, emit on every save) and the `answer`/`answerOwed` read fields; `sessions.answer.posted` in `EventMap`; DI wiring | Unit tests: mentor ok in open and ended, 409 before start, mentee 403, stranger/other mentor/unconfirmed 404, booking cancelled before the write 404, 401, rate limit order, normalisation and 422s, second save replaces and emits, owed flag per window |
| 2 | 2.1 | Add `PUT /api/sessions/[bookingId]/answer` | Route tests: envelope, 200, 401, 403, 404, 409, 422, 429, CSRF |
| 2 | 2.2 | `WrittenAnswer`: owed copy as a prop (default unchanged), story for the "still owed" variant | Component test and story |
| 2 | 2.3 | `SessionRoom`: mentor editor (`CrudForm` PUT, stable position), mentee posted/owed card, not-started mentor copy | Client tests: each role × window, draft kept on error, preview updates on success, no remount when the window ends; desktop and 320px screenshots |
| 3 | 3.1 | `NotificationService.onAnswerPosted` with the atomic email claim, `answerPostedMail`, `record()` takes a kind, `sessionPath` in the DTO; subscriber in `container.ts` | Unit tests: one row and one email across repeated events, a failed send releases the claim and the next event retries, mail failure logged without address or body, no row for an unconfirmed booking or a null answer, mentor gets nothing; email text has no answer body |
| 3 | 3.2 | `NotificationsPanel` renders `answer_posted` with its link | Component test |
| 4 | 4.1 | Extend `tests/integration/session.integration.test.ts`: mentor posts, mentee reads after a clock advance, other mentor 404, mentee 403, owed state, `mail.sent` line for the mentee; QA document | Integration run; fixture logins ≤ 39 characters |
| 4 | 4.2 | `BACKWARD_COMPATIBILITY.md`, run log, full configured gate, independent review | `npm run typecheck`, `lint`, `test`, `build`, `test:unit:coverage`, `test:integration` reported truthfully |
