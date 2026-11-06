# MENTOR-PAGE-007: deny owner api without mentor role

- **Area:** MENTOR-PAGE
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/2026-09-08-mentor-page.md).
- **Implementation:** [TypeScript test](../../../tests/integration/mentor-page.integration.test.ts)
- **Executable case:** `TC-MENTOR-PAGE-002 publication keeps one slug and a private boundary / keeps owner routes behind the mentor role`
- **Native executable ID:** `TC-MENTOR-PAGE-002`.
- **Prerequisites:** an owned mentee session and a signed-out caller; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing time-based fixture creation uses the real clock (future times or invitation TTL); boundary clocks are not frozen. Some historical files set local timeout overrides, contrary to current shared-runner policy.

## Given-When-Then

```gherkin
Given an owned mentee session and a signed-out caller
When GET the owner profile and POST publish as mentee, then GET signed out
Then Mentee requests return 403 and the signed-out request returns 401.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare an owned mentee session and a signed-out caller. | The prerequisite state exists inside the owned integration environment. |
| 2 | GET the owner profile and POST publish as mentee, then GET signed out. | Mentee requests return 403 and the signed-out request returns 401. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

Authorization is checked through the real API, independently of visible navigation. Missing profiles for a valid mentor are not covered by this case.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [MENTOR-PAGE-003](MENTOR-PAGE-003-refuses-publication-without-technology.md), [MENTOR-PAGE-004](MENTOR-PAGE-004-publish-profile-and-open-share-link.md), [MENTOR-PAGE-005](MENTOR-PAGE-005-preserve-slug-through-publication-lifecycle.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
