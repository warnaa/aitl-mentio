# Book-and-pay design interview

Date: 2026-10-30
Outcome: done — interview decisions incorporated into the draft; no application implementation.

## Request

Grill `.ai/specs/2026-10-29-book-and-pay.md`. The installed `grill-me` wrapper
delegates to an unavailable Skill tool/`grilling` skill. The user explicitly
authorized a direct interview instead. Project lessons and related E01/brief
rules were read before questioning. Changes were limited to the design artifacts
and the required run log/lesson entry.

## Checklist

- [x] Read the spec, lessons, and related availability/product rules.
- [x] Interview one decision at a time and capture the user's answers.
- [x] Apply decisions throughout flows, API/data contracts, UI, test plan and Done means.
- [x] Update the linked booking data-model diagram and record the pricing correction in lessons.
- [x] Review the diff and run `git diff --check`.

## Decisions

1. Mentees may pay for overlapping sessions with different mentors. R17 and
   one-booking-per-slot exclusivity continue to apply.
2. Creation uses the current mentor rate, explicitly notifying the mentee if
   it changed while they were writing the question.
3. An awaiting-payment booking permits question/duration edits while keeping
   the slot and original hold deadline.
4. Duration edits use the current mentor rate with a notice if it changed.
   The user rejected preserving the booking's original rate for this edit.
5. Question-only edits keep the saved price.
6. Pending-payment cancellation is allowed: release immediately, keep money
   recovery visible, and fully refund a confirmed successful charge.

## Changes and design consequences

- Updated `.ai/specs/2026-10-29-book-and-pay.md` and its linked diagram
  `.ai/data-model/2026-10-29-book-and-pay.html`.
- Added the planned owner-scoped edit endpoint, a persisted price notice,
  and revision checks for edits/first pay so another tab cannot charge an unseen edit.
- Extended `abandoned` to pending-payment cancellation; reconciliation refunds
  success without reviving the reservation. Existing immutable charge recovery
  remains bounded to one attempt per request and commits release before execution.
- Updated planned unit/integration/browser evidence for repricing, notices,
  editing/deadline behavior, races, overlapping paid bookings, pending cancellation
  and refund recovery after deletion or with booking disabled.
- Appended the user's pricing correction to `.ai/lessons.md`.

## Verification and limits

Reviewed the documentation diff and checked for obsolete pending-payment refusal
and unpaid-only cancellation wording. `git diff --check` passed and the diagram's
embedded JSON parsed successfully (five nodes). These are design
documents and diagram data only; the application validation gate was not run.
The spec remains a draft and its existing prerequisites/E03 contract gate remain.
Revision/notice fields and use of `abandoned` are design choices supporting the
answers, not additional claims of user approval or implemented behavior.

## Needs from you

none
