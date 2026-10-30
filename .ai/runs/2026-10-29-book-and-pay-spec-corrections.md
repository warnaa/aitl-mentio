# Book and pay — apply design review corrections

Started: 2026-10-29
Completed: 2026-10-30
Outcome: done — specification corrections applied; implementation remains future work.

## Request

Apply all eight findings from the book-and-pay design review and its simplification
recommendations. Preserve the existing decision-round edits in the shared workspace:
three phases, cancellation with booking links, no mock failure switch, no refund-failure
contact, and an account permitted to hold both roles.

## Checklist

- [x] Read the current spec, product approvals, review, platform contracts, and lessons.
- [x] Define one time-aware payment reconciliation and recovery path.
- [x] Bound payment holds and keep unresolved charges recoverable after release.
- [x] Separate old-hold cleanup and handle deleted slots.
- [x] Make shared deployment require mentor handling and cancellation together.
- [x] Align mock guarantees, cancellation boundaries, UI, tests, and completion criteria.
- [x] Record the superseding product rule, cross-check scope, and verify the diff.

## Plan

Update the existing feature spec and product-rule rows; retain the ledger, slot-local
hold and existing `BOOKINGS_ENABLED` gate without adding another framework or flag.
Early PRs are mergeable foundations, enabled only in isolated environments; shared
booking enablement waits for the complete third phase and #19. Record R22 as the
user-authorized correction superseding R20's unbounded started-payment hold. Preserve
historical review findings. The gate was added by existing workspace edits during the
run and retained; no earlier decision-round changes were discarded.

## Corrections applied

| Finding | Final correction |
|---|---|
| Charge reconciliation bypasses cutoff | One `reconcileWithin` checks locked time before making a booking paid; pay/settle share bounded recovery and reconcile before calls and after charge results |
| Unavailable gateway blocks release | Paying hold has `startsAt` deadline; due state closes independently of gateway; later charge success refunds without revival; R22 supersedes R20 |
| Cross-slot expiry deadlock | `closeOwnDueUnpaid` commits in its own one-slot transaction; target-slot creation starts afterward; ordered existing booking locks and swap tests |
| Missing links used as readiness gate | Existing default-off server gate blocks create and new charge intent, including direct URLs/APIs; existing recovery remains enabled |
| Cancellation ships after promise | Three-phase delivery keeps cancellation and links together; shared enablement requires #19 and the full third phase deployment |
| Nullable slot recovery undefined | Booking-only re-read if the slot disappears; recovery uses stored snapshots and never acquires a slot after booking lock; deletion/race acceptance tests |
| Mock result stability incomplete | Always-successful adapter, no runtime fault switch, restart/concurrent outcome tests, injected failure fakes; store immutable charge description with the intent |
| Cancellation at start contradicts R12 | Apply R12 before new cancellation, commit decline/refund intent before refusal; prior successful cancellations remain replayable after start/deletion |

The UI uses concrete `needsSettlement` rather than guessing solely from status,
shows pending money after cutoff accurately, exposes retry for pending `200` results,
and performs one automatic attempt per mount without a refresh loop. The spec retains
durable intent and earnings with immediate consumers, adds no generic state machine,
and leaves Stripe's exact lifecycle and migration to D14.

## Files touched

- `.ai/specs/2026-10-29-book-and-pay.md`: behavior, locking, recovery, API/DTO,
  UI, phasing, planned acceptance tests, completion criteria and review status.
- `.ai/specs/product-brief.md`: preserve R20 as superseded, add active R22 and
  record the correction update; keep R21 intact.
- `.ai/data-model/2026-10-29-book-and-pay.html`: synchronize nullable booking slot,
  immutable payment description and hold deadlines with the spec.
- `.ai/lessons.md`: record the resource-deadline/money-recovery design lesson.
- This run log. The previous review remains a historical record.

## Verification

Fresh-context scope review found no remaining scope-cohesion blockers. Read-only
document checks passed: three phases, balanced code fences, no stale charge/expiry
routine names or indefinite paying-hold wording, current recovery contracts, R20/R22
superseding relationship and valid graph JSON with five nodes and valid edge references.
`git diff --check` passed. The graph remains a convenience view; its Mermaid relations
are unchanged and authoritative.

No application code, tests or migrations were changed or executed. The expanded tests
are implementation acceptance requirements, not claims of passing runtime behavior.
The spec remains active rather than being moved to `implemented/`.

## Needs from you

None for these authorized document corrections. Implementation still depends on the
accounts and E03 specs and their existing readiness checks.
