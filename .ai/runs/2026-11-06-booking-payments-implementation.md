# Implementing booking payments

Source doc: .ai/specs/2026-11-06-booking-payments.md
Issue: https://github.com/warnaa/aitl-mentio/issues/41
Engine: om-auto-create-pr (steps: 10, --loop: no)

## Goal and scope
Implement the owner-approved Checkout, durable payment confirmation, protected occupancy, participant visibility and operator exception recovery from the payment spec. Include #53's real provider adapter. On 2026-11-06 the owner additionally chose both labelled weekly operator views; the separate paid-session-reporting spec defines that read-only capability, implemented in this same issue PR. Neither view selects an official D16 metric. No merge or deployment.

## Approval and constraints
The owner confirmed Q1/Q2 in chat on 2026-11-06. Automatic approval review initially rejected GitHub writes because that reply only approved policy. The owner subsequently explicitly replied “Approve those GitHub writes” to the permission request for issue assignment/labels/comments, branch pushes and spec/implementation PR writes. Issue #41 was claimed; spec draft PR #71 and implementation draft PR #72 were opened and linked to the thread. No merge or deployment is authorized. The untracked source spec is materialized for reference and must not be committed on the implementation branch; it belongs to the separate spec branch.

## Risks and verification
Money and schema are risk-high. Preserve mentor→slot lock order, immutable payment attempts, provider verification and fail-closed production configuration. Test failed, retried, duplicate/concurrent and late provider paths plus real PostgreSQL migrations/concurrency. Run typecheck/lint/test/build, per-file coverage and integration suites. A second person's money review and manual QA approval remain mandatory; automated evidence cannot self-approve this risk-high feature.

## Progress

### Phase 1: Durable payment foundation
- [x] 1.1 Add payment entities, reversible migration and protected occupancy. — fe7b404
- [x] 1.2 Add gateway port and transactional payment lifecycle/recovery. — 2166be0

### Phase 2: Provider and application boundaries
- [x] 2.1 Add fail-closed config, explicit DI and real Stripe/mock adapters. — 6c0875f
- [x] 2.2 Add guarded Checkout, webhook, reconciliation and operator resolution routes. — 6c0875f

### Phase 3: Participant and operator experience
- [x] 3.1 Add prototype-aligned Checkout, booking visibility and operator exception UI. — 31594f5
- [x] 3.2 Add documented integration/money/concurrency scenarios. — 56279fe
- [x] 3.3 Add both owner-requested weekly paid-session views and booking-to-start median from the separate reporting spec. — 983a351

### Phase 4: Verification and publication
- [x] 4.1 Update compatibility, environment documentation, scheduling runbook and threat model. — prepared with final evidence; threat model and source designs are on PR #71.
- [x] 4.2 Run configured gate, per-file coverage and integration suite; fix failures. — final configured gate passed; full 81-test integration plus final-source four-case scoped pass.
- [ ] 4.3 Run independent review and browser QA; publish fully reported PRs when remote approval exists.

## Verification record
Final configured gate passed in order on 2026-11-06: typecheck, lint (zero errors), npm test (1,584 tests in 181 files plus four native Node tests), then production build including the report route. Lint had two unchanged baseline warnings and one warning in an ignored disposable QA exploration script; that script is not staged. Full per-file coverage including reporting passed 100% statements/branches/functions/lines with 1,583 tests; the later additional real-SDK signature test also passed and was included in the final 1,584-test run. No production source changed between the coverage run and final configured gate.

The final-source scoped native integration pass succeeded with four files/four tests in 38.73 seconds: Warsaw dual-week/median aggregation, definitive rejected creation, operator-only report API and the existing admin browser consumer. This supplements the earlier full native 81-test/40-file pass, whose source boundary is preserved below. Final-source browser exploration observed report 200/401/403, populated and empty reports, review and denied states, keyboard refresh, and 320px layouts without horizontal overflow. Explicitly injected browser-fetch faults covered UI loading/error feedback; they are not evidence of a real provider outage. Native helper/app/browser sessions and owned disposable databases were stopped. The developer database was not touched.

Migration-test snapshot normalization/churn was restored to the committed ORM-generated snapshot after tests; the intended tables, fields, counters and both generated migrations remain committed. No source spec was committed on this implementation branch; the paired source designs are on #71. Human money review, manual risk-high QA and any production Stripe smoke/deployment remain outside this automated sign-off.

### Earlier verification and recovery history
The first full application unit pass completed with 1,563 Vitest tests passing and the native CI classifier's four Node tests passing. Coverage initially fell short only in new env/container branches; those cases were added. The final focused rejection/refund/configuration/lifecycle run passed 129 tests across 11 files with 100% statements, branches, functions and lines. At that point the full final gate was pending. Production build passed before the final rejection/refund proof changes; the shared test environment then rebuilt the frozen final source.

Independent reviews found and drove fixes for readiness-before-intent, authoritative refund truth instead of webhook snapshots, malformed UUID metadata, persona scoping, definitive rejected creation recovery, completed-refund evidence and hidden SDK retries. Definitive-rejection accounting now uses durable submission/rejection counters; SDK retries are disabled so each possible submission is accounted for. Review findings are not human money-review approval.

Native shared-environment cold startup ran npm ci concurrently with a parent Vitest process, causing a Windows locked rolldown module and a partial dependency tree. Parent paused runners, moved only this checkout's node_modules into ignored `.ai/qa/test-env-runtime/dependencies-stale` (preserving locked files), and restored dependencies with npm ci. Startup then reached a successful build but rejected source freshness; a retry against frozen source was required. These failed runs are not integration passes. Disposable runtime backup and env state remain ignored.

The backup was later nested under `.ai/qa/test-env-runtime/dependencies-backup/node_modules` so default lint discovery also excludes its third-party JavaScript. An earlier lint traversal of the backup was stopped; the subsequent lint passed with only the two existing warnings. An existing CrudForm asynchronous focus assertion raced its React effect under parallel load; it now waits for the promised focus outcome and the full unit suite passed.

Final pre-report full native integration run passed 81 tests in 40 files, exit0,848.86s; this includes all twelve Checkout/recovery/migration cases and the fixed concurrent-retry regression. Its build predates the additional owner-requested report, so reporting019/rejection020 and the admin consumer receive a final-source scoped native pass. The latest full unit/coverage run including reporting passed 1583 Vitest tests plus four native Node tests, with100% statements/branches/functions/lines. Typecheck and lint passed. Final-source build/browser reporting evidence was still pending at that checkpoint and subsequently passed as recorded above.

Dependency audit found28 advisories (19moderate,7high,2critical), matching the unchanged base lock exactly. Stripe has no reported advisory. No unrelated dependency upgrade or audit fix was applied.
