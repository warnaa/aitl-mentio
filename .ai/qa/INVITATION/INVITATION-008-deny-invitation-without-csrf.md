# INVITATION-008: deny invitation without csrf

- **Area:** INVITATION
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/2026-09-08-mentors-become-bookable.md).
- **Implementation:** [TypeScript test](../../../tests/integration/invitations.integration.test.ts)
- **Executable case:** `TC-INVITATION-002 invalid invitations grant nothing / refuses acceptance without the CSRF header`
- **Native executable ID:** `TC-INVITATION-002`.
- **Prerequisites:** an owned signed-in invitation recipient; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing time-based fixture creation uses the real clock (future times or invitation TTL); boundary clocks are not frozen. Some historical files set local timeout overrides, contrary to current shared-runner policy.

## Given-When-Then

```gherkin
Given an owned signed-in invitation recipient
When POST acceptance without x-devmentor-request
Then The request returns 403 and the pending invitation still answers 200.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare an owned signed-in invitation recipient. | The prerequisite state exists inside the owned integration environment. |
| 2 | POST acceptance without x-devmentor-request. | The request returns 403 and the pending invitation still answers 200. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

The missing-CSRF path proves no consumption. Unknown-resource and ownership denial belong to adjacent invitation cases.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [INVITATION-004](INVITATION-004-accept-invitation-and-refresh-session.md), [INVITATION-005](INVITATION-005-hide-unknown-invitation-details.md), [INVITATION-006](INVITATION-006-deny-invitation-to-other-email.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Not run in this invocation as of 2026-11-05. Selected for the pending `npm run test:integration` full-suite execution; this documentation task does not execute tests.
- **Observed result and evidence:** No execution result is claimed. Setup, actions and expected assertions were checked against the exact linked TypeScript case. Runtime screenshots/logs, when produced, remain in ignored [integration artifacts](../../../test-results/integration/).
- **Human review:** Pending; automation and agent review do not establish human review.
