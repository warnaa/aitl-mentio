# Execution plan — mentee cancellation (#43)

Source doc: .ai/specs/2026-11-10-mentee-cancellation.md
Spec PR: #91 (design-only; stays a separate PR)
Issue: #43
Engine: om-auto-create-pr (steps: 11, --loop: no)

## Goal
A mentee cancels their own confirmed session. At least 24 hours before the start, the time is freed and the full amount paid is refunded automatically through Stripe. Later than that, the time is freed and no refund is made. Once the session has started, cancellation is refused. The mentor sees the cancellation, its refund state and a notification.

## Scope
- db: the `booking-cancellation` migration and booking fields; the `booking_cancelled` notification kind.
- core:
  - the shared booking lock helper;
  - payment port refund operations and their mock/unavailable adapters;
  - `BookingCancellationService` (cancel + reconcileRefunds);
  - the event, the notification consumer and mail;
  - projection fields and operator review reasons.
- app:
  - the Stripe adapter refund operations;
  - the `POST /api/bookings/[id]/cancel` route;
  - `reconcileAll` used by the CLI and the operator route;
  - the `BookingsPanel` cancel dialog and cancelled states.
- docs: BACKWARD_COMPATIBILITY, the payments runbook, and the proposed R09/D10 superseding rows (marked pending founder A).

## Non-goals
Mentor-initiated cancellation, rescheduling, partial refunds, disputes, fee/payout reversal (#44), a `charge.refunded` webhook, an operator "mark refunded by hand" action, and report changes.

## Risks
- Money movement (risk-high). Merge is gated on ⚠ Q8: founder A must approve the superseding R09/D10 entry. The PR stays draft until then.
- Migration snapshot churn (lessons 2026-11-06 and 2026-11-08): keep only the changed tables.
- Deviation from the spec: when existing rows already have `status = 'cancelled'`, the migration backfills `cancelled_at` from `updated_at` instead of failing. Only test fixtures produce such rows, and a backfill is safer than a failed deploy.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Data model, lock helper and payment port

- [x] 1.1 Migration booking-cancellation, entity fields and checks, booking_cancelled notification kind — 55c773e
- [x] 1.2 Extract the mentor-slot-booking lock helper into bookings/booking-lock.ts — 8f7b676
- [x] 1.3 Refund operations on the PaymentGateway port with mock, unavailable and Stripe adapters — eacd730

### Phase 2: Cancellation service, runner, route and notification

- [ ] 2.1 BookingCancellationService.cancel with evidence-first refund and compare-and-set writes
- [ ] 2.2 reconcileRefunds and reconcileAll used by the CLI and the operator route
- [ ] 2.3 Cancel route, bookings.booking.cancelled event and mentor notification

### Phase 3: UI and operator visibility

- [ ] 3.1 Projection fields and BookingsPanel cancel dialog and cancelled states
- [ ] 3.2 Operator review list reasons for failed and overdue refunds

### Phase 4: Verification and docs

- [ ] 4.1 Integration cases for both sides of the window, decline, adoption and replay
- [ ] 4.2 Compatibility, runbook and proposed R09/D10 superseding rows
- [ ] 4.3 Full validation gate
