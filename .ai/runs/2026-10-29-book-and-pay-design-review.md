# Book and pay — design review

Date: 2026-10-29
Outcome: review complete; revise before implementation.

## Request and scope

Review `.ai/specs/2026-10-29-book-and-pay.md` for inconsistent or mutually exclusive
designs, anti-patterns, and unnecessary complexity. This is a document review; the
spec and application code are unchanged.

## Checklist

- [x] Read the complete spec, product rules, platform contracts, availability design,
  compatibility rules, and project lessons.
- [x] Cross-check rollout cohesion with the fresh-context reviewer required by
  `om-spec-writing`.
- [x] Check current HTTP/auth primitives and installed Next.js refresh guidance.
- [x] Finish concurrency, crash recovery, and hold-lifecycle analysis.
- [x] Record severity-ranked findings, corrections, and simplification recommendations.

## Verdict

Revise. The scope is supported by existing product decisions, but payment reconciliation,
hold release, lock ordering, and rollout readiness contain incompatible contracts.
Four PRs and the mock checkout are recorded gate choices; their existence is not a defect.

## Findings

### High — charge reconciliation can bypass the start-time cutoff

Spec lines 55 and 222 allow a successful charge to make a `paying` booking `paid`,
including a repeated pay. Lines 59 and 411 instead require a booking still `paying`
at its start to fail and refund any successful charge. The implementation sequence at
357 reconciles before applying the cutoff, and pay at 355 has no cutoff check.

Counterexample: a charge succeeds, the process crashes before applying that result to
the booking, and the mentee returns after the slot starts. Reconciliation can set
`paid`, so the later cutoff no longer sees `paying`. A pay begun before the start
whose gateway call returns after it creates the same problem.

Correction: use one time-aware, transactional charge-result reconciler from both pay
and settle. Under the relevant locks, decide between `paid` and the missed-start
refund path before changing the booking. Test a stored successful charge recovered
after the start, a gateway response crossing the start, and concurrent pay/settle.

### High — an unavailable gateway defeats the promised cutoff

Line 59 says a `paying` booking cannot be held beyond the start, then explicitly leaves
it `paying` if the gateway remains unavailable. Its indefinite hold (167) and the R17
index (163) remain active. Even an actual visit after the start cannot release the slot
or unblock the mentee, contrary to the completion criterion at 411.

Correction: separate ending the reservation from confirming money movement. At the
cutoff, release the hold and remove the booking from unpaid-slot enforcement while
retaining the pending charge intent. Later recovery must refund a confirmed charge
without resurrecting the booking. Existing `payment_failed` plus pending charge/refund
may suffice; a new generic state engine is unnecessary. If indefinite blocking is
intentional, make that exception explicit in R20 and the completion criteria instead.

This finding concerns a visit where settlement actually runs. The absence of timers,
and settlement waiting for a visit, are accepted product decisions, not defects.

### High — slot-first ordering does not cover multi-slot expiry cleanup

Lines 122–123 require releasing transitions to use the hold-release helper and lock
the slot before booking rows; create also expires the mentee's old unpaid booking
(181, 354). That old booking can belong to a different slot. No global ordering is
specified for multiple slot or booking rows, so the statement that transitions cannot
deadlock (182) does not follow.

Counterexample if expiry cleanup follows the required release discipline: M has an
expired hold on A and creates on B; N has an expired hold on B and creates on A.
M locks B and needs A to release the old hold, while N locks A and needs B.
Skipping the old-slot lock/release would require an explicit exception to the stated
transition discipline. Locking multiple booking rows also needs a consistent order.

Correction: expire the former hold in a separate transaction that touches just its
slot, then create under the target-slot lock with R17's constraint as the final
arbiter; alternatively discover all involved rows, acquire slot locks and then booking
locks in deterministic order, and re-check. Test two mentees swapping expired holds
on distinct slots; the same-slot test at 369 does not cover this case.

### High — missing public links are treated as a rollout gate

Phase 2 at 329 claims no mentee can reach a paid booking without a mentor screen
because public pages do not link to it. Yet Phase 1 exposes authenticated create/pay
APIs and Phase 2 explicitly supports direct URLs. Public slot DTOs already expose
the identifiers needed for those URLs (E01 spec:123).

Correction: enforce mentor-handling readiness on the server for creation/payment,
or keep these phases off shared deployments until #19 is available. Missing links
can guide navigation but cannot enforce the stated readiness guarantee. A local/test
deployment can still exercise early phases without introducing a permanent flag.

### High — public enablement precedes the promised cancellation rule

Phase 3 at 330 opens booking while paid cancellation is unavailable until Phase 4.
The form at 246 already promises free cancellation until acceptance and then up to
12 hours before the start. Active product-brief R14 (146) requires that cancellation;
SDLC.md:71 requires an owner-approved superseding entry for a departure. The visible
Q1 gate record accepts four PRs, but does not record a temporary R14 exception.

Correction: require #20 readiness before enabling the paid flow; Phases 3 and 4 may
share a PR as line 333 already permits. If the product owner explicitly authorizes
temporary unavailability, record the exception and make the form copy phase-specific.
Changing only the booking-detail notice does not fix the earlier promise.

### Medium — nullable slot history lacks a recovery/locking branch

Line 157 permits `slot_id` to become null after a finished booking releases its slot.
A cancelled booking can still have a pending refund, or a cutoff-failed booking can
still need refund settlement. Lines 122–123 describe transitions starting from a
booking by finding and locking its slot, while 223–224 promise repeat cancellation
and settlement. The recipe does not say how those operations work after slot deletion.

Correction: specify that terminal refund recovery and idempotent responses work with
`slot_id = null`, using the booking and payment intent without requiring a slot. Handle
a slot disappearing between the initial read and lock acquisition. Test cancel with
a pending refund → mentor deletes the released slot → settle completes the refund.
This is a missing design branch, not an observed implementation failure.

### Medium — deterministic references do not ensure stable mock outcomes

Lines 65 and 116 claim the stateless mock preserves idempotency across restarts by
hashing the operation key. However its success/decline result depends on the deployment's
`PAYMENTS_MOCK_FAILURE`. B10 (platform spec:236) requires replaying the original
confirmed result, not merely reusing its reference.

Counterexample: the mock returns success, the process crashes before storing it,
and it restarts with `charge_declined` enabled. Replaying the still-pending ledger
operation now records failure. The app ledger cannot recover an outcome it never
recorded, and changing transient QA failure modes is already part of exercising recovery.

Correction: define stable terminal outcomes for each immutable operation across the
supported restart/configuration cases. Keep transient fault injection separate from
terminal outcome selection, or explicitly scope QA configuration changes and test the
remaining guarantee. Choose one concrete strategy; do not add a second generic ledger
merely to retain an unnecessary statelessness claim. Test success-before-local-recording
across a restart/config change, not just equality of `providerRef`.

### Medium — cancellation at the session start has opposing API contracts

The cancellation table at 231 permits `paid` bookings to receive a full refund at
any time. The API failures at 223 say cancellation is disallowed after the session
starts. At that time an unaccepted booking is also due for R12's decline/refund.
These imply different outcomes for the same stored `paid` booking at or after its start.

Correction: define the precedence of due R12 settlement versus explicit cancellation,
then align the table, `cancellation.allowed`, expected-outcome check, and response code.
Test unaccepted `paid` and accepted bookings at the exact start. Integrate this rule
with E03 before Phase 4 rather than introducing another independent time-policy path.

## Complexity recommendations

- Consolidate charge application, crash reconciliation, and cutoff policy into one
  concrete booking routine. Separate entry points are useful; separate implementations
  of the same decision invite drift.
- Prefer public enablement after both mentor handling and cancellation. A dedicated
  links-only rollout phase adds coordination while failing to enforce readiness.
- Keep the port and durable payment intent: B8–B10 require them and this spec has an
  immediate consumer. The earnings row also has an immediate late-cancellation consumer;
  neither is gratuitous scaffolding solely because later epics reuse it.
- Keep the chosen slot-local hold if desired, but explicitly define expiry cleanup and
  null-slot recovery. Do not add a second authoritative hold mechanism or a generic
  transition framework to patch these gaps.
- The Stripe rewrite is explicitly accepted. Treat exact preservation of current
  statuses and holds (293) as an assumption for D14 to revisit, rather than a reason
  to build a speculative webhook/checkout framework now.

## Review limits

Examined the complete target spec, product brief, platform primitives and E01 specs,
AGENTS.md rules, SDLC.md, BACKWARD_COMPATIBILITY.md, project lessons, existing HTTP/auth
code, and the installed Next.js `useRouter` guide. A fresh-context scope reviewer
independently corroborated the two rollout findings.

Booking/payments entities and services are not implemented in this checkout. The
concurrency and crash scenarios above are design counterexamples, not executed
integration tests. No implementation validation gate was run for this document-only
review. Accounts, E03, and D14's future contracts were not available as completed specs;
their absence alone is not reported as a defect. The target spec and code are unchanged.

## Needs from you

None for completing the review. Before implementation, resolve the findings and follow
the spec's existing owner-approval prerequisites for R20/R21 and the E03 contract.
