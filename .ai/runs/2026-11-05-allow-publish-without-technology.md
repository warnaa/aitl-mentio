# Allow publishing a mentor page without a technology

Date: 2026-11-05
Branch: `feat/allow-publish-without-technology`
Base: `main`

## Request

"I want to test breaking integration tests so modify the app - without adjusting
the integration tests - that the user can publish page without any technology
selected."

This is a deliberate pipeline exercise: the product change is real, and the
integration suite under `tests/integration/` is intentionally left untouched so it
can be observed failing (TC-MENTOR-PAGE-002 expects the publish refusal to list
`stackTags` among the missing fields).

## Goal

A mentor can publish their page with an empty technology list; public work link
and description stay required.

## Scope

- `packages/core/src/services/mentors/readiness.ts` — drop the `stackTags` rule
  from `mentorPagePublishable` (the server publish gate, which also feeds the
  workspace checklist and the offer readiness).
- `packages/ui/src/components/mentors/MentorProfileEditor.tsx` — technologies
  become optional in the editor (no required marker, no `min(1)` in the default
  schema).
- `packages/app/src/app/(mentor)/mentor/profile/MentorProfileWorkspace.tsx` — the
  "Publish when you are ready" copy stops listing a technology as required.
- Unit tests for the above.

## Non-goals

- No changes under `tests/integration/` (explicit user requirement).
- No DB migration: `mentor_profiles.stack_tags` already accepts an empty array.
- No change to the 4-tag maximum or the allowed tag values.
- No spec: small, obvious rule removal.

## Risks

- TC-MENTOR-PAGE-002 is expected to fail in the integration suite; that is the
  point of the run, and is reported rather than fixed.
- Public views must render cleanly with no technology chips (already handled by
  `stackTags.length > 0` guards; verify).

## Implementation Plan

### Phase 1: Relax the publish gate

1. Remove the `stackTags` readiness rule and update core unit tests.

### Phase 2: Make technologies optional in the UI

1. Make the editor's technology group optional and update its tests.
2. Update the workspace publish copy and its tests.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Relax the publish gate

- [x] 1.1 Remove the stackTags readiness rule and update core unit tests — 5235a6e, e0291de

### Phase 2: Make technologies optional in the UI

- [x] 2.1 Make the editor technology group optional and update its tests — 4e9014c
- [x] 2.2 Update the workspace publish copy and its tests — a97ddf3

## Outcome

- Validation gate (`typecheck`, `lint`, `test`, `build`): green; 152 files /
  1468 unit tests passed; lint shows 2 pre-existing warnings in untouched files.
- `tests/integration/mentor-page.integration.test.ts`: 3 passed, 1 failed, as
  intended — TC-MENTOR-PAGE-002 receives `['bio', 'publicWorkUrl']` where it
  expects `['bio', 'publicWorkUrl', 'stackTags']`.

## Follow-ups

- If this behaviour is kept, TC-MENTOR-PAGE-002 needs its expectation updated;
  left untouched on purpose for this run.
