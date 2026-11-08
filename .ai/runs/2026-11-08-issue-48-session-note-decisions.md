# Execution plan: mentee decisions on private session notes (#48)

Source doc: .ai/specs/2026-11-07-session-notes.md
Issue: #48 (slice B; slice A #47 merged in ce53ea3)
Status: complete

## Goal

The mentee approves the exact sent note version in full or declines it with a mandatory comment. The mentor redrafts after a decline as a new version. An approved note stays private to both parties and freezes the written answer. The operator reads decline counts only.

## Scope

- db: version-aware notification identity (`note_version`), kinds `note_approved` and `note_declined`, reversible migration.
- core: decision validators, approve/decline/redraft transitions, history on read, operator decline report, ID-only events, consumers, answer freeze in `TextSessionService`.
- app: approve/decline routes, decision/redraft/history/approved UI in `SessionNotePanel`, frozen answer UI, `/admin/sessions`, navigation, notification copy.
- ui: `CrudForm` `canSubmit` so the decline submit is disabled while the comment is empty.

## Non-goals

Publishing or a vault, co-editing, export, email for note decisions, note bodies for operators, rich text.

## Implementation Plan

Phase 1 delivers B1, Phase 2 B2, Phase 3 B3. Phase 4 runs the gate and integration evidence.

## Risks

- Risk-high by `SDLC.md`: schema migration and private-data scoping. Human QA stays required.
- Rollback order: run this migration down before reverting code; it removes the new notification kinds and later-version notifications.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Decisions and redraft

- [x] 1.1 Decision validators and optional expectedVersion
- [x] 1.2 Approve, decline, redraft and history in SessionNoteService
- [x] 1.3 Approve and decline routes

### Phase 2: Notifications, freeze and operator report

- [x] 2.1 Version-aware notification migration and new kinds
- [x] 2.2 Decision events and notification consumers
- [x] 2.3 Answer freeze on approval
- [x] 2.4 Aggregate operator decline report

### Phase 3: Screens

- [x] 3.1 Mentee decision, mentor redraft, history and approved states
- [x] 3.2 Frozen answer, notification copy, operator page and navigation

### Phase 4: Verification

- [x] 4.1 Integration scenarios and compatibility record
- [x] 4.2 Full gate, coverage and run outcome

## Outcome

All steps implemented on feat/issue-48-session-note-decisions, last implementation commit before this record b2377d6 plus the session-read fix. Verification and one unexplained intermittent NOTES-012 failure are in .ai/qa/NOTE-DECISIONS/report.md. Follow-up: human QA.
