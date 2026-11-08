# Private session notes: mentor draft and mentee review

## TLDR

For #47 (E04-S03), the booking's mentor saves a private session note after posting the written answer, then sends its exact saved version to the mentee for review. Both parties can read it; only the mentor can edit an unsent draft. The lifecycle also provides the design boundary for #48, which implements approval, decline and redrafting separately.

## Problem Statement

The mentor interviewed on 2026-08-22 keeps a private notes file which becomes stale and will not publish text a mentee has not agreed to. D20/R12 assigns drafting to the mentor and approval to the mentee; D05 puts the written answer first. #46 is implemented on main at ce6c182, but there is no persisted note. Mentors need a durable draft, and mentees need to read the exact version submitted for approval without editing it.

## Resolved assumptions (autonomous defaults)

| Question | Choice | Reason |
| --- | --- | --- |
| Q1: shared document or separate specifications? | One note lifecycle, delivered in dependent slices #47 and #48. This run implements only slice A (#47). | Both tickets explicitly request this shared spec; #48 cannot function without the note created by #47. The implementation plan separates their delivery gates. |
| Q2: edits after send? | No. A sent version is immutable; #48 permits a new version only after decline. | Matches the ticket's plain reading and avoids changing text under a review. |
| Q3: unsent visibility and #47 decision controls? | Both parties may read an unsent draft, clearly marked Draft. Only the mentor can edit it. In #47 the sent mentee view is read-only and says Awaiting your approval; actual Approve/Decline actions ship in #48. No dead buttons. | The ticket's getForParty and third acceptance criterion refer to the mentee viewing a draft. Its explicit non-goals assign decisions to #48. This narrows its ambiguous control requirement rather than implementing a second story. This slice does not yet provide the full review workflow. |
| Q4: outsider response? | Signed-out callers get 401; unknown, unconfirmed and another party's booking get the same 404. A booking's mentee attempting to write gets 403. | Preserves TextSessionService's existing privacy boundary, rather than revealing booking existence with the ticket's suggested outsider 403. |
| Q5: notification channel? | #47 adds an in-product notification on send, without body text. Email is deferred. | The ticket asks for a notification, not an email. Avoids introducing another delivery guarantee and limits sensitive data propagation. |
| Q6: refresh after the session ends? | A dedicated Refresh note action re-reads the note, independent of transcript polling. Dirty edits are preserved with an explicit conflict message. | SessionRoom stops polling when ended; notes may be written much later. A manual refresh avoids introducing background polling. |

No assumption authorizes publication, co-editing, operator access to note content or changing an active product rule. Defaults must be posted for override on the spec PR and subject issue before implementation is published.

### Slice B decisions (#48)

| Question | Choice | Reason |
| --- | --- | --- |
| What does a decision target? | `POST /api/notes/[bookingId]/approve` takes `{ version }`; `/decline` takes `{ version, comment }`. Only the latest `awaiting_approval` version can be decided. An identical replay succeeds and re-emits; anything else is 409. | The mentee decides the text they read, and a lost event stays repairable. |
| How does a redraft start? | `PUT` gains optional `expectedVersion`. On a declined note it must equal the declined version and `expectedRevision` its revision; the result is `version + 1`, revision 1. | A stale tab cannot start or overwrite a redraft. |
| Answer freeze | Once a booking has an approved note, the written answer cannot be replaced (409). Answer saves take the same booking lock as decisions. | The approved note is read beside that answer; D05 keeps both as the session's record. |
| Notification identity | `notifications.note_version`: 0 for non-note kinds, the note version for note kinds. Unique on user, kind, booking and note version. | Each later version gets its own notification; booking and answer uniqueness is unchanged. |
| Decision notifications | The mentor gets one in-product `note_approved` or `note_declined` per version, with no text. No email. | Same privacy limit as slice A. |
| Operator scoping exception | The operator reads an aggregate: session start, party names and the count of declined versions, on `/admin/sessions`. Never a body or a comment, and note routes stay 404 for operators. | D20's co-editing signal needs the count only. |

## Proposed Solution

Use one versioned SessionNote resource per confirmed booking. In slice A a mentor saves version 1, can revise that unsent draft, and explicitly sends the saved revision. The mentee reads the same body, with a distinct awaiting state. Slice B adds decisions and new drafts after decline, preserving the declined record.

Alternatives: storing only a body on Booking cannot preserve declined versions; collaborative editing contradicts R12; a generic document/signature system adds unrelated recipients, routing and infrastructure. [Nextcloud Approval](https://github.com/nextcloud/approval) separates request permission from decision permission; reuse that separation, without administrator-configured workflows. [Documenso's document API](https://docs.documenso.com/docs/developers/api/documents) restricts modifying recipients/fields once pending; our design applies the analogous snapshot principle to the submitted note body. These are design comparisons, not integrations.

## Architecture

- db owns `entities/notes/session-note.entity.ts`, exports and discovery, a generated reversible migration and snapshot.
- core owns `services/notes/session-note.service.ts`, note validators, DTOs and a scoped `sessionNoteService` in container/cradle. Reuse the confirmed booking/party predicate used by TextSessionService without calling its private helper or reusing SessionService (authentication). No generic authorization framework is introduced.
- app adds dynamic workflow routes under `/api/notes/[bookingId]` and a page-local `SessionNotePanel` beside the WrittenAnswerPanel inside SessionRoom. Read through the authenticated request/page scope; no direct ORM in app. The page's service reads are sequential in one scope, not parallel on a shared EntityManager.
- ui's existing `NoteReview`/`VersionHistory` provide note presentation and privacy wording. The single-page editor stays in app. Use CrudForm for the body and apiCall for send/refresh. Client validation imports the validator subpath, never the core barrel at runtime.
- `notes.note.sent` carries bookingId, noteId and version only. A system-scoped NotificationService subscriber validates the persisted sent version and records one `note_awaiting_approval` row for the mentee. No body/comment in events, notification DTOs or logs; no email in slice A.

## Data Model

SessionNote uses the base id/createdAt/updatedAt, `booking` many-to-one (no-action delete), integer `version >= 1`, integer `revision >= 1`, text `body` (1–20,000 characters), `status` (`draft`, `awaiting_approval`, `approved`, `declined`), nullable `declineComment` (1–2,000 when present), `sentAt` and `decidedAt`. Unique `(booking_id, version)`. Status/date/comment checks enforce: draft has no sent/decision/comment; awaiting has sentAt only; approved has both dates and no comment; declined has both dates and a nonblank comment. Only draft and awaiting can be created in slice A. Revision increments on each saved edit; version increments only on a new draft after decline in slice B.

Slice A widens the existing Notification.kind check and TS/UI unions for `note_awaiting_approval`; existing unique `(user, kind, booking)` gives one notification for the first submission. A replay finds it and leaves readAt unchanged. Slice B must separately migrate to version-aware notification identity before sending later versions; it must preserve existing booking/answer notification uniqueness. Do not silently widen uniqueness in slice A for speculative uses.

Every save/send opens a transaction and locks the confirmed Booking first, then reads/locks the latest note. Check caller, writtenAnswerAt, latest status and expected revision inside this transaction. First creation uses expectedRevision null and version 1; subsequent writes must match the latest revision. Concurrent first saves cannot create competing versions. Consistent booking-first order applies to future decisions. The booking lock is by ID without joined FOR UPDATE; load parties explicitly to avoid locking joined user/profile rows.

Persist first, emit after transaction commit. EventBus is in-process and swallows subscriber failures; notification failure must not undo a sent note. A retry of send for the identical sent version/revision returns that version and emits again, enabling notification repair without changing timestamps. The mentor's awaiting view keeps a reachable "Notify mentee" action, including after reload, calling this same endpoint with the displayed version/revision. It is safe when delivery already succeeded: it neither creates another row nor changes readAt. Its success message is "Notification requested." rather than a delivery claim, since the event bus swallows failures. No outbox, worker or guaranteed background delivery is claimed; if the process dies before emission, the mentee can still refresh the session and the mentor can use this action. Tests must demonstrate that recovery.

## API Contracts

All handlers use apiHandler, withRequestScope, requireSession and readJsonBody for writes; central CSRF enforcement stays in apiHandler. No caching of private responses (`Cache-Control: private, no-store`). UUID validation and service DTOs follow the existing session route patterns.

| Route | Input | Result |
| --- | --- | --- |
| GET `/api/notes/[bookingId]` | booking UUID | `{ current: NoteDto | null, history: NoteDto[] }`, newest first; only parties. No note is a successful empty result. |
| PUT `/api/notes/[bookingId]` | `{ body, expectedRevision: positive integer | null }` | Saved draft NoteDto. Mentor only, written answer required. null means create only, never overwrite an existing note. |
| POST `/api/notes/[bookingId]/send` | `{ version: positive integer, revision: positive integer }` | Exact saved version submitted, or identical sent version returned on a retry. Mentor only. |

NoteDto allowlist: id, version, revision, body, status, declineComment, sentAt, decidedAt, updatedAt, private true. History excludes current; no ORM entity/user email/hidden relation serialization. Slice A history is empty. Dates are ISO strings or null. Shared noteDraftSchema trims, normalizes CRLF, rejects NUL, whitespace-only or >20,000 body; no markdown/HTML rendering. Malformed input is 422 with field errors; unauthorized mutations 403; stale revision, no written answer or forbidden state 409; unknown/foreign/unconfirmed booking 404; no session 401; CSRF denial follows apiHandler. Save and send have account-scoped rate limits, 30/minute each, checked after authentication/party authorization; reads 120/minute.

Expected revision prevents both stale-tab overwrite and sending a newer body the mentor has not reviewed. The client sends only the saved revision, never the live textarea, and disables Send while dirty or saving. A successful save updates its saved revision; no automatic combined save/send.

## UI/UX

Design authority: `prototypes/devmentor-journey/SessionScreens.tsx` s9 (review), s10 (revision, slice B), s15 (approved, slice B), plus `packages/ui/src/components/notes/NoteReview.tsx`. Reproduce the NoteReview composition and its privacy copy; use a derived title, "Private session note", rather than adding a title field. Storage `awaiting_approval` maps to UI `awaiting-approval`. Match the implemented session/written-answer reading width and panel spacing.

| Situation | Mentor | Mentee |
| --- | --- | --- |
| No written answer, no note | Hint to post the written answer first; no editor | No note panel |
| Answer exists, no note | CrudForm textarea "Session note", Save draft | EmptyState "No session note yet" and Refresh note |
| Draft | Editor seeded from current body, Save draft, then Send for approval only for a clean saved draft | NoteReview draft, body read-only; "The mentor has not sent this note for approval yet." |
| Awaiting | NoteReview read-only; "Waiting for the mentee's approval"; no editor; "Notify mentee" safely retries the existing submission's notification | NoteReview with "Awaiting your approval"; no body input; decision actions added only in slice B |
| Load failure | ErrorMessage plus Retry; preserve any dirty body | ErrorMessage plus Retry |
| Conflict | Preserve draft, explain newer saved version; refresh preview without discarding edits; deliberate reload of saved draft requires discard confirmation | Refresh displays latest state |

Pending saves/send prevent duplicate submission; failed writes leave the draft intact. Keep form position stable across session-window changes. A confirmed send removes the editor; do not clear local text on a failed send. Body renders escaped with preserved line breaks and wrap for long unbroken text. Accessible labels, error alerts and success/status announcements; buttons remain reachable at 320px. Keep text-session/share notices in all screen states. NotificationsPanel adds a link to the session, saying the mentor sent a private note for approval, without excerpts.

Refresh and writes use explicit response ordering. A monotonically increasing client request generation identifies reads; starting a save/send invalidates all older reads, and Refresh note is disabled while a mutation is pending. Discard responses from invalidated generations. Apply a read to the saved preview only after checking the current dirty flag at response time, not the flag captured when the request began; never replace typed text with a fetched value while dirty. A clean form can follow a newer accepted saved revision. Parent-prop updates follow the same rule and cannot regress an accepted version/revision or revert awaiting to draft at the same revision. For slice A, compare version, then revision, then draft/awaiting status progression; timestamps are not a concurrency clock. A GET started before a successful PUT/send cannot restore an obsolete draft or editor. Test GET-before-save, GET-before-send, edit-during-refresh and stale parent props with controlled promises; assert both the latest accepted state and retained local text. Mutations themselves cannot overlap.

Mockups/current-app screenshots: skipped for this spec run because this worktree has no generated test-environment descriptor. Existing prototype screens and committed #77 screenshots supply design context, not fresh QA evidence. Implementation must generate desktop and 320px evidence for the changed states; it cannot count prototype screenshots as testing the app.

## Edge Cases & Failure Scenarios

- Two first saves: booking lock serializes them; one creates version 1 and the other gets 409. No lost edit. Save versus send: exactly one wins for a revision; sent body never changes.
- Save without an answer or after send: 409. Mentee PUT/send: 403. Global mentor/operator role never grants access to a different booking; 404.
- Repeated send of exact sent version: successful no-op for state/dates, retry notification consumer. Mismatched revision/version or approved/declined status: 409.
- Database failure: no partial transition, form text retained; API returns the shared error envelope without body leakage.
- Missing notification or subscriber failure: note remains sent/readable; the awaiting mentor view's Notify mentee action retries send and repairs the in-product row, even after reload. A successful repeat leaves the single row's read state intact. No email, visible delivery guarantee or background retry promised.
- Note arrives after transcript polling stops: Refresh note retrieves it. No unsaved draft is discarded by refresh or a parent rerender.
- Cancelling a booking races with save: booking status is checked under the lock, so a cancelled record cannot acquire a new note. Historical note access on cancelled bookings remains unavailable, matching existing session behavior; cancellation policy is outside this story.
- Answer replacement remains governed by #46 in slice A. Slice B must explicitly define/freeze the answer on approval; #47 must not silently change the written-answer contract.

## Risks & Impact Review

This feature touches private data scoping and a schema migration: infer risk-high under SDLC despite the original ticket's risk-medium. Require an independent review, isolation tests, migration up/down/up and human QA; no self-QA sign-off. BACKWARD_COMPATIBILITY.md must document the routes, DTOs, table/check, notification kind and event. Existing mentor public/list DTO allowlists remain unchanged and are exercised for absence of note content.

Rollback slice A: deploy maintenance protection for the new writes, run migration down before reverting application code. Remove `note_awaiting_approval` notifications before narrowing the kind check, then drop session_notes. This permanently loses drafts and submissions; backups/retention must be handled through the existing operator process, not fabricated by this change. No approval or publication is introduced by this slice.

### Security review and test scope

Assets are private note text, revision integrity, party identities and decision history. Browser requests cross the cookie/CSRF boundary into the app; request-scoped core services enforce booking-party access before the database; ID-only events cross into a system-scoped notification consumer. Operator access is not an exception for bodies.

| Threat | Mitigation | Required test |
| --- | --- | --- |
| IDOR through guessed booking or note identifiers | Per-booking party predicate on every read/mutation, no list endpoint, 404 for strangers | Third user, another mentor, operator and signed-out requests; public DTO absence |
| Mentee edits or impersonates mentor | Derived party identity, no accepted author/status fields, 403 writes | PUT/send from mentee; ignored/rejected extra fields cannot change identity/state |
| CSRF or cache leaks | apiHandler header and private no-store responses | Missing header denied; GET cache headers verified |
| Stored markup/script | Plain text rendering and no dangerous HTML | Render script-shaped input and long text without executable nodes |
| Stale-tab/race mutation under a review | Booking-first transaction plus expected revision, immutable sent body | PostgreSQL concurrent save/save and save/send; stale revision failure |
| Logging or notification content disclosure | DTO/event allowlists; no body, comments or email in telemetry | Event/notification payload inspection and response/log failure tests |
| Request/body abuse | Validated bounds and account rate limits | Invalid IDs, empty/NUL/oversize body and limit exhaustion |

Residual risk: body is stored in the existing PostgreSQL trust boundary with the same at-rest/infrastructure policy as messages; no application-level encryption is introduced or claimed. A user may voluntarily type confidential code; retain the R19 notice. The in-process notification can be lost until send is retried.

## Decisions in play and non-goals

R12/D20 assign mentor drafting, mentee whole-note decisions and no co-editing. R02/D02 forbid disclosure beyond the two parties; even approval never publishes in 1.0. D05 requires an answer first and private retention. R19's share notice remains. No active decision is superseded.

Slice A excludes approval/decline endpoints, redrafting after decline, approved retention UX, operator counts, answer freezing and version-aware re-notifications (slice B). Both slices exclude a vault, public notes, co-editing, export, attachments, rich text and generic workflow configuration.

## Acceptance criteria

1. A confirmed booking's mentor, after posting its answer, saves and reloads a draft, sends the exact saved revision and sees it locked awaiting approval. Its mentee sees the identical body labeled Awaiting your approval and one in-product notification linking to the session.
2. The mentee has no note-body textbox or edit action in draft/awaiting states; their mutation requests get 403. Slice A supplies no nonfunctional decision buttons; approve/decline are explicitly deferred to #48.
3. A stranger, another mentor or an operator outside the booking cannot read/write the note. No public mentor/list payload, notification or event contains the private body. Signed-out and CSRF paths are denied.
4. No answer means no draft; invalid text is rejected; concurrent first saves, stale saves and save/send races cannot overwrite or create multiple current versions. Duplicate send does not change the submitted version/timestamps or duplicate the notification. When send commits but its subscriber fails, the mentor reloads the awaiting view and uses Notify mentee: exactly one notification appears, with unchanged sentAt/body/revision. A subsequent retry preserves readAt.
5. Ended-session manual refresh retrieves a later note. Failed writes and refresh conflicts preserve dirty edits. Controlled delayed-response tests prove a GET begun before PUT/send and stale parent props cannot replace the latest confirmed state or restore a sent note's editor; editing during an in-flight refresh retains that text. Long content, keyboard operation, loading/error/empty/denied states, desktop and 320px layouts are exercised in the real app.
6. The configured gate, per-file 100% unit coverage, isolation/concurrency integration scenarios, migration up/down/up and independent review pass. Human QA remains required for this risk-high surface.

## Phasing

Slice A implements #47 only. Slice B implements #48 after A, as a separate PR with its own acceptance and review. A PR for A must Closes #47 and Refs #48; the shared design-only PR must Refs both and close neither.

## Implementation Plan

| Slice | Step | Work | Verification |
| --- | --- | --- | --- |
| A | A1 | SessionNote entity, discovery/exports, status/date/body checks and unique booking/version; generated migration; notification-kind check | Entity tests and migration up/down/up; review snapshot for unrelated churn |
| A | A2 | Draft/send validators, DTOs, SessionNoteService party checks, booking-first transactions, expected revision, idempotent send/event and scoped DI | Unit 100%; real-PostgreSQL save/save and save/send concurrency; denied and stale requests |
| A | A3 | GET/PUT note and POST send routes, private no-store response headers | Route tests including shared envelope, CSRF, auth, statuses and validation |
| A | A4 | In-product note notification consumer, event subscription and NotificationsPanel kind/link | One row on replay, send-commit/subscriber-failure/reload/Notify mentee recovery with unchanged sentAt/body/revision, readAt preserved on repeat, no email/text leakage; existing kinds unchanged |
| A | A5 | Page-local SessionNotePanel in existing session composition, NoteReview projection and CrudForm, awaiting Notify mentee action, explicit refresh/conflict recovery and request ordering | Role/state and dirty-draft tests; controlled GET-before-save, GET-before-send, edit-during-refresh and stale-prop cases; no mentee body textbox; desktop/320px screenshots compared with s9 |
| A | A6 | Integration and QA scenarios, compatibility record, run log, independent review and full gate | typecheck, lint, test, build, test:unit:coverage, test:integration; document real outcomes and pending human QA |
| B | B1 | After A: mentee-only approve/decline validators and endpoints; transactionally choose exact sent version; mandatory decline comment; immutable historical versions; next mentor draft version | Decision races/stale-version/empty-comment/isolation tests, approved remains private, two declines counted |
| B | B2 | Version-aware notification identity migration preserving existing kinds; explicitly define and enforce answer freeze on approval; aggregate-only operator decline counts | Up/down migration, repeated-version notification tests, answer race/freeze tests and operator body denial |
| B | B3 | Real decision/revision/history/approved UI using s9/s10/s15; operator aggregate view; gate and independent review | #48 acceptance criteria, desktop/320px real browser evidence and human QA |

Only A1–A6 are authorized implementation scope for this #47 run. Each implementation commit adds changed production files to coverage.include and leaves the application working. Never move this spec to implemented until completion, verification and merge; do not treat delivery of slice A as delivery of slice B.
