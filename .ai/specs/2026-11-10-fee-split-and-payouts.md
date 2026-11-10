# DevMentor — 1.1: platform fee split and mentor payouts through Stripe Connect

Date: 2026-11-10
Status: draft — merge gated on confirming the ⚠ assumptions below. Phase 1 (fee snapshot) does not
depend on Q1 and may be implemented first; Phases 2–4 (transfers) are gated on Q1.
Issue: [#44](https://github.com/warnaa/aitl-mentio/issues/44) (E03-S06, epic #28)
Depends on: E03-S03 (#41, merged — Checkout and payment confirmation); E05-S02 (#50, PR #88 —
operator-set `feePercent` — **must merge first**: today's `PlatformSettingsService` has no fee field and
this spec's migration reads `platform_settings`, so it is ordered after #88's migration); E02-S05 (#38, Connect onboarding — **not required to ship this spec**,
see Q2)
Design authority: this story. `.ai/specs/product-brief.md` (D04/R05, D11/R10, R09, D19/R18) is the
product contract.

## 📝 TLDR

When a paid booking is confirmed, DevMentor snapshots the platform fee in force (20 % by default,
operator-configurable) and the mentor's share on the booking. After the session ends, an
operator-triggered payout run transfers the mentor's share through Stripe Connect as a separate
transfer, holds it (and tells the mentor) when Connect onboarding is incomplete, and voids it — with no
fee taken — when the payment was refunded. Mentors see per-session share and payout status; the operator
sees fee totals and payouts that need attention.

## Resolved assumptions (autonomous defaults)

| # | Question | Default applied | Rationale | |
|---|---|---|---|---|
| Q1 | Separate charges and transfers, or destination charges at Checkout? | **Separate charges and transfers**: Checkout stays a platform charge (#41, unchanged); the mentor's share moves by a Stripe `Transfer` after the session ends, tied to the charge via `source_transaction`. | Destination charges would rewrite the shipped Checkout flow and require Connect onboarding before a mentor can be booked, contradicting the shipped "mentors become bookable" order. Separate transfers work for mentors who onboard late, which is exactly the held → transferred path the issue asks for. | ⚠ NEEDS HUMAN CONFIRMATION — the #38 spec makes the charge/transfer topology a founders' gate (owner founder A); it also fixes Connect account capabilities and negative-balance liability. |
| Q2 | #38 (Connect onboarding) is unbuilt and gated. Does this story wait for it? | **No.** This story defines a narrow `PayoutDestinationResolver` port. Until #38 ships, its only adapter reports every mentor as *not ready*, so every due payout is **held** with `connect_onboarding_incomplete` and no transfer can happen. #38 later provides the real adapter from its `ConnectAccount`. | Smallest, safest working increment: fees are recorded and owed payouts become visible and countable now, while money cannot move until Connect is approved and built. No dependency on #38's provider state shape. | Reversible; no confirmation needed. |
| Q3 | Which fee value is snapshotted, and when? | The `feePercent` returned by `PlatformSettingsService.get()` (PR #88), read **before** the confirmation transaction and written in the same transaction that sets `status = confirmed`. Confirmation is the moment `bookedAt` is set, so "the fee in force at booking" is the fee at confirmation. | Matches R10 and the 2026-11-08 lesson (settings are read before taking booking locks). A fee change between the read and the commit applies to the next booking, which is acceptable and documented. | Implementation starts after PR #88 merges. |
| Q4 | Rounding rule? | Whole-percent fee (PR #88 validates 0–100 integers). `platformFeeCents = floor((priceCents × feePercent + 50) / 100)` (half-up in integer arithmetic); `mentorShareCents = priceCents − platformFeeCents`. Never floats. | Deterministic, the two parts always sum to the price, and the shares match what a person computes by hand. | — |
| Q5 | What counts as "refunded" and what happens? | Before **every** transfer attempt, retries included, the run re-reads the payment through a new `retrievePaymentState(paymentIntentId)` port method: charge status, refunded total, pending refund, any dispute, livemode. The payment intent and livemode must match the booking and gateway. Full refund → payout **void** (`refunded`), fee taken 0. Partial or pending refund, any dispute, a non-`succeeded` charge or mismatched evidence → payout **held** (`refund_review`) for the operator; no transfer. A booking that never reached `confirmed` (expired, cancelled) gets **no payout row and no fee**. | R09 says no automatic refunds in 1.0, so refunds only happen by hand in Stripe; the run must not pay out money that was returned. Partial refunds have no product policy, so they go to a human rather than a guessed split. | — |
| Q6 | When is a payout due? | When a `confirmed` booking's session window has ended (`startsAt + lengthMinutes ≤ now`, the existing `sessionWindow()` rule). No dispute hold window. | The issue's rule. A dispute window is a policy (R09 quality disputes) that this spec does not invent; Stripe transfer reversals remain available to the operator by hand. | — |
| Q7 | How is the run triggered? | An operator-only `POST /api/payments/payouts/run` (a "Run payouts" button on `/admin`) and an `npm run payouts:run -- --operator <name>` script. No scheduler. | There is no worker or scheduler (`AGENTS.md`); this mirrors the shipped payment-reconciliation trigger. The route sits under the `payments` concept beside `/api/payments/reconcile` rather than the issue's suggested `/api/operator/payouts/run`, so payment routes stay in one concept. | — |
| Q8 | Split into several specs? | **No.** The fee snapshot (Phase 1) ships alone and is useful alone; the payout run and screens (Phases 2–4) are the same capability, "the mentor is paid their share," and are phased rather than split. | One story, one acceptance list; phasing gives the independent increments. | — |
| Q9 | Bookings paid before this ships have no snapshot. | The migration backfills every booking with `paid_at` set (confirmed or later cancelled) with `fee_percent_applied = coalesce((select fee_percent from platform_settings), 20)` and the derived cents. The deploy runbook checks the `operator.settings.updated` log; if the fee was ever changed before deployment, the operator corrects legacy rows by hand before the first run (R18). | No historical fee record exists. 20 % (D11) was the only fee before PR #88. There is no paid production launch yet (Q19), so the set is expected to be empty or test data. | — |

Q19 (how a shortened, paid first iteration pays mentors) stays open with its owners. It restricts a
paid launch of the D13 cut, not this story, and this spec does not invent a manual payout path.

## 📝 Problem Statement

D11/R10 set a 20 % platform fee and D04/R05 make Stripe Connect the only payout channel. #41 shipped
Checkout: the platform now collects the full price of a paid session and records nothing about the
mentor's share or how they get paid. Mentors cannot be paid by the system, and the founders would have
to reconcile money by hand with no record of which fee applied to which booking. A later fee change
(PR #88) would make that reconstruction ambiguous.

## 📝 Non-goals

- Connect onboarding, account provisioning and status (#38). This story only consumes a
  "destination ready" answer.
- The fee settings screen (E05-S02 / PR #88).
- Refund execution, cancellation (R09) or forfeiture rules. When a cancellation flow ships, it decides
  whether a forfeited booking pays the mentor; until then only `confirmed` bookings are paid out.
- A scheduler or background worker; automatic transfer reversals; dispute holds; multi-currency (PLN only).
- Paying first-iteration mentors by hand (Q19).

## 📝 Proposed Solution

1. **Snapshot on confirmation.** `PaymentService` reads `feePercent` before every locked confirmation
   path (`handleEvent`, `recover`/`applyRetrieved`, `resolveReview`) and passes it into `apply()`,
   which writes `feePercentApplied`, `platformFeeCents` and `mentorShareCents` together with
   `status = confirmed`. One pure function, `splitFee(priceCents, feePercent)`, owns the arithmetic.
2. **Payout ledger.** A `Payout` row per paid, ended booking records what happened to the mentor's
   share: `held`, `transferring`, `transferred`, `failed` or `void`.
3. **On-demand run.** `PayoutService.runDue(limit)` creates missing payout rows for ended, confirmed
   bookings and then advances each actionable row: verify the payment is unrefunded, resolve the
   destination, and transfer with a durable idempotency key, or hold, void or fail with a reason.
4. **Visibility.** Mentors see their per-session share and payout status at `/mentor/payouts`. The
   operator sees fee totals and held or failed payouts on `/admin`, and runs payouts from there.

**Alternatives rejected:** destination charges (Q1); computing the fee at payout time (breaks R10's
"later fee changes do not touch earlier bookings"); storing the fee only on the payout (a refund or
hold would lose the record of what the booking was charged); a cron in the Next process (no worker
exists; an on-demand trigger plus a script matches reconciliation).

**Market check.** Marketplace platforms on Stripe (and the Stripe Connect guidance for "separate
charges and transfers") pay on fulfilment with `source_transaction` so a transfer never outruns the
charge's funds, and use transfer groups per order. Open-source marketplaces (e.g. Sharetribe's
transaction process) model the payout as a state machine separate from the order, with a "held until
the provider is onboarded" state. This spec adopts both. It skips their scheduled payout batching,
reserve balances and automatic reversal on dispute, which the 1.1 operator handles by hand (R18).

## 📝 Architecture

| Layer | Change |
|---|---|
| db | `Booking` gains three nullable snapshot columns; new `Payout` and `PayoutResolution` entities under `payments/`; one hand-trimmed, reversible migration (`fee-split`). |
| core `money/` | `splitFee(priceCents, feePercent)`, pure, 100 % tested. |
| core `payments/` | `PaymentGateway` gains additive `retrievePaymentState`, `createTransfer` and `listTransfers`; new `PayoutDestinationResolver` port with a `NotReadyPayoutDestinationResolver` adapter; new `PayoutService` (`runDue`, `resolve`, `listMine`, `listForOperator`); append-only `PayoutResolution` for operator decisions; `PaymentService.apply()` writes the snapshot. |
| core `notifications/` | New notification kind `payout_held`, recorded once per payout on its first transition to `held`, via event `payments.payout.held`. |
| app | `POST /api/payments/payouts/run` (operator); `GET /api/payments/payouts` (mentor: own rows; operator: attention list and totals); `/mentor/payouts` page; "Run payouts" panel on `/admin`; `scripts/payouts-run.ts` behind `npm run payouts:run`. |

Boundaries: `PayoutService` never imports Connect state; it asks the resolver for
`{ ready: true, destinationAccountId } | { ready: false, reason }`. #38 replaces the adapter in the
container with one that reads its `ConnectAccount`, with no change to `PayoutService`. The Stripe
adapter (`packages/app/src/lib/payments/stripe-payment-gateway.ts`) implements `createTransfer`; the
mock adapter records transfers in memory for integration tests. Provider I/O never runs inside a
database transaction (the existing `PaymentService` rule).

### Payout state machine

```
(none) ──run: booking ended + confirmed──▶ created, then immediately evaluated:
  refund evidence full            → void   (voidReason=refunded, platformFeeCents=0)
  refund partial / pending        → held   (heldReason=refund_review)
  mentorShareCents = 0            → void   (voidReason=zero_share)
  destination not ready           → held   (heldReason=connect_onboarding_incomplete) + notify once
  destination ready               → adopt an existing transfer in group booking-{bookingId} if any (→ transferred);
                                    else transferring (attempt n, key booking-{bookingId}-payout-{n} and a
                                    lease next_attempt_at = now + 2 min committed before the provider call)
transferring ─provider ok──────────▶ transferred (stripeTransferId, transferredAt)
transferring ─deterministic reject─▶ failed (diagnosticCode, nextAttemptAt = now + backoff)
transferring ─timeout/unknown──────▶ stays transferring; after the lease expires the next run re-checks the
                                    payment, then retries with the SAME key (≤ 23 h old) or, past that,
                                    adopts by transfer group or parks it for the operator (stuck)
held (onboarding / refund_review), failed (nextAttemptAt ≤ now)
                                    ─run──▶ re-evaluated from the top (failed → attempt n+1)
transferred, void                   terminal
held (transfer_mismatch), stuck transferring, held (refund_review that stays partial/disputed)
                                    ─operator resolve──▶ transferred (verified transfer id) or void (reason)
```

A partial refund that later becomes a full refund turns `refund_review` into `void` on the next run;
a partial refund that stays partial stays held until the operator settles it in Stripe and records the
outcome with the resolve action (R18).

**No double payment, by construction.** The transfer key and `transfer_group` derive from the
**booking id**, not the payout row id, so a re-created row (after a rollback or a manual fix) produces
the same key and group. Before attempt n+1 and before any recovery of a stuck row, the run lists
transfers in `booking-{bookingId}` and adopts an existing one instead of creating another.

`void` and `transferred` are terminal for the run. A held row is re-evaluated on every run, so a mentor
who finishes onboarding is paid on the next run with no operator action.

## 📝 Data Model

**`bookings`, additive, nullable:** `fee_percent_applied` int, `platform_fee_cents` int,
`mentor_share_cents` int. Checks: all three null or all non-null; `fee_percent_applied between 0 and
100`; `platform_fee_cents >= 0`, `mentor_share_cents >= 0`;
`platform_fee_cents + mentor_share_cents = price_cents`; `paid_at is null or
fee_percent_applied is not null` (added after the backfill in the same migration).

**`payouts` (new, `packages/db/src/entities/payments/payout.entity.ts`):**

| Column | Notes |
|---|---|
| `id` uuid, timestamps | `baseProperties` |
| `booking_id` | FK, **unique** (one payout per booking), delete `no action` |
| `mentor_profile_id` | FK, delete `no action`; indexed with `status` |
| `amount_cents` | = booking `mentor_share_cents` at creation; check `>= 0` |
| `platform_fee_cents` | fee actually taken: booking fee, or 0 when `void/refunded` |
| `currency` | `'PLN'` check |
| `status` | check in `held, transferring, transferred, failed, void` |
| `held_reason` | `connect_onboarding_incomplete`, `refund_review`, `transfer_mismatch`, null; `transfer_mismatch` is never re-evaluated automatically (the operator reconciles it in Stripe by hand, R18) |
| `void_reason` | `refunded`, `zero_share`, null |
| `attempt_count` | int, default 0; transfer idempotency key is `booking-{bookingId}-payout-{attempt_count}` |
| `destination_account_id` | provider account snapshotted when a transfer attempt starts; null otherwise |
| `stripe_transfer_id` | nullable, unique; stored whenever the provider returns a transfer, including a mismatched one |
| `diagnostic_code` | safe provider error code only, never a message or payload |
| `next_attempt_at` | nullable; lease for `transferring` (now + 2 min) and backoff for `failed` (5 min, doubling, capped at 24 h) |
| `held_notified_at` | nullable; makes the mentor notification exactly-once |
| `transferred_at` | nullable |

Checks tie reasons to states: `held_reason` non-null iff `status = 'held'`, `void_reason` non-null iff
`status = 'void'`, and `status = 'transferred'` implies `stripe_transfer_id` is not null (one direction
only, so a held mismatch keeps the real transfer id).

**`payout_resolutions` (new, append-only):** `payout_id`, `actor` (operator user), `action`
(`mark_transferred`, `void`), `reason` (≤ 500 chars), `stripe_transfer_id` (for `mark_transferred`),
timestamps. The same shape as the shipped `payment_resolutions`.

No personal data is added. The provider account id is a non-secret identifier, already present in
#38's design, and is never shown to the mentee or the public.

## 📝 API Contracts

**Port, additive (`payment-gateway.port.ts`):**

```ts
interface CreateTransfer {
  idempotencyKey: string;          // booking-{bookingId}-payout-{attempt}
  amountCents: number;             // > 0
  currency: string;                // 'PLN'
  destinationAccountId: string;    // from the resolver, never request input
  sourcePaymentIntentId: string;   // booking.stripePaymentIntentId; the adapter resolves latest_charge
  transferGroup: string;           // booking-{bookingId}
  payoutId: string;                // metadata, for provider-side reconciliation
}
interface TransferResult { id: string; amountCents: number; currency: string; destinationAccountId: string; transferGroup: string; livemode: boolean }
interface PaymentState { paymentIntentId: string; chargeSucceeded: boolean; amountCents: number; refundedCents: number; refundPending: boolean; disputed: boolean; livemode: boolean }
class TransferRejectedError extends ServiceUnavailableError {}   // verified provider rejection
// PaymentGateway gains:
//   retrievePaymentState(paymentIntentId: string): Promise<PaymentState>;
//   createTransfer(input: CreateTransfer): Promise<TransferResult>;
//   listTransfers(transferGroup: string): Promise<TransferResult[]>;   // reversed transfers excluded
```

A result whose amount, currency, destination or livemode does not match the request is treated as a
provider anomaly: the payout becomes `held` with `heldReason = transfer_mismatch` and is never
retried automatically; the operator reconciles it in Stripe. A `TransferRejectedError` is a
deterministic rejection (`failed`). Any other thrown error is ambiguous: the row stays `transferring`.

**Resolver port (`payout-destination.port.ts`):**
`resolve(mentorProfileId): Promise<{ ready: true; destinationAccountId: string } | { ready: false; reason: 'connect_onboarding_incomplete' }>`.

**Routes** (all through `apiHandler`, which owns CSRF; the services re-check roles):

| Route | Method | Who | Behavior |
|---|---|---|---|
| `/api/payments/payouts/run` | POST | operator | `runDue(25)`, rate-limited 5/min per operator like reconcile; returns `{ evaluated, transferred, held, voided, failed, pending }`; logs `payments.payouts.run` with the operator id and counts (D19/R18). |
| `/api/payments/payouts/[id]/resolve` | POST | operator | `{ action: 'mark_transferred', stripeTransferId, reason }` or `{ action: 'void', reason }`, only for `held` (`refund_review`, `transfer_mismatch`) or stuck `transferring` rows. `mark_transferred` is accepted only when `listTransfers(booking-{bookingId})` returns that id with matching amount, currency and destination; `void` sets the fee taken to 0 only for a proven full refund, otherwise it keeps the booking fee. Appends a `PayoutResolution`; re-locks and re-checks the row before writing; 409 when the state changed. |
| `/api/payments/payouts` | GET | mentor | own rows only: `{ bookingId, startsAt, lengthMinutes, priceCents, platformFeeCents, mentorShareCents, payoutStatus, heldReason, transferredAt }`; `payoutStatus` is `upcoming` before the session ends, `due` when ended with no row yet. |
| `/api/payments/payouts` | GET | operator | totals (`platformFeeCents` taken, `transferredCents`, `heldCents`, `failedCents`) and up to 50 held, failed or stuck-`transferring` rows. |

The mentee DTOs and public mentor DTO gain nothing. The mentor DTO never exposes
`destinationAccountId`, `diagnosticCode` or the transfer id.

**Script:** `npm run payouts:run -- --operator <name>` (pattern of `scripts/invite.ts`), closes the ORM
pool in `finally`, prints the same counts, and logs the operator name.

## 📝 UI/UX

- **`/mentor/payouts`** (mentor guard). A table of the mentor's paid sessions, newest first: date, length,
  price, platform fee, **your share**, status chip (`Upcoming`, `Due`, `Paid` with date, `On hold`,
  `Not paid — refunded`, `Sending` for `transferring`, `Payment failed — retrying` for `failed`). An `On hold` chip caused by onboarding links to "Set up payouts"
  once #38 exists; until then it reads "Payouts start once Stripe payout setup is available. Your
  share is recorded." Empty, loading and error states; 320 px layout; amounts formatted as PLN with
  the shared money formatter. If #38 lands first and already created the page, this table is added
  below its Connect section.
- **`/admin`**: a "Payouts" panel with the fee taken, transferred, held and failed totals, a list of rows
  needing attention (held for `refund_review` or `transfer_mismatch`, failed, `transferring` past its
  lease), each with the resolve action, and a "Run payouts" button (CSRF header, disabled while running, shows the counts or the error).
- **Notification**: `payout_held` appears in the mentor's existing notification list once per
  payout: "Your share for the session on {date} is on hold until payout setup is complete."

## 📝 Edge Cases & Failure Scenarios

| Scenario | Behavior |
|---|---|
| Two runs at once (button and script) | Row creation is `insert … on conflict (booking_id) do nothing`. A row is claimed under `select … for update skip locked` and its attempt, key and 2-minute lease are committed before the provider call, so the other run skips it until the lease expires. A retry after the lease reuses the same key, so even an overlapping in-flight call yields one transfer. |
| Crash after Stripe accepts, before commit | Row stays `transferring`; the next run repeats the same key and gets the same transfer back (idempotent replay), then commits `transferred`. |
| Idempotency key older than Stripe's 24 h retention | `transferring` older than 23 h is not resubmitted. The run adopts a transfer found in the booking's transfer group; if there is none it surfaces as `stuck` for the operator's resolve action. It never creates a second transfer automatically. |
| Dispute or refund after the row was created but before the transfer | Every attempt, retries included, re-reads the payment state first, so the row is held or voided instead of transferred. |
| Insufficient platform balance or another deterministic rejection | `failed` with code; retried with backoff on later runs using attempt n+1. |
| Refund or dispute in Stripe after a transfer | Out of scope: the operator reverses the transfer by hand (R09: no automatic refunds); the runbook says so. |
| Fee changed mid-flight | Booking confirmed with the fee read just before its transaction; later bookings get the new fee. |
| Fee of 100 % | Share 0, so `void/zero_share`, no transfer, fee taken = price. |
| Mentor profile without a user | Not possible (FK cascade on user only); the resolver reports not-ready. |
| Provider outage | Run returns counts with `pending`; nothing is lost; rows retry. The route returns 200 with counts, not 500, unless the database fails. |
| Payment gateway not configured (`unavailable` adapter) | The run returns 503 before touching rows, matching reconcile. |
| Mock adapter in production | Already refused by env validation unless `INTEGRATION_TEST_RUN=1`. |

## 📝 Risks & Impact Review

- `risk-high` (money). Needs `needs-qa` and a second reviewer. Live money cannot move until Q1 is
  confirmed **and** #38 supplies a ready-reporting resolver; until then the only live effect is
  recording fees and held payouts.
- Compatibility (`BACKWARD_COMPATIBILITY.md`): §3 additive table and nullable columns plus checks that
  hold for every existing row after backfill; §2 additive port method (every `PaymentGateway`
  implementer, the Stripe, mock and unavailable adapters, is updated in the same PR); §5 additive npm
  script; new routes only. No env keys added.
- Rollback: disable the run (remove the button route) first. The migration `down` **refuses to run**
  while any payout row is `transferring`, `transferred` or `failed`, or any resolution exists; the money
  ledger is never dropped. With only `held`/`void` rows it drops `payout_resolutions`, `payouts` and the
  three booking columns. Even if the ledger were lost, keys and transfer groups derive from the booking
  id and the run adopts existing transfers, so re-running cannot pay twice. Never delete transfers in
  Stripe on rollback.
- Coverage: every new or changed production file is added to `coverage.include` in `vitest.config.mts`.

## 📝 Decisions in play

- D11/R10: 20 % fee, operator-configurable; honoured by the snapshot (fee in force at confirmation).
- D04/R05: Stripe only, Connect for payouts, onboarding before the first payout; honoured (held
  without a ready destination).
- R09: no automatic refunds; honoured (refund → void, never an automatic reversal).
- D19/R18: by-hand operator actions are logged; the run route and script log actor and counts.
- D13 / Q19: unchanged; this spec neither launches the shortened iteration nor defines a manual payout.
- The #38 spec's topology gate (owner: founders with the #44 author): **proposed answer Q1**, pending
  confirmation. No superseding product decision is proposed.

## 📋 Phasing

1. **Fee snapshot.** Columns, backfill, `splitFee`, and writing it on confirmation. Shippable alone:
   every paid booking records fee and share.
2. **Payout ledger and run.** `Payout`, ports, `PayoutService.runDue`, transfer adapter method, the
   not-ready resolver, the operator route and script. With the not-ready resolver everything due is
   held and nothing moves.
3. **Visibility.** Mentor page and API, operator panel and totals, the held notification.
4. **Verification.** Money-gate tests, integration scenarios with the mock gateway, browser QA.

## 📋 Implementation Plan

### Phase 1 — Fee snapshot
1. Add `splitFee` in `packages/core/src/money/` with tests: rounding half-up (e.g. 8999 × 20 % →
   1800/7199; 1 × 50 % → 1/0), 0 % and 100 %, invalid input rejected.
2. Add the three `Booking` columns and checks plus the migration `fee-split` (part 1: columns, backfill,
   the confirmed-requires-snapshot check), hand-trimmed snapshot; `up → down → up` test.
3. `PaymentService`: read `feePercent` before each locked confirmation path and write the snapshot in
   `apply()`. Tests: snapshot on webhook, reconcile and operator confirm; a fee change between two
   bookings applies only to the later one; settings read happens before the lock (pinned order).

### Phase 2 — Payout ledger and run
4. `Payout` entity, checks and indexes (migration part 2, same file or a second migration).
5. `retrievePaymentState`, `createTransfer` and `listTransfers` on the port with the mock and
   unavailable adapters, and the Stripe adapter (`source_transaction` from the payment intent's latest
   charge, `transfer_group`, metadata, idempotency key, bounded timeout, rejection vs ambiguous
   classification, result matching, refunds and disputes read from the charge).
6. `PayoutDestinationResolver` port and `NotReadyPayoutDestinationResolver`, registered in the container.
7. `PayoutService.runDue`: row creation, skip-locked advancement, the state machine above, backoff,
   held notification event once. Tests: refund full → void with fee 0; partial/pending → held
   `refund_review`; not ready → held and one notification across repeated runs; ready → transferred;
   retry after crash reuses the key; rejection → failed then attempt n+1 after backoff, adopting a
   transfer already in the group; a dispute or refund appearing between attempts holds or voids; a
   re-created row adopts instead of paying twice; the lease prevents a second in-flight call; zero
   share; concurrent runs give one transfer; expired/cancelled bookings never get a row.
8. `POST /api/payments/payouts/run` (operator, rate limit, D19 log) and `scripts/payouts-run.ts` +
   `npm run payouts:run`; route and parser tests.
9. `PayoutResolution` and `POST /api/payments/payouts/[id]/resolve` (operator, verified transfer id,
   re-lock and re-check, 409 on change); the migration `down` guard and its test.

### Phase 3 — Visibility
10. `GET /api/payments/payouts` with mentor and operator projections; scoping tests (a mentor never
   sees another mentor's rows; mentee and anonymous get 403/401).
11. `/mentor/payouts` page with states and copy above; `/admin` Payouts panel with the run button;
    `payout_held` notification kind and copy. Component tests at 100 % per file.

### Phase 4 — Verification
12. Integration scenarios (ephemeral PostgreSQL, mock gateway): paid booking → ended → run → held
    (not-ready resolver); a test-only ready resolver → transferred; refunded session → void, no fee;
    fee change → only later bookings; concurrent runs → one transfer.
13. Browser QA of `/mentor/payouts` and the `/admin` panel (desktop and 320 px), and the runbook
    section in `README.md` (running payouts, stuck `transferring`, refund after transfer, legacy
    backfill check).

## ✅ Acceptance criteria

- Given a paid session that was confirmed, When it completes, Then the fee in force at confirmation
  (20 % by default) is recorded as the platform fee and the rest as the mentor's share, and the two sum
  to the price. (R10)
- Given a mentor whose payout destination is ready, When the payout runs, Then the share is transferred
  through Stripe Connect, by one transfer even across retries and concurrent runs, and through nothing
  else. (R05)
- Given a mentor without Connect onboarding, When the payout would run, Then it is held with
  `connect_onboarding_incomplete`, the mentor is notified once, and it is paid on a later run once the
  destination is ready. (R05, negative)
- Given the operator changes the fee, When later sessions are confirmed, Then the new fee applies to
  them and not to earlier ones. (R10; money)
- Given a refunded session, When the payout runs, Then no fee is taken and nothing is transferred; a
  partial or pending refund is held for the operator. (negative)
- Given a transfer the provider rejects, When the payout runs, Then it is recorded `failed` and
  retried later with a new attempt, never silently dropped.
- Given a payout that was already transferred, When its row is re-created or retried, Then the existing
  transfer is adopted and no second transfer is made.
- Given a non-operator, When they call the run or resolve route, Then it is refused (401/403); a mentor sees only
  their own payouts.
