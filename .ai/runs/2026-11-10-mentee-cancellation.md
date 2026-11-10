# 2026-11-10 — Mentee cancellation (#43), feature route

## Request
`om-auto-fix-issue 43`: deliver E03-S05, where a mentee cancels free up to 24 hours before a session and a later cancellation forfeits the fee.

## Work
- Classified #43 as a feature request. The feature-route triage passed: the issue was not claimed, no cancellation or refund code existed, no spec covered it, and the ticket-level Definition of Ready was met.
- Claimed #43, then wrote `.ai/specs/2026-11-10-mentee-cancellation.md` with `om-spec-writing --autonomous`, plus a static mockup.
- A fresh-context skeptical review found one critical, two high, three medium and three low issues. All are addressed in the spec. The main ones: the R09/D10 contradiction, now raised as ⚠ Q8; double refunds after Stripe idempotency keys expire, now prevented by checking existing refunds first; and stranded pending refunds, now covered by `reconcileAll` and a scheduler precondition.
- Opened draft spec PR #91 (`Refs #43`) with labels `review`, `documentation`, `skip-qa`, `priority-medium` and `risk-low`, plus the assumption, evidence and summary comments, then released the issue lock.

## Files
- `.ai/specs/2026-11-10-mentee-cancellation.md`
- `.ai/specs/assets/mentee-cancellation/mockup-cancellation.{html,png}`

## Outcome
The spec is published as draft PR #91. Implementation is gated on ⚠ Q8: founder A must approve a superseding R09/D10 entry for automatic refunds, or choose the manual-refund fallback.

## Follow-ups
- Answer Q8, then run `om-auto-implement-spec .ai/specs/2026-11-10-mentee-cancellation.md`.
- Later slices: a `charge.refunded` webhook (Q3), an operator action to mark a manual refund done (Q6), refunded-session reporting (Q7) and mentor-initiated cancellation.
- Tooling: `jq` is missing on this Windows host, so the tracker descriptor's `remove_label` and `attach-image-evidence` snippets fail. Node was used as a workaround.
