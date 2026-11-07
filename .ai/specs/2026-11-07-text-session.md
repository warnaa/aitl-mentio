# The text session: a screen where the two parties of a confirmed booking exchange text

## 📝 TLDR
Issue #45 (E04-S01) adds the session screen. At a confirmed booking's start, the mentee and the mentor open `/sessions/[bookingId]` and post plain text to each other until `startsAt + lengthMinutes` (25 or 50 minutes). Nobody else can read or write it. After the end the exchange stays readable and closed to new messages, and the screen shows that the mentor's written answer is still to come (E04-S02 owns posting it). Every state of the screen says that sessions are text (R03) and carries the rule on what to paste (R19). The exchange lives inside DevMentor (R20, D27), polled rather than pushed.

## Resolved assumptions (autonomous defaults)
| Question | Choice | Reason |
| --- | --- | --- |
| Q1: where does the text exchange live (the ticket's Q18)? | Inside DevMentor, on a session screen. | R20/D27 are active and `product-brief.md` marks Q18 resolved; the ticket itself names this as its plain reading. |
| Q2: what does a user who is not a party to the booking get? | `404 not_found` from the API and `notFound()` from the page, the same answer as for an unknown booking. | Repository precedent (`startCheckout`, `listMine`) scopes by owner and throws `NotFoundError`, so a foreign booking is indistinguishable from a missing one. The ticket's "refused" is met; `ForbiddenError` would reveal that the booking exists. Switching to 403 is a one-line change in the service. |
| Q3: can the parties open the screen before the start? | Yes, read-only: the screen shows the start time and a disabled composer; posting is refused with 409 until `startsAt`. | Avoids a dead link from the sessions lists and lets a mentor check the booking; the ticket only forbids posting outside the window. |
| Q4: how do new messages appear? | The page polls `GET /api/sessions/[bookingId]` every 5 seconds while the tab is visible and the session is not ended. | `AGENTS.md` records no websocket or worker; polling reuses `apiCall`. A push channel can replace it later without a contract change. |
| Q5: can the operator read a session? | No. Only the two parties can. | The ticket says "visible to no one else". D27 links the exchange to disputes; E05-S03 (#51) will have to define operator read access and must supersede this explicitly. |
| Q6: what is shown after the end about the written answer? | A read-only transcript plus the existing `WrittenAnswer` card in its `owed` state. No link, no new route. | E04-S02 (#46) owns posting and showing the answer. The session closes only to chat messages, so nothing here blocks the answer from being posted afterwards. |
| Q7: the ticket does not mention R19, the "Paste only what you are allowed to share" rule. | The session screen shows the R19 sentence verbatim beside the composer. | R19 is an active business rule that names "the session screen" explicitly; omitting it would be a review blocker under `SDLC.md`. |
| Q8: message limits | 1 to 4,000 characters after trim, 30 posts per account per minute, 120 reads per account per minute, and the read returns the newest 500 messages in time order with a `truncated` flag (the screen then says "Earlier messages are not shown."). | 4,000 is the prototype's validation; the limits bound abuse and payload size without new infrastructure. Raising them is a constant change. |
| Q9: attachments, edit, delete, read receipts, typing indicators, markdown | Not built. | Out of the brief; least new surface. Bodies are plain text, rendered as text. |
| Q10: duplicate posts from a retried request | Accepted as a residual risk: the composer disables while a post is in flight, and there is no idempotency key. | A duplicated line in a private two-person chat is cosmetic; a key would add a public request field. |

## 📝 Problem Statement
The mentee interviewed on 2026-08-20 wants an answer, not a course, and said "text is fine, faster". N01 rules out video and R03 makes every session screen say sessions are text. Today a confirmed booking is only a row and two sessions lists: nothing in the repository holds what the two people say to each other, and the sessions lists link nowhere. Without a screen, the product cannot honour a prepaid, timed session, and the later stories (written answer, note, disputes) have nothing to attach to.

## Goal
Give the two parties of a confirmed booking a private, time-boxed place to exchange plain text, scoped by the booking, with the window computed on the server.

## Non-goals
- Video, audio, calls, or any real-time transport (N01, `AGENTS.md`).
- The written answer (E04-S02, #46), session notes (E04-S03/S04, #47/#48), file attachments, formatting, edit/delete, read receipts, typing indicators.
- Operator access to sessions and dispute handling (E05-S03, #51); any publication of session content (R02).
- Cancellation, refunds, no-show settlement (E03-S05, #43).
- Notifying a party of a new message (not in the brief; a message is seen on open or on the next poll).
- A durable outbox or idempotency key for posts (Q10).
- Changing booking, payment, role or cookie contracts.

## 📝 Proposed Solution
Add a `SessionMessage` record and a `TextSessionService` (the name `SessionService` and the Cradle key `sessionService` already belong to authentication, and `packages/ui` already exports a presentational `SessionMessage` type from `WrittenAnswer.tsx`; the entity keeps its name and the ui type stays a separate, view-only shape). The service decides one question for every call: is this user a party to a **confirmed** booking, and where is "now" relative to the booking's window? Two routes expose it (read the session; post a message). One server-guarded page renders it; its client part polls the read route. The window is derived, never stored: `endsAt = startsAt + lengthMinutes`, `open` when `startsAt <= now < endsAt`.

Alternatives that lost: a `sessions` table with explicit `open`/`ended` states (two sources of truth that drift from `startsAt`, and a job to flip them, which the repository does not have); websockets or server-sent events (no long-lived process exists); a conversation entity above the booking (the booking already is the conversation, one-to-one).

## 📝 Architecture
- **Concept `sessions`** in every layer: `packages/db/src/entities/sessions/session-message.entity.ts`, `packages/core/src/services/sessions/text-session.service.ts`, `packages/core/src/validators/sessions/`, `packages/app/src/app/api/sessions/[bookingId]/...`, `packages/app/src/app/sessions/[bookingId]/page.tsx`. The service is registered in `container.ts` as `textSessionService` and typed on `Cradle`, scoped, with deps `{ em, session, clock, rateLimiter }`.
- **Party check, per booking.** The caller is the mentee when `booking.mentee.id === session.userId`, the mentor when `booking.mentorProfile.user.id === session.userId`, otherwise a stranger. Roles alone are not enough: one user can be mentee on one booking and mentor on another. `assertOwnership` covers a single owner and is not used for a two-party check; the service uses the same scoped-lookup-then-`NotFoundError` pattern as `PaymentService.startCheckout`.
- **Gate order** for both operations: signed in (401) → id is a uuid (422) → booking exists and `status === 'confirmed'` → caller is a party (else 404 for all three of: missing, unconfirmed, stranger) → rate limit consumed (429; only after the party check, so a stranger never sees 429 and cannot burn another user's budget) → body validation (422, POST) → window rules (409, POST). If one user is both mentee and mentor of the same booking, the mentee role takes precedence.
- **Window.** `getWindow(booking, now)` returns `not_started | open | ended` with `endsAt`; `now` comes from the injected `Clock`. The server also returns `serverNow` so the browser never judges the window from its own clock. Boundaries: exactly `startsAt` is open; exactly `endsAt` is ended.
- **Posting** takes one `clock.now()` read after the party check and compares it to `endsAt` immediately before the insert. `startsAt` and `lengthMinutes` never change for a confirmed booking, so no re-read is needed; the accepted imprecision is commit latency (milliseconds) after that comparison, which may stamp a message just past `endsAt`.
- **Page.** `/sessions/[bookingId]` sits outside the persona route groups, so a `layout.tsx` and the `page.tsx` each call `requirePageSession`; the service performs the party check. The path joins the `matcher` in `packages/app/src/proxy.ts` so a deep link survives sign-in. A `SessionRoom` client component next to the page (used only there) owns polling and the composer; presentational parts come from `packages/ui` (`SessionHeader`, `SessionTranscript`, `WrittenAnswer`, `SessionIsTextNotice`, a new share-rule notice).
- **Reused, not invented:** `apiHandler`, `parseJsonBody`/`parseWith`, `rateLimiter.consumeFor` with an inline policy (the bookings routes' precedent), `useApiResource` plus its `reload` for polling, `CrudForm` for the composer, `Clock`. No new event: `EventBus` gains no entry.
- **Entry points.** `BookingsPanel` shows an "Open text session" link to `/sessions/[id]` on confirmed bookings (mentee `/home`, mentor `/mentor`). The notification email still links to the role home.

## 📝 Data Model
`session_messages`: `id`, `created_at`, `updated_at` (base), `booking_id` → `bookings` (no action), `author_id` → `users` (no action), `body` text with check `char_length(body) between 1 and 4000`. Index `session_messages_booking_created_idx (booking_id, created_at, id)`. One reversible migration `sessions` (`npm run db:migration:create -- --name sessions`); keep only the create-table SQL and restore unrelated `.snapshot-devmentor.json` churn (see `.ai/lessons.md`, 2026-11-05 and 2026-11-06 entries).

Sensitive data: the body is free text that may contain third-party code (R19). It is never logged, never put in events or emails, never returned to anyone but the two parties, and rendered as text (no `dangerouslySetInnerHTML`). The service trims, normalises `\r\n` to `\n`, and rejects `\u0000` (PostgreSQL cannot store it). Messages are kept indefinitely (D27 ties the exchange to disputes and notes); this story adds no delete path. Rolling back drops the table and the messages with it, which the PR body must state.

## 📝 API Contracts
- `GET /api/sessions/[bookingId]` — `apiHandler`; 401 without a session; 422 for a non-uuid id; 404 per the gate order. Returns `{ ok, data }` with `data = { booking: { id, startsAt, endsAt, lengthMinutes }, window: 'not_started'|'open'|'ended', serverNow, viewerRole: 'mentee'|'mentor', counterpartName, truncated, messages: [{ id, authorRole: 'mentee'|'mentor', isOwn, authorName, body, createdAt }] }`. `messages` is the newest 500, oldest first, with `truncated: true` when older messages exist. The read is rate limited per account (`{ scope: 'session-reads', kind: 'account', limit: 120, windowMs: 60000 }`, consumed after the party check), which allows several tabs at the 5-second poll interval. No email addresses, user ids or Stripe fields.
- `POST /api/sessions/[bookingId]/messages` — `apiHandler` (the CSRF header is enforced there; routes never call `requireCsrfHeader`); body `{ body: string }` validated by `messageCreateSchema` (trim, 1–4,000, no NUL, unknown keys stripped); rate limit `{ scope: 'session-messages', kind: 'account', limit: 30, windowMs: 60000 }`. 201 with the created message DTO; 409 `conflict` with the message "This session has not started yet." or "This session has ended."; 404 as above; 429 with `retryAfterSeconds`.
- Validators: `packages/core/src/validators/sessions/session-id.schema.ts` (`sessionBookingIdSchema = z.uuid()`) and `message-create.schema.ts`.

## 📝 UI/UX
Reproduce prototype screen **s7 "Text session"** (`prototypes/devmentor-journey/SessionScreens.tsx`, `text-session.css`; tagged #45/Q18): back to "My sessions", eyebrow "Text session", the collapsible "Session details" (participants, date and time, timezone, duration), a conversation header with the counterpart ("Your mentor" / "Your mentee") and a status chip, `SessionTranscript`, and the composer (label "Message to {first name}", placeholder "Write a message or paste a code example...", submit "Send message", hint "Enter for a new line. Ctrl or ⌘ + Enter to send.", the prototype's two validation messages). Compare desktop and 320px screenshots with the prototype before declaring done (`packages/app/AGENTS.md`).

- **Every state** renders `SessionIsTextNotice` and the R19 sentence "Paste only what you are allowed to share. DevMentor does not check who owns it." outside the polled region, so neither disappears while loading or after an error. No audio or video control anywhere.
- **Not started** (a gap in the prototype, designed here): chip "Starts {local time}", composer disabled with "You can write here when the session starts."; the page refreshes its window from `serverNow` on each poll and switches itself to open.
- **Open:** chip "In progress", composer enabled, "Message sent." status after a post, focus returns to the composer.
- **Ended:** chip "Session ended"; the composer is replaced by the panel "This session has ended" with "You can still read the conversation above."; below it the `WrittenAnswer` card in its `owed` state. Polling stops. While the session is not ended, polling pauses when the tab is hidden and runs immediately on `visibilitychange` to visible, so a tab left open learns of the end on return.
- **Errors:** a failed poll keeps the last messages and shows "Reconnecting…"; a failed post keeps the typed text and shows the error; a 409 on post refreshes the window and says "This session ended before your message was sent." with the draft kept.
- **Access:** a stranger or unknown booking id gets the app's standard not-found page; a signed-out visitor goes to sign-in with `returnTo`.
- Accessibility: the transcript is a labelled live region (`SessionTranscript` already provides one); the composer has a visible label; the chip text, not colour alone, carries the state.

## 📝 Edge Cases & Failure Scenarios
- Post at `endsAt - 1 ms` succeeds; at `endsAt` it is refused; a post is judged by the single clock read taken before the insert, so one that passes the check may commit a few milliseconds after `endsAt` (accepted; the message `created_at` is the truth).
- Booking not `confirmed` (pending, expired, cancelled) → both routes answer 404 even to its parties; a later cancellation story inherits this. Consequence, named: if a booking is cancelled after messages exist, its parties lose access to that transcript until E03-S05/E05-S03 define what they may keep (a residual risk, not solved here).
- A user who is mentee of booking A and mentor of booking B reads each only in its own role and cannot read a third booking.
- Mentor and mentee post at the same instant → both rows persist; order is `(created_at, id)`.
- Body of whitespace only, 4,001 characters, or containing NUL → 422 with field errors; a body containing `<script>` is stored and shown as literal text.
- Browser clock wrong by hours → no effect, the window comes from `serverNow`.
- Polling load: at most one request per 5 seconds per open tab, none while hidden or ended; the 30/min post limit is separate from reads.
- Database error on post → 500 `internal_error`, logged without the body; the draft stays in the composer.

## 📝 Risks & Impact Review
New table, two additive routes, one additive page and one ui component; no existing contract changes. `BACKWARD_COMPATIBILITY.md` gets an entry for the routes (§1) and the table (§3). Schema changes carry a rollback note in the PR body; the implementation PR is `risk-medium` per the ticket and `needs-qa`. Residual risks, named and not solved here: private third-party code lives in plain database rows (R19 puts that on the mentee; no encryption at rest beyond the platform's), polling latency of up to 5 seconds, a duplicate post on a retried request (Q10), and no operator access for disputes until E05-S03.

## 📝 Decisions in play
- **R03** sessions are text; every session screen says so (state-independent notice). **N01** no video (no media control exists).
- **R01 / D01** a session is 25 or 50 minutes; the window is exactly that length from the booked start.
- **R19 / D26** the session screen shows the paste-only-what-you-may-share sentence.
- **R20 / D27** the exchange stays inside DevMentor (owner: founder A; D27 records the agent's recommendation and the brief keeps it active).
- **R02 / D02** nothing here is published; only the two parties read the exchange.
- **D13** this is a first-iteration story. No active decision is superseded. E05-S03 will have to supersede Q5's "no operator access" explicitly.

## Acceptance criteria
1. Given a confirmed booking and `now` at or after `startsAt` and before `endsAt`, when the mentee or the mentor opens `/sessions/[bookingId]`, then they can post text and each sees the other's messages within one poll interval.
2. Given any state of the session screen (not started, open, ended, loading, error), when it renders, then it says that sessions are text and shows the R19 sentence, and offers no video or audio control (R03, N01, negative).
3. Given a 25- or 50-minute booking, when `now` reaches `startsAt + lengthMinutes`, then the screen shows "Session ended", posting is refused with 409, the transcript stays readable, and the `owed` written-answer card is shown; nothing in the schema or service prevents E04-S02 from posting the answer afterwards.
4. Given a signed-in user who is neither party, an unknown booking id, or a booking that is not confirmed, when they call the API or open the page, then they get 404 and no message content (service and integration level, negative).
5. Given a signed-out request, then the API answers 401 and the page redirects to sign-in; a post without the CSRF header is rejected.
6. Given invalid bodies (empty after trim, over 4,000 characters, NUL), then 422 with field errors and nothing is stored; the 31st post in a minute gets 429.
7. Given the window boundaries, then exactly `startsAt` is open, exactly `endsAt` is ended, and a post is refused before the start with 409.
8. Given the sessions lists, then a confirmed booking shows an "Open text session" link for both roles; unconfirmed bookings show none.
9. Typecheck, lint, unit tests with per-file 100% coverage, build and the new integration scenarios pass, reported truthfully; desktop and 320px screenshots are compared with prototype s7.

## 📋 Phasing
Phase 1 delivers the durable record and the rules (nothing user-visible, fully unit-tested). Phase 2 exposes the rules over HTTP and builds the screen and the entry link. Phase 3 verifies across the app/db boundary and records QA evidence. Each step leaves the application buildable and the gate green; every step adds the files it creates to `coverage.include` in `vitest.config.mts` in the same commit, so the per-file 100% gate covers them from the step that introduces them.

## 📋 Implementation Plan
| Phase | Step | Title | Verification |
| --- | --- | --- | --- |
| 1 | 1.1 | Add `SessionMessage` entity (`sessions` folder), register it in `entities/index.ts`, generate the reversible `sessions` migration with its test | ORM discovery; migration up/down/up; entity and migration tests; snapshot churn restored |
| 1 | 1.2 | Add validators, `TextSessionService` (`getForParticipant`, `postMessage`, window math), DI as `textSessionService` + `Cradle` | Unit tests: party check for both roles and a stranger, dual-role user, unconfirmed booking, boundaries at `startsAt`/`endsAt`, body normalisation, rate limit, DTO leaks no ids or emails |
| 2 | 2.1 | Add `GET` and `POST` routes under `api/sessions/[bookingId]` | Route tests: envelope, 401, 404, 409, 422, 429 (post and read limits, only after the party check), CSRF header, `truncated` |
| 2 | 2.2 | Add the R19 share-rule notice to `packages/ui/src/components/sessions/` with story and test; export it | Component test, story renders, accessibility check |
| 2 | 2.3 | Add `sessions/[bookingId]/layout.tsx`, `page.tsx` and `SessionRoom` (polling, composer, states); add `/sessions/:path*` to the `proxy.ts` matcher | Page test with allowed tree, denied sentinel and sign-in redirect with `returnTo`; client tests with fake timers for polling, pause when hidden, immediate poll on `visibilitychange`, stop when ended, 409 handling, "Reconnecting…" and truncated notice; all five states (not started, open, ended, loading, error) render the sessions-are-text and R19 lines and no media control; 320px and desktop screenshots against s7 |
| 2 | 2.4 | Add the "Open text session" link to `BookingsPanel` for confirmed bookings only | Component test: link on confirmed in both roles, none on pending, expired or cancelled |
| 3 | 3.1 | Add `tests/integration/session.integration.test.ts` and QA document | Party exchange in an open window; third user 404; before start and after end refused; snapshot contains the sessions-are-text and R19 lines; fixture logins stay within 39 characters |
| 3 | 3.2 | `BACKWARD_COMPATIBILITY.md`, run log, full configured gate, independent review | `npm run typecheck`, `lint`, `test`, `build`, `test:unit:coverage`, `test:integration` all reported truthfully |
