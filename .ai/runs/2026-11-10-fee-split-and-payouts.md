# Execution plan — fee split and mentor payouts (E03-S06, #44)

Source doc: .ai/specs/2026-11-10-fee-split-and-payouts.md
Spec PR: #95 (design-only; the spec file merges there, not here)
Issue: #44
Base: `feat/platform-settings` (PR #88, in merge queue). Phase 1 snapshots the `feePercent` that #88
adds, so this branch is stacked on it and retargets to `main` once #88 merges.

## Goal

Every paid booking records the fee in force at confirmation and the mentor's share. An
operator-triggered payout run then transfers the share through Stripe Connect, holds it when the
mentor has no ready destination, or voids it when the payment was refunded. Mentors and the operator
can see the outcome.

## Scope

- **db:** `Booking` snapshot columns; `Payout` and `PayoutResolution` entities; one hand-written
  migration with a guarded `down`.
- **core:** `splitFee`; three additive `PaymentGateway` methods (Stripe, mock and unavailable adapters);
  the `PayoutDestinationResolver` port and its not-ready adapter; `PayoutService`; the
  `payout_held` notification; snapshot writing in `PaymentService.apply()`.
- **app:** the run, resolve and list routes; the `/mentor/payouts` page; the `/admin` Payouts panel;
  `scripts/payouts-run.ts` behind `npm run payouts:run`.

## Non-goals

Connect onboarding (#38); a scheduler; automatic reversals; refunds or cancellation policy; a
dispute window; multi-currency.

## Assumptions

- Q1, separate charges and transfers, is ⚠ NEEDS HUMAN CONFIRMATION. The PR stays a draft until it is
  confirmed.
- No money can move in any environment until #38 supplies a ready resolver. The only adapter shipped
  here reports every mentor as not ready.

## Risks

- **Money (risk-high):** the money-gate tests cover idempotency, adoption by transfer group,
  refunds and disputes re-read on every attempt, and leases.
- **Stacking on #88:** if #88 changes before it merges, rebase onto it.

## Implementation Plan

### Phase 1 — Fee snapshot
1. `splitFee` in `packages/core/src/money/fee.ts`, with tests.
2. Booking snapshot columns, checks, migration (columns, backfill, the paid-requires-snapshot check)
   and its test.
3. `PaymentService` reads `feePercent` before locking and writes the snapshot on every confirmation
   path; tests.

### Phase 2 — Payout ledger and run
4. `Payout` and `PayoutResolution` entities, checks and indexes in the same migration, with the
   guarded `down`.
5. Gateway port: `retrievePaymentState`, `createTransfer`, `listTransfers`, plus the mock,
   unavailable and Stripe adapters.
6. `PayoutDestinationResolver` port, the not-ready adapter and container registration.
7. `PayoutService.runDue`: the state machine, leases, adoption, backoff and the held event.
8. `POST /api/payments/payouts/run` and `scripts/payouts-run.ts` with `npm run payouts:run`.
9. `PayoutService.resolve` and `POST /api/payments/payouts/[id]/resolve`.

### Phase 3 — Visibility
10. `GET /api/payments/payouts`, with the mentor and operator projections.
11. The `/mentor/payouts` page, the `/admin` Payouts panel, the `payout_held` notification and nav.

### Phase 4 — Verification
12. Integration scenario against PostgreSQL and the mock gateway.
13. Browser QA evidence, a README runbook, a lesson if one is learned, and the coverage includes.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Fee snapshot

- [ ] 1.1 splitFee helper
- [ ] 1.2 Booking snapshot columns and migration
- [ ] 1.3 Snapshot on confirmation

### Phase 2: Payout ledger and run

- [ ] 2.1 Payout and PayoutResolution entities
- [ ] 2.2 Gateway transfer and payment-state methods
- [ ] 2.3 Destination resolver port
- [ ] 2.4 PayoutService.runDue
- [ ] 2.5 Run route and script
- [ ] 2.6 Operator resolve

### Phase 3: Visibility

- [ ] 3.1 Payouts list API
- [ ] 3.2 Mentor page, admin panel, notification

### Phase 4: Verification

- [ ] 4.1 Integration scenario
- [ ] 4.2 Browser QA, runbook, coverage
