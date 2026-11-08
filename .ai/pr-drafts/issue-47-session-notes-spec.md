Refs #47
Refs #48
Source doc: .ai/specs/2026-11-07-session-notes.md
Status: design only; implementation not started

## Goal

Define the private session-note lifecycle after the written answer: the mentor saves a draft and sends a fixed revision, and the mentee reads the submitted text awaiting approval. Slice A implements #47; slice B adds #48's decisions and redrafting in a separate implementation PR.

## Proposed behavior

- Save and send are separate actions. Booking-first transactions and expected revisions prevent concurrent creation, stale-tab overwrite and sending text the mentor has not reviewed. Sent text cannot change.
- Read access is limited to the booking's two parties, including unsent drafts. Mentees cannot edit; outsiders receive the existing session-style 404. A sent note stays private.
- Sending records one in-product notification; the awaiting mentor view keeps a Notify mentee action which can repair a failed notification after reload without changing submitted content or duplicating a successful notice. Email and guaranteed background delivery are not introduced.
- The existing NoteReview design and session screen are reused. Refresh note works after the transcript has stopped polling; response generations and current dirty-state checks prevent stale responses from undoing a saved/sent state or discarding edits. Approval/decline actions are added in #48, rather than nonfunctional controls in #47.

## Scope and compatibility

This PR contains design and project records only. It closes neither issue. The implementation design adds a note table, workflow routes, a notification kind and an event. It calls for risk-high review and human QA because it changes private-data scoping and schema. That does not make this documentation-only PR a runtime change.

## Resolved defaults

The specification records Q1–Q6 for override: shared lifecycle in two dependent slices, no edits after send, party-readable unsent drafts with decision controls deferred to #48, outsider 404, in-product-only notification, and explicit refresh rather than new polling. Publish the companion defaults comment on this PR and #47.

## Visual evidence

Mockups/current screenshots skipped: no generated test-environment descriptor exists in this worktree. The design references prototype s9/s10/s15 and existing NoteReview. No fresh application QA is claimed; implementation requires desktop and 320px evidence.

## Validation

Whitespace/diff inspection passed. Independent reviewer a7ce2438 found two medium gaps (notification recovery and client response ordering); both were addressed. Independent re-review 247ff468 approved the specification, closing both findings without new material defects. The review branches contain no edits. No runtime tests ran for this design-only change; implementation and human QA have not been verified.

## Breaking changes

None — design only. No application code or database migration ships in this PR.
