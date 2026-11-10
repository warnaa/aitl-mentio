# A mentee cancels a confirmed session: free up to 24 hours before, forfeited afterwards

## 📝 TLDR
Issue #43 (E03-S05) lets a mentee cancel their own confirmed session. Cancelling at least 24 hours before the start frees the mentor's time and refunds the full amount paid through Stripe. Cancelling later also frees the time, but no refund is made. Once the session has started, cancellation is refused and the mentee is pointed to a quality dispute (E05-S03). The mentor sees the cancellation and its refund state, and gets a notification. Until this ships, the founders cancel and refund by hand (R18).

## Resolved assumptions (autonomous defaults)

| ID | Choice | Reason | Gate |
| --- | --- | --- | --- |
| Q1 | The 24-hour boundary is inclusive. A cancellation counts as free when `startsAt - now >= 24 h`, measured by the server clock when the cancellation commits. | D10 says "up to 24 hours before". An inclusive boundary favours the mentee by at most one instant and is easy to test exactly. | Default; override before merge if the owner reads D10 as exclusive. |
| Q2 | Only `confirmed` bookings can be cancelled. Unpaid `pending` holds keep their existing expiry and are never refunded through this flow. | A pending hold has no charge to refund and already expires by itself (#40/#41). This adds no new state to the payment-attempt lifecycle. | Default. |
| Q3 | Refund confirmation comes from the provider's refund response and from the existing reconciliation runner, which re-reads pending refunds. No `charge.refunded` webhook branch is added in this slice. | A webhook needs a new subscription in the Stripe dashboard (a deployment change outside this run). The runner already exists and is idempotent. A webhook branch can be added later without changing the data model. | Default; the issue proposed a webhook, so this is a deliberate narrowing. |
| Q4 | The mentee's confirmation dialog states the outcome ("full refund" or "no refund"). The request carries the outcome the mentee saw (`expectRefund`). The server refuses with 409 when its own decision differs, for example when the 24-hour line passed while the dialog was open. | R09 and the acceptance criteria require that the mentee saw the outcome before confirming. A client-side clock alone cannot guarantee that. | Default. |
| Q5 | Only the mentor is notified (in-app notification + email, through the existing notification service). The mentee sees the result on screen and receives no email. | The issue names the mentor. The mentee performed the action and sees the outcome immediately. | Default. |
| Q6 | A refund the provider definitively declines leaves the booking `cancelled` with `refundStatus = failed`. It appears in the operator's payment review list, and the founders refund by hand under R18. A timeout or other unknown outcome stays `pending` and is retried with the same idempotency key. An operator action to mark a manual refund as done is deferred to a follow-up. | This keeps automatic money movement to the one rule-defined case. A failure is never retried into a second refund, and it is never hidden. | Default. |
| Q7 | The paid-session report (#41) stays unchanged: it counts payments that were made, including payments later refunded. | Changing a reported metric is an owner decision (D16), and this story does not need it. | Default; a follow-up can define refunded-session reporting. |
| Q8 | The free-cancellation refund is executed automatically through Stripe, as the issue's acceptance criteria require. This needs a superseding entry for R09/D10, whose active text says "no automatic refunds in 1.0". The proposed superseding text: *"Free cancellation up to 24 hours before a session, refunded in full automatically through Stripe; later cancellations forfeit the fee; quality disputes are resolved by the operator, with no automatic refunds for disputes."* The same PR updates the product brief rows and `docs/payments-operations.md`. If founder A declines, the fallback keeps every other part of this design and replaces the gateway call with `refundStatus = pending` for the operator to execute by hand (R18). | The issue reads R09's ban as covering disputes, but the rule text does not say so, and `BACKWARD_COMPATIBILITY.md` §8 makes an unsuperseded contradiction a review blocker. | ⚠ NEEDS HUMAN CONFIRMATION from founder A (R09/D10 owner). Implementation must not merge before this is approved. |

## 📝 Problem Statement
D10/R09 promise free cancellation up to 24 hours before a session. Today a confirmed booking can only end by taking place. A mentee who cannot make it has no in-product way out. The mentor's time stays blocked, and the founders cancel and refund by hand in the Stripe dashboard (R18), which does not scale and leaves no record in the product. Who has it: mentees who cannot attend, and mentors whose time should reopen.

## 📝 Proposed Solution
Add an owner-scoped `POST /api/bookings/[id]/cancel`. Under the same mentor → slot → booking lock order every booking writer already uses, it moves a `confirmed` booking to `cancelled`, records `cancelledAt`, and decides the refund once, from the server clock. The status change alone frees the time, because occupancy is derived from booking status (`activeOccupancy`) and the active-slot unique index covers only `pending`/`confirmed`. No slot field changes.

When the cancellation is free, the refund is requested after the commit, outside any row lock. It goes through a new `refund` operation on the vendor-neutral `PaymentGateway` port, with the idempotency key `refund-<bookingId>`, for the full `amountPaidCents`. A retry can therefore never refund twice. The result is recorded under the lock. `bookings.booking.cancelled` is emitted after commit, and the notification service tells the mentor.

Alternatives rejected:
- **Refund inside the transaction.** This would hold row locks across provider I/O, which the payment design forbids.
- **Making refunds manual-only.** This contradicts the issue's acceptance criteria and keeps the R18 hand work this story exists to remove. It remains the documented fallback if founder A declines the R09/D10 superseding entry (Q8).
- **Clearing a `slot.booking` link, as the issue's analysis suggested.** The #41 design removed that field: occupancy is derived from booking rows.

Market check: Preply and Calendly-style booking products show the cancellation policy and the exact consequence inside the cancel confirmation, and refund automatically within the free window. Both behaviours are adopted here. Rescheduling and partial refunds, which those products also offer, are out of scope (R09 has no partial tier).

## 📝 Architecture
- **core** — `services/bookings/booking-cancellation.service.ts` (`BookingCancellationService`, Cradle `bookingCancellationService`). Dependencies: `em`, `session`, `clock`, `paymentGateway`, `eventBus`, `logger`. Methods: `cancel(bookingId, { expectRefund })` (mentee) and `reconcileRefunds(limit)` (runner). The mentor → slot → booking lock helper currently private to `PaymentService.locked` moves to `services/bookings/booking-lock.ts`, and both services use it. That is a behaviour-preserving extraction, so lock order stays defined in one place.
- **Port** — `PaymentGateway` gains three operations:
  - `refund({ idempotencyKey, paymentIntentId, amountCents, bookingId }) → RefundResult`;
  - `retrieveRefund(id) → RefundResult`;
  - `listRefunds(paymentIntentId) → RefundResult[]` (each result carries `bookingId` from metadata, or null for a refund made by hand in the dashboard).

  `RefundResult` is `{ id, status: 'succeeded' | 'pending' | 'failed', amountCents, bookingId }`. Stripe statuses map as follows: `requires_action` and `pending` become `pending`; `failed` and `canceled` become `failed`.

  `RefundDeclinedError` (the analogue of `CheckoutNotCreatedError`) is thrown only for an allowlist of definitive provider codes. `charge_already_refunded`, `idempotency_error` and every other error mean "outcome unknown, reconcile". The app's Stripe adapter maps `refunds.create`/`retrieve`/`list` (10 s timeout, no SDK retries, `metadata.bookingId`); `retrieveCheckoutSession` already lists refunds the same way. The `unavailable` adapter fails closed. The mock adapter is deterministic, and its test control can force `declined`/`pending`/`timeout`/`already_refunded`/expired idempotency keys.
- **Refund evidence before money moves** — Stripe prunes idempotency keys after about 24 hours, so a key alone cannot prevent a second refund. Before every refund call, and before ever writing `failed`, the service calls `listRefunds(paymentIntentId)`:
  - if succeeded or pending refunds for this payment intent already cover `amountPaidCents`, it adopts them (`refunded`, or `pending` with that refund id) and makes no new call. This includes a refund the founders made by hand under R18;
  - a partial existing refund is never topped up automatically: it goes to the operator as `failed` (`refund_partial`);
  - a new `refund` call is made only when no refund exists.
- **Runner** — one function, `reconcileAll()` in `lib/payments/reconcile.ts`, runs the payment pass and the refund pass. Each pass is isolated, so an error in one does not skip the other. Both the CLI and the operator route `api/payments/reconcile` call it. `reconcileRefunds(limit)` handles cancelled bookings whose refund is `pending` and due: evidence first (above), then `retrieveRefund` for a known id or a replay with the same key. Backoff is 5 minutes. It also re-checks `failed` refunds hourly, so a refund made by hand in the dashboard turns `refunded` and leaves the operator list. A production scheduler for `reconcileAll` is a **launch precondition**, recorded in `docs/payments-operations.md`, as it already is for payments. Known limitation, accepted for this slice: once a refund reaches `succeeded`, the runner no longer polls it. A later provider-side failure of that refund is seen only through the dashboard, until the webhook in Q3 exists.
- **Events** — `bookings.booking.cancelled: { bookingId: string }` (IDs only). Emitted after commit by `cancel`. Exactly-once delivery is not promised; the consumer is idempotent through the notification unique row, the same pattern as `booking_confirmed`.
- **Write discipline** — refund results are written by compare-and-set under the booking lock (`where refund_status = 'pending'`). `refunded` never regresses, and a stale `failed` or `pending` cannot overwrite it. At commit, `refund_next_attempt_at = now + 5 min`, so the runner does not race the request that is still in flight. A free cancellation calls `paymentGateway.assertReady()` before committing, as `startCheckout` does: an unconfigured provider refuses the cancellation (503) rather than strand a refund.
- **Notifications** — `NotificationService.onBookingCancelled(bookingId)` writes one `booking_cancelled` row for the mentor and sends one email (claimed atomically, released on failure, per the 2026-11-07 lesson). The email says the time is free again and whether the mentee was refunded. It carries no payment identifiers. The notification DTO path for `booking_cancelled` is `/mentor`, not `/sessions/<id>`, because the session page returns 404 for a cancelled booking. The `NotificationKind` union gains the new kind.
- **Operator** — `PaymentService.listReview()` also returns cancelled bookings with `refundStatus = failed` (reason `refund_failed`), plus `pending` refunds overdue by more than one hour (reason `refund_overdue`). The existing `PaymentReview` admin view renders them.

## 📝 Data Model
Additive, reversible migration `booking-cancellation` on `bookings`:
- `cancelled_at timestamptz null`;
- `refund_status varchar(16) not null default 'none'`, check `in ('none', 'pending', 'refunded', 'failed')`;
- `stripe_refund_id varchar(255) null unique`;
- `refund_next_attempt_at timestamptz null` (runner due time).

Checks: `(status = 'cancelled') = (cancelled_at is not null)` and `refund_status = 'none' or status = 'cancelled'`. Before the migration adds them, it asserts that no existing row has `status = 'cancelled'`. No writer produced that status before this story, and the migration fails loudly rather than rewrite history if one exists. No index changes are needed: `bookings_active_slot_unique` already excludes `cancelled`. The notification kind check gains `booking_cancelled`. Keep only the changed tables in the committed snapshot, per the 2026-11-06/11-08 lessons about spurious `bookings_currency_check` churn.

Rollback: `down` drops the four columns, the two checks and the kind value. Before rolling back in a real environment, settle every `pending` refund and export cancelled bookings, because a down migration would erase refund evidence.

## 📝 API Contracts
`POST /api/bookings/[id]/cancel` — `apiHandler` (which enforces CSRF centrally; the route does not call a CSRF helper itself), `requireRole('mentee')`, rate limit `{ scope: 'cancel', kind: 'account', limit: 10, windowMs: 600_000 }`. Body `{ expectRefund: boolean }` (strict zod schema in `validators/bookings/booking-cancel.schema.ts`); the id is a UUID.
- 200 `{ booking: { id, status: 'cancelled', cancelledAt, refundStatus } }`. `refundStatus` is `refunded`, `pending`, `failed` or `none`. A repeat call on a booking this mentee already cancelled returns 200 with the current state and has no side effects (idempotent retry).
- 401 no session · 403 wrong role · 404 missing or foreign booking (indistinguishable) · 409 `not_cancellable` for pending/expired · 409 `session_started` when `startsAt <= now`, with the message "This session has already started. To report a problem with it, contact DevMentor support about a quality dispute." · 409 `refund_window_changed` when `expectRefund` differs from the server's decision, telling the client to show the dialog again · 422 invalid body.

`GET /api/bookings?role=…` (existing participant projection, built by `PaymentService.listMine`; the `ParticipantBooking` UI type follows) adds `cancelledAt`, `refundStatus` and `freeCancellationUntil` (`startsAt - 24 h`, ISO). The UI uses them to phrase the dialog. These fields are additive.

## 📝 UI/UX
Surfaces: `BookingsPanel` on the mentee's `/home` and the mentor's `/mentor` (the issue's `(student)/sessions` path does not exist). There is no prototype screen for mentee cancellation. The dialog reuses the shared `AlertDialog` pattern the prototype uses for "Cancellation options" on s11. Mockups (illustrative, synthetic data): [mentee dialog and cancelled states](assets/mentee-cancellation/mockup-cancellation.html), [rendered PNG](assets/mentee-cancellation/mockup-cancellation.png). Current state: the confirmed card as implemented by #41 ([desktop](assets/booking-payments/implemented-mentee-desktop.png)).

- **Mentee, upcoming confirmed card** — a secondary "Cancel session" action. It is hidden for past or started sessions.
- **Dialog, more than 24 hours ahead** — title "Cancel this session?". Body: "You are cancelling more than 24 hours before the start, so you get a full refund of {price} to your original payment method. The mentor's time becomes free for others." Actions: "Keep session" / "Cancel and refund".
- **Dialog, less than 24 hours ahead** — body: "The session starts in less than 24 hours. If you cancel now, you will not get a refund (DevMentor's cancellation rule). The mentor's time becomes free for others." Destructive action: "Cancel without refund".
- **States** — busy (both buttons disabled, "Cancelling…"); 409 `refund_window_changed` (the dialog re-renders with the new outcome and an explanation, and nothing is cancelled); 409 `session_started` (inline message with the dispute route); network error (retry, dialog stays open); success (the dialog closes, the list reloads, and focus moves to the card heading).
- **Cancelled card, both personas** — status "Cancelled" plus one refund line. For `refunded`: "Refunded in full." For `pending`: "Refund in progress." For `failed`: mentee sees "We could not refund automatically. DevMentor will refund you by hand; booking reference {id}.", mentor sees "Refund being handled by DevMentor." For `none`: "Cancelled less than 24 hours before the start; no refund." Mentor copy says "The mentee cancelled. This time is available to book again."
- **Accessibility** — focus trap and Escape come from `AlertDialog`; status lines use `role="status"`; the layout works at 320 px.

## 📝 Edge Cases & Failure Scenarios
- **Exactly 24 hours / 24 h − 1 ms** — free / not free (unit boundary tests using the injected clock).
- **Started or past session** — 409 `session_started`, nothing changes.
- **Double submit or concurrent cancels** — the second request takes the lock, sees `cancelled` owned by the same mentee, and returns the current state. Only one refund call runs, and the idempotency key covers it anyway.
- **Refund timeout or crash after commit and before the refund call** — `refundStatus` stays `pending` with a due time. The runner first lists the provider's refunds for the payment intent and adopts any it finds. Only when none exists does it replay with the same key.
- **Retry after the 24-hour idempotency window, or after a manual R18 refund** — the evidence check finds the existing refund and adopts it, so no second refund is made (mock test with expired keys and with a refund that has no metadata).
- **`charge_already_refunded` / `idempotency_error`** — treated as unknown and resolved from the listed evidence, never as a decline.
- **Provider declines the refund** (a definitive code from the allowlist, and no existing refund) — `failed`; the booking stays cancelled, the time is still free, the operator list shows it, and the mentee copy explains the manual refund. Once the founders refund by hand, the hourly re-check flips it to `refunded`.
- **Existing partial refund** — `failed` with `refund_partial`, for the operator; it is never topped up automatically.
- **Payment provider not configured** — a free cancellation is refused with 503 before anything changes. A late cancellation, which moves no money, still works.
- **Request and runner record a result at the same time** — compare-and-set on `pending`; `refunded` never regresses.
- **Late or replayed `checkout.session.completed` for a cancelled booking** — `PaymentService.apply` already returns `terminal` for non-pending bookings, so it never reconfirms (regression test).
- **A writer of session data (written answer, notes) racing a cancel** — these writers lock the booking and re-check `confirmed`, so after the cancel commits they refuse. Before start the text session is closed anyway.
- **The freed time is rebooked immediately** — allowed: occupancy ignores `cancelled`, and the existing lead-time rule (≥ 2 h) still applies.
- **`amountPaidCents` is null on a confirmed booking (should not happen)** — refuse the refund (`failed`, diagnostic logged) rather than refund `priceCents` blindly.
- **Notification email fails** — the in-app row persists, the email claim is released, and the cancellation is unaffected.

## 📝 Risks & Impact Review
`risk-high`: automatic money movement, schema change, and a new public route. Blast radius: bookings and payments. A refund cannot be undone by the product, so the controls are an idempotency key per booking, the full amount only, money movement only after commit, and no retry of a definitive decline. BACKWARD_COMPATIBILITY: §1 new route and additive projection fields; §3 additive columns and a widened check; §6 new event; port methods added to an internal port, with every adapter updated in the same PR. Needs a second-person money review and manual QA (`needs-qa`); never self-approved.

## 📝 Decisions in play
- **D10/R09** — 24-hour free cancellation; late cancellations forfeit; disputes go to the operator. **Proposed to be superseded (Q8):** the active text bans automatic refunds in 1.0, and this spec refunds a free cancellation automatically. The superseding entry needs founder A's approval and lands in the implementation PR, together with the brief rows and the runbook. Merge is gated on that approval.
- **R05/D04** — Stripe only.
- **R18** — manual operator fallback for failed or partial refunds.
- **D13** — this story was 1.1 in the historical cut; full-MVP D05 includes it.
- **D16** — report semantics unchanged (Q7).

## Non-goals
Mentor-initiated cancellation (the open question stays with founder A); rescheduling; partial refunds; quality disputes (E05-S03); platform-fee or payout reversal (E03-S06, #44, not built yet); a `charge.refunded` webhook (Q3); an operator "mark refunded by hand" action (Q6).

## Acceptance criteria
1. Given a confirmed booking at least 24 hours before its start, when the mentee confirms "Cancel and refund", then the booking is `cancelled`, the time is bookable again, and a full refund of `amountPaidCents` is requested through the gateway with key `refund-<bookingId>`.
2. Given less than 24 hours remain, the dialog says no refund before the mentee confirms, and confirming cancels with `refundStatus = none` and no gateway call.
3. Given a cancelled booking, the mentor's sessions show it as cancelled with its refund state, and the mentor received one in-app notification and one email.
4. Given a session that has started, cancelling returns 409 with the dispute route, and nothing changes.
5. A declined refund leaves the booking cancelled with `failed`, visible in the operator review list. A timed-out refund stays `pending` and is resolved by the runner. No retry, at any age, issues a second refund when provider evidence already shows one for the payment intent.
8. Founder A's superseding R09/D10 entry is approved and recorded in the product brief before the implementation merges (Q8).
6. A foreign mentee gets 404, a mentor gets 403, a missing CSRF header is refused, and a stale `expectRefund` gets 409 without cancelling.
7. Migration up/down/up passes; the configured gate, per-file coverage for the new service and the integration cases on both sides of the window pass.

## 📋 Phasing
Phase 1 — data model, port extension and service (no entry point). Phase 2 — route, runner, event and notification. Phase 3 — UI and operator visibility. Phase 4 — integration, compatibility docs and verification. Each phase leaves the app working; nothing is reachable by users until Phase 3.

## 📋 Implementation Plan
| Step | Work | Verification |
| --- | --- | --- |
| 0 | Founder A approves or declines Q8. On a decline, use the manual-refund fallback described in Q8. | Approval recorded on the spec PR; no implementation merge while gated. |
| 1 | Migration `booking-cancellation` + entity fields/checks + `booking_cancelled` notification kind; snapshot limited to changed tables. | Entity tests; migration up/down/up; existing rows unchanged. |
| 2 | Extract the mentor → slot → booking lock helper into `bookings/booking-lock.ts`; `PaymentService` uses it. | Existing payment unit/integration suites unchanged and green. |
| 3 | Extend `PaymentGateway` with `refund`/`retrieveRefund`/`listRefunds` and the allowlisted `RefundDeclinedError`; implement in the mock (failure, already-refunded and expired-key controls), unavailable and Stripe adapters. | Adapter unit tests: idempotency key and metadata forwarded, full status mapping, decline allowlist vs. unknown, fail-closed. |
| 4 | `BookingCancellationService.cancel` (evidence-first refund, CAS writes, `assertReady` for free cancellations) + cancel schema + DI registration. | Unit: 24 h boundary both sides, started, pending/expired, foreign, stale `expectRefund`, idempotent repeat, decline → failed, timeout → pending, existing refund adopted, partial → failed, null `amountPaidCents`, unconfigured provider → 503. |
| 5 | `reconcileRefunds` + `reconcileAll` (isolated passes) used by the CLI and the operator reconcile route; runbook launch precondition. | Unit: adopt before replay, expired key adopts, retrieve pending → refunded, hourly re-check of failed, one pass failing does not skip the other, no regression from `refunded`. |
| 6 | `POST /api/bookings/[id]/cancel` route; event in `event-map.ts`; `NotificationService.onBookingCancelled` + mail template + `/mentor` path. | Route tests (401/403/404/409/422/503, CSRF through `apiHandler`, rate limit); consumer idempotency; email claim/release. |
| 7 | Projection fields; `BookingsPanel` cancel action, dialog, cancelled states for both personas; `listReview` reasons. | Component tests for every dialog state and copy; 320 px check; operator list test. |
| 8 | Regression: replayed checkout webhook after cancel stays `terminal`; rebooking freed time. | Unit/integration tests. |
| 9 | Integration cases with the mock gateway on both sides of the window, decline and replay; `coverage.include` for the new service; BACKWARD_COMPATIBILITY; `docs/payments-operations.md` (refund execution, manual fallback for `failed`, scheduler precondition); the approved R09/D10 superseding rows in `product-brief.md`. | `npm run typecheck`, `lint`, `test`, `build`, `test:unit:coverage`, `test:integration`; second-person money review and manual QA outstanding. |

## 🔍 Architectural review
A fresh-context skeptical review on 2026-11-10 raised one critical finding, two high, three medium and three low.
- **Critical:** R09/D10 was contradicted without a superseding entry.
- **High:** a retry after Stripe's 24-hour idempotency-key retention, or after a manual R18 refund, could refund twice; a pending refund could be stranded because nothing schedules the runner, and the operator route did not run the refund pass.
- **Medium:** refund writes had no compare-and-set; the mentor's notification linked to a 404 session page; there was no way to clear a failed refund; Stripe refund statuses were not fully mapped.
- **Low:** misstated CSRF wiring, the consumer naming convention, and where the projection is built.

Every finding is addressed above: Q8 and its merge gate, evidence-first refunds with a decline allowlist, `reconcileAll` used by both entry points with isolated passes and a scheduler precondition, `assertReady` before a free cancellation, compare-and-set writes, the `/mentor` notification path, an hourly re-check of failed refunds, the full status mapping, and the naming corrections. Scope cohesion passed: this is one capability, and nothing is user-reachable before Phase 3. No second independent review has run after these revisions.
