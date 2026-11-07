# Mentor drafts and sends a private session note

Closes #47
Refs #48
Refs #78
Source doc: .ai/specs/2026-11-07-session-notes.md (design-only PR #78, separate branch)
Tracking plan: .ai/runs/2026-11-07-issue-47-session-notes.md
Status: in-progress; local draft only, no publication authorized

A booking's mentor can save a private session-note draft after posting the written answer and send its exact saved revision. Both parties read that immutable submission awaiting approval. The mentee has no body editor or inactive decision controls. Approval, decline, redraft, operator counts and answer freeze are deferred to #48.

The service locks the booking before loading parties and the latest note, checks exact revisions and emits an ID-only event after commit. Notes use private no-store responses and party-only access (404 outsiders, 403 mentee writes). A replayable in-product notification and the reachable Notify mentee action recover lost delivery without changing readAt or the submitted snapshot. Client request generations and monotonic version/revision/status checks preserve dirty edits and reject stale responses.

Validation: pending final gate, full per-file coverage, PostgreSQL races and browser matrix. Final results and sanitized evidence will be recorded here before review. Risk high: private data scoping and schema migration. Human QA pending; no qa-approved or self-signoff.

Rollback and additive contracts are documented in BACKWARD_COMPATIBILITY.md. No spec document is staged by implementation commits. No pushes, tracker mutations, external uploads or deployments performed.
