# Implementing booking payments

Source doc: .ai/specs/2026-11-06-booking-payments.md
Issue: https://github.com/warnaa/aitl-mentio/issues/41
Engine: om-auto-create-pr (steps: 9, --loop: no)

## Goal and scope
Implement the owner-approved Checkout, durable payment confirmation, protected occupancy, participant visibility and operator exception recovery from the payment spec. Include #53's real provider adapter. Analytics remains an explicitly separate capability with its metric policy undecided; this implementation must not claim to close all of #41. No merge or deployment.

## Approval and constraints
The owner confirmed Q1/Q2 in chat on 2026-11-06. The subsequent GitHub claim attempt was rejected by automatic approval review because that reply did not explicitly authorize remote writes. A separate remote-write permission question is pending; do not write to GitHub or push before it is answered. No remote lock exists. Local implementation proceeds in an isolated sibling checkout. The untracked source spec is materialized for reference and must not be committed on the implementation branch; it belongs to the separate spec branch.

## Risks and verification
Money and schema are risk-high. Preserve mentor→slot lock order, immutable payment attempts, provider verification and fail-closed production configuration. Test failed, retried, duplicate/concurrent and late provider paths plus real PostgreSQL migrations/concurrency. Run typecheck/lint/test/build, per-file coverage and integration suites. A second person's money review and manual QA approval remain mandatory; automated evidence cannot self-approve this risk-high feature.

## Progress

### Phase 1: Durable payment foundation
- [ ] 1.1 Add payment entities, reversible migration and protected occupancy.
- [ ] 1.2 Add gateway port and transactional payment lifecycle/recovery.

### Phase 2: Provider and application boundaries
- [ ] 2.1 Add fail-closed config, explicit DI and real Stripe/mock adapters.
- [ ] 2.2 Add guarded Checkout, webhook, reconciliation and operator resolution routes.

### Phase 3: Participant and operator experience
- [ ] 3.1 Add prototype-aligned Checkout, booking visibility and operator exception UI.
- [ ] 3.2 Add documented integration/money/concurrency scenarios.

### Phase 4: Verification and publication
- [ ] 4.1 Update compatibility, environment documentation, scheduling runbook and threat model.
- [ ] 4.2 Run configured gate, per-file coverage and integration suite; fix failures.
- [ ] 4.3 Run independent review and browser QA; publish fully reported PRs when remote approval exists.
