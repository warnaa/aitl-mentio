# INVITATION-005: hide unknown invitation details

- **Area:** INVITATION
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/2026-09-08-mentors-become-bookable.md).
- **Implementation:** [TypeScript test](../../../tests/integration/invitations.integration.test.ts)
- **Executable case:** `TC-INVITATION-002 invalid invitations grant nothing / shows one sentence for an unknown token, whoever opens it`
- **Native executable ID:** `TC-INVITATION-002`.
- **Prerequisites:** a signed-out visitor and a deliberately nonexistent token; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing time-based fixture creation uses the real clock (future times or invitation TTL); boundary clocks are not frozen. Some historical files set local timeout overrides, contrary to current shared-runner policy.

## Given-When-Then

```gherkin
Given a signed-out visitor and a deliberately nonexistent token
When open the invitation screen and GET its API projection
Then The screen shows This invitation is not valid., offers no Accept invitation action and exposes no email. The API returns 404 with the same generic message.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare a signed-out visitor and a deliberately nonexistent token. | The prerequisite state exists inside the owned integration environment. |
| 2 | open the invitation screen and GET its API projection. | The screen shows This invitation is not valid., offers no Accept invitation action and exposes no email. The API returns 404 with the same generic message. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

Missing-resource denial is covered. Expired and consumed tokens share the contract but expiry is not arranged by this executable.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [INVITATION-004](INVITATION-004-accept-invitation-and-refresh-session.md), [INVITATION-006](INVITATION-006-deny-invitation-to-other-email.md), [INVITATION-007](INVITATION-007-serialize-simultaneous-acceptance.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
