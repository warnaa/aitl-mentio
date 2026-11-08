# Execution plan: mentee decisions on private session notes (#48)

Source doc: .ai/specs/2026-11-07-session-notes.md
Issue: #48 (slice B; slice A #47 merged in ce53ea3)
Status: in-progress

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

- [ ] 1.1 Decision validators and optional expectedVersion
- [ ] 1.2 Approve, decline, redraft and history in SessionNoteService
- [ ] 1.3 Approve and decline routes

### Phase 2: Notifications, freeze and operator report

- [ ] 2.1 Version-aware notification migration and new kinds
- [ ] 2.2 Decision events and notification consumers
- [ ] 2.3 Answer freeze on approval
- [ ] 2.4 Aggregate operator decline report

### Phase 3: Screens

- [ ] 3.1 Mentee decision, mentor redraft, history and approved states
- [ ] 3.2 Frozen answer, notification copy, operator page and navigation

### Phase 4: Verification

- [ ] 4.1 Integration scenarios and compatibility record
- [ ] 4.2 Full gate, coverage and run outcome
