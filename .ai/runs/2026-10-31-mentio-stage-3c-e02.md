# Mentio design system — stage 3c: E02 book and pay

Date: 2026-10-31. Spec: .ai/specs/2026-10-31-mentio-design-system.md.
Requested: “commit i dalej” — 3b committed as a27f023 (no push); then 3c only. The four 3b interpretations were not addressed and remain open. Rules of lekcja-06/storybook-mentio.md remain in force.

## Scope from the book-and-pay spec (UI/UX, API contract, cancellation table)

Screens: new booking `/rezerwacje/nowa/[slotId]`, payment `/rezerwacje/[id]/platnosc`, booking details `/rezerwacje/[id]`, bookings list `/rezerwacje`, and the mentor page's “Book” links (MentorProfile already supports them). Endpoints: `POST /api/bookings`, `PUT /api/bookings/[id]`, `POST …/pay`, `…/cancel`, `…/settle`, with the spec's codes (`bookings_disabled`, `unpaid_booking_exists`, `slot_taken`, `booking_changed`, `hold_expired`, `booking_not_editable`, `cancel_outcome_changed`, `cancel_not_allowed`).

## Component decision (derived, recorded for the user)

Only `components/bookings/BookingSummary` is new: the same summary (mentor, time, length, price, optional status and question, N01 line) appears on three screens. The stage-0 inventory's BookingForm, PaymentPanel, CancellationSummary and Booking/PaymentStatus are compositions of existing components (CrudForm, ActionButton with confirm, Alert, StatusBadge), so they are not added — fewer components than planned, none outside the plan. The F6 status → tone/label map stays with the E02 feature PR (decision 2); stories pass English labels. The `accepted` status belongs to E03 and is marked preliminary where a late cancellation needs it.

## Plan

- [x] BookingSummary with 100% unit tests; package export `./components/bookings/*`.
- [x] 13-section page for BookingSummary.
- [x] Screen stories with MSW and a state map: new booking, payment (incl. edit, price notice, pending/declined/cutoff/expired, abandon), booking details (cancel outcomes, refund states, outcome changed, after start), bookings list, mentor page with Book links.
- [x] Booking and payment recovery and Cancellation pattern pages (the stage-0 key patterns for E02).
- [x] Gate: tokens, stories both themes, page/axe, product browser checks, visual review, unit coverage, lint, types, build, integration, audit; report; POSTEP; stop before 3d.

## Outcome

Done — 3c only. See packages/ui/storybook/verification/2026-10-31-stage-3c.md.

Evidence:
- 796 story tests.
- 306 page checks and 102 axe audits.
- No overflow in 122 product stories.
- Visual review.
- Full gate passes.

Fixed during verification:
- The heading outline.
- A long status overflowing.
- A placeholder identical to its error.
- Fixtures moved out of the stories file.

A background browser check was interrupted at exit, but its reports had been written in full, and the product check was rerun after the fix. Servers and the throwaway Postgres were stopped and removed.

## Needs from you

- Confirm interpretations 1–8 in POSTEP.md (3b and 3c).
- Say “dalej” for 3d, optionally after a local commit.
