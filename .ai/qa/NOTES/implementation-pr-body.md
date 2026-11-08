# Mentor drafts and sends a private session note

Closes #47
Refs #48
Refs #78
Source doc: .ai/specs/2026-11-07-session-notes.md (design-only PR #78, separate branch)
Tracking plan: .ai/runs/2026-11-07-issue-47-session-notes.md
Status: complete locally; root acceptance and human QA pending; local draft only, no publication authorized

A booking's mentor can save a private session-note draft after posting the written answer and send its exact saved revision. Both parties read that immutable submission awaiting approval. The mentee has no body editor or inactive decision controls. Approval, decline, redraft, operator counts and answer freeze are deferred to #48.

The service preauthorizes the confirmed mentor party and consumes the account limiter outside the transaction, then uses a fresh ID-only booking lock to recheck current status, parties, mentor, answer and exact revision. It emits an ID-only event after commit. Notes use private no-store responses and party-only access (404 outsiders, 403 mentee writes). A replayable in-product notification and the reachable Notify mentee action recover lost delivery without changing readAt or the submitted snapshot. Client request generations and monotonic version/revision/status checks preserve dirty edits and reject stale responses.

Validation at source 9aff0c6: fresh ordered typecheck/lint/test/build and test:unit:coverage exited 0; 210 unit files / 1786 tests plus four native classifier tests, and per-file 100% statements/branches/functions/lines (3835/2332/1105/3432). Real shared max-one pool save/send/replay and six create saves saturating max-five app pool passed, as did migration up/down/up in a focused 3-test run (99 excluded). The max-one regression intentionally failed old source in RateLimiter connection acquisition. Fresh FULL integration exited 0: 50 files / 102 tests passed, zero failures/skips (940.92s). Independent source reviewer fb4c4657 APPROVE at9aff0c6, no blocker/major. Its minor test cleanup recommendation is addressed in ffffcd6; fresh typecheck/lint and both affected real-pool tests exited0 (2 tests/1 file,34.39s); narrow reviewer03ed4a4c APPROVE, no remaining findings. Prior full integration failure/interruption remains historical evidence, never counted green. See .ai/qa/NOTES/report.md and recovery logs. Risk high: private data scoping and schema migration. Human QA pending; no qa-approved or self-signoff.

Rollback and additive contracts are documented in BACKWARD_COMPATIBILITY.md. No spec document is staged by implementation commits. No pushes, tracker mutations, external uploads or deployments performed.

Proposed publication labels (not applied): review, feature, needs-qa, priority-medium, risk-high. Independent source review and final cleanup review approve; parent acceptance and human QA remain pending.
