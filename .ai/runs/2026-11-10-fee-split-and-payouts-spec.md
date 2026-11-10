# 2026-11-10 — Spec for E03-S06 fee split and payouts (#44)

## Request

`om-auto-fix-issue 44`. The issue is labelled `feature`, so it took the feature route: FR triage,
then `om-auto-write-spec 44` (autonomous `om-spec-writing`), then `om-auto-implement-spec`.

## Work

- **FR triage passed.** No payout, transfer or fee-snapshot code exists, and no PR references #44.
  The ticket-level Definition of Ready is met. Q19 restricts only a paid launch of the shortened
  D13 cut, and the brief says it does not block the full-MVP tree. The topology question is marked
  non-blocking.
- **Wrote `.ai/specs/2026-11-10-fee-split-and-payouts.md`** with nine resolved autonomous defaults.
  Q1 chooses separate charges and transfers and is ⚠ NEEDS HUMAN CONFIRMATION, because the #38 spec
  makes the topology a founders' gate. Q2 adds a not-ready destination resolver, so nothing moves
  until #38 ships.
- **Ran a fresh-context staff review.** It raised one Critical and five High findings, all applied:
  - The transfer key and transfer group derive from the booking id, existing transfers are adopted,
    and the migration `down` refuses to drop a money ledger.
  - The payment state, including refunds and disputes, is re-read on every attempt.
  - The transfer id is stored on a mismatch.
  - An operator resolve action with an append-only `PayoutResolution` gives held rows a way out.
  - In-flight transfers get a lease.
  - PR #88 must merge first.
  - The backfill covers every paid booking.
- **Did not split the spec**, despite the review's suggestion. Phase 1 is marked as not gated on Q1
  instead.
- **Mockups:** static HTML for the mentor payouts page (desktop and 360 px) and the operator Payouts
  panel, rendered with agent-browser. Current-app screenshots were skipped: `/mentor/payouts` does not
  exist yet, and the admin panel is additive.

## Files

- `.ai/specs/2026-11-10-fee-split-and-payouts.md`
- `.ai/specs/assets/fee-split-and-payouts/mockup-0{1,2,3}-*.{html,png}`

## Outcome and follow-ups

- The spec PR is opened as a draft, gated on Q1. Implementation follows on a separate PR via
  `om-auto-implement-spec`.
- Dependencies: PR #88 (fee setting) must merge before Phase 1; #38 (Connect) is needed before any
  live transfer.
