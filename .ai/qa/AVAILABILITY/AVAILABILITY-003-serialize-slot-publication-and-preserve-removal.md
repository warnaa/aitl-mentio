# AVAILABILITY-003: serialize slot publication and preserve removal

- **Area:** AVAILABILITY
- **Priority:** High
- **Type:** API/UI integration
- **Requirement:** [Feature contract](../../specs/2026-09-08-availability-slots.md).
- **Implementation:** [TypeScript test](../../../tests/integration/availability.integration.test.ts)
- **Executable case:** `TC-AVAILABILITY-001 scopes writes, serializes duplicates and preserves removed history`
- **Native executable ID:** `TC-AVAILABILITY-001`.
- **Prerequisites:** fresh invitation-backed owner and foreign mentor accounts with a published profile; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing time-based fixture creation uses the real clock (future times or invitation TTL); boundary clocks are not frozen. Some historical files set local timeout overrides, contrary to current shared-runner policy.

## Given-When-Then

```gherkin
Given fresh invitation-backed owner and foreign mentor accounts with a published profile
When POST duplicate future starts concurrently, then remove and republish the winning slot
Then Exactly one duplicate publication succeeds and one returns 409. Signed-out reads return 401, missing CSRF returns 403, past input returns 422, and foreign/missing removal returns identical 404. Removed slots disappear publicly; republishing creates a new ID. Owner pagination is 25 and public availability caps at 50.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare fresh invitation-backed owner and foreign mentor accounts with a published profile. | The prerequisite state exists inside the owned integration environment. |
| 2 | POST duplicate future starts concurrently, then remove and republish the winning slot. | Exactly one duplicate publication succeeds and one returns 409. Signed-out reads return 401, missing CSRF returns 403, past input returns 422, and foreign/missing removal returns identical 404. Removed slots disappear publicly; republishing creates a new ID. Owner pagination is 25 and public availability caps at 50. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This existing executable bundles authorization, validation, lifecycle and pagination; a future quality pass should split those concerns. It checks repeats and missing resources; provider errors are inapplicable to the internal database flow.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [AVAILABILITY-004](AVAILABILITY-004-publish-local-time-and-remove-through-ui.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
