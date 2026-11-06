# INVITATION-009: hide self service mentor grant

- **Area:** INVITATION
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/2026-09-08-mentors-become-bookable.md).
- **Implementation:** [TypeScript test](../../../tests/integration/invitations.integration.test.ts)
- **Executable case:** `TC-INVITATION-003 a signed-in user finds no path to become a mentor (R07) / offers a mentee no invitation, application or mentor link`
- **Native executable ID:** `TC-INVITATION-003`.
- **Prerequisites:** a fresh signed-in mentee without an invitation; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing time-based fixture creation uses the real clock (future times or invitation TTL); boundary clocks are not frozen. Some historical files set local timeout overrides, contrary to current shared-runner policy.

## Given-When-Then

```gherkin
Given a fresh signed-in mentee without an invitation
When open /home and inspect Workspace navigation
Then No mentor, become, apply or invitation link/button is exposed. The navigation landmark must exist before absence is asserted.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare a fresh signed-in mentee without an invitation. | The prerequisite state exists inside the owned integration environment. |
| 2 | open /home and inspect Workspace navigation. | No mentor, become, apply or invitation link/button is exposed. The navigation landmark must exist before absence is asserted. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This is the R07 navigation boundary; API permission guards are covered separately. It does not claim that hiding actions enforces authorization.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [INVITATION-004](INVITATION-004-accept-invitation-and-refresh-session.md), [INVITATION-005](INVITATION-005-hide-unknown-invitation-details.md), [INVITATION-006](INVITATION-006-deny-invitation-to-other-email.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
