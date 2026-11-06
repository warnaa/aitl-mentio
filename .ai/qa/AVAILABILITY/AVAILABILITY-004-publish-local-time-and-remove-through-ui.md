# AVAILABILITY-004: publish local time and remove through ui

- **Area:** AVAILABILITY
- **Priority:** High
- **Type:** API/UI integration
- **Requirement:** [Feature contract](../../specs/2026-09-08-availability-slots.md).
- **Implementation:** [TypeScript test](../../../tests/integration/availability.integration.test.ts)
- **Executable case:** `TC-AVAILABILITY-002 publishes locally entered time and shows it signed out`
- **Native executable ID:** `TC-AVAILABILITY-002`.
- **Prerequisites:** an owned invited mentor with a complete published profile and a separate visitor session; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing time-based fixture creation uses the real clock (future times or invitation TTL); boundary clocks are not frozen. Some historical files set local timeout overrides, contrary to current shared-runner policy.

## Given-When-Then

```gherkin
Given an owned invited mentor with a complete published profile and a separate visitor session
When fill the labelled native start-time field, publish it, observe the public page, then confirm removal
Then Publishing shows Your time is published. The visitor sees the future slot, with no reputation claims. Confirmed removal shows Your time was removed. Desktop/mobile screenshots and navigation timing are captured.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare an owned invited mentor with a complete published profile and a separate visitor session. | The prerequisite state exists inside the owned integration environment. |
| 2 | fill the labelled native start-time field, publish it, observe the public page, then confirm removal. | Publishing shows Your time is published. The visitor sees the future slot, with no reputation claims. Confirmed removal shows Your time was removed. Desktop/mobile screenshots and navigation timing are captured. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This case covers a UI lifecycle. Native date entry uses the observed label/control and DOM input/change events; semantic field-entry support remains a quality gap. API denial/bounds are covered by the other availability case.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [AVAILABILITY-003](AVAILABILITY-003-serialize-slot-publication-and-preserve-removal.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Not run in this invocation as of 2026-11-05. Selected for the pending `npm run test:integration` full-suite execution; this documentation task does not execute tests.
- **Observed result and evidence:** No execution result is claimed. Setup, actions and expected assertions were checked against the exact linked TypeScript case. Runtime screenshots/logs, when produced, remain in ignored [integration artifacts](../../../test-results/integration/).
- **Human review:** Pending; automation and agent review do not establish human review.
