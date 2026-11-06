# INVITATION-004: accept invitation and refresh session

- **Area:** INVITATION
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/2026-09-08-mentors-become-bookable.md).
- **Implementation:** [TypeScript test](../../../tests/integration/invitations.integration.test.ts)
- **Executable case:** `TC-INVITATION-001 accepting an invitation makes a signed-in user a mentor / lands on the mentor home with the publish-by date and stays signed in with both roles`
- **Native executable ID:** `TC-INVITATION-001`.
- **Prerequisites:** an owned signed-in account and an operator-created invitation for that address; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing time-based fixture creation uses the real clock (future times or invitation TTL); boundary clocks are not frozen. Some historical files set local timeout overrides, contrary to current shared-runner policy.

## Given-When-Then

```gherkin
Given an owned signed-in account and an operator-created invitation for that address
When open the invitation, accept it and revisit the consumed link
Then The user reaches /mentor with Publish by and both mentee/mentor navigation. The session cookie changes and remains valid. The consumed link shows the generic invalid message and a repeat acceptance returns 404. Mobile and desktop screenshots are captured.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare an owned signed-in account and an operator-created invitation for that address. | The prerequisite state exists inside the owned integration environment. |
| 2 | open the invitation, accept it and revisit the consumed link. | The user reaches /mentor with Publish by and both mentee/mentor navigation. The session cookie changes and remains valid. The consumed link shows the generic invalid message and a repeat acceptance returns 404. Mobile and desktop screenshots are captured. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

Session-version refresh and repeat consumption are part of this one role-grant flow. Other-account/CSRF denial and contention are separate invitation cases.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [INVITATION-005](INVITATION-005-hide-unknown-invitation-details.md), [INVITATION-006](INVITATION-006-deny-invitation-to-other-email.md), [INVITATION-007](INVITATION-007-serialize-simultaneous-acceptance.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
