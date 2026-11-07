# Mentor drafts and sends a private session note

Closes #47
Refs #48
Refs #78
Source doc: .ai/specs/2026-11-07-session-notes.md (design-only PR #78, separate branch)
Tracking plan: .ai/runs/2026-11-07-issue-47-session-notes.md
Status: final full integration running; local draft only, no publication authorized

A booking's mentor can save a private session-note draft after posting the written answer and send its exact saved revision. Both parties read that immutable submission awaiting approval. The mentee has no body editor or inactive decision controls. Approval, decline, redraft, operator counts and answer freeze are deferred to #48.

The service locks the booking before loading parties and the latest note, checks exact revisions and emits an ID-only event after commit. Notes use private no-store responses and party-only access (404 outsiders, 403 mentee writes). A replayable in-product notification and the reachable Notify mentee action recover lost delivery without changing readAt or the submitted snapshot. Client request generations and monotonic version/revision/status checks preserve dirty edits and reject stale responses.

Validation: typecheck, lint, test and build exited 0; 1783 unit tests and configured per-file 100% statements/branches/functions/lines passed. PostgreSQL save/save and save/send races, exact-revision/private-access/rate-limit cases, notification failure/replay and real browser desktop/320px flows passed. Corrected migration round trip and real loading/storage-error/Retry/log-masking cases also passed focused integration. Final full-suite result is pending; see .ai/qa/NOTES/report.md and validation-gate.log for exact commands and prior failures. Risk high: private data scoping and schema migration. Human QA pending; no qa-approved or self-signoff.

Rollback and additive contracts are documented in BACKWARD_COMPATIBILITY.md. No spec document is staged by implementation commits. No pushes, tracker mutations, external uploads or deployments performed.

Proposed publication labels (not applied): review, feature, needs-qa, priority-medium, risk-high. Parent performs fresh independent implementation review; human QA remains pending.
