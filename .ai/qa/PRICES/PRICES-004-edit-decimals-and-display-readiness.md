# PRICES-004: edit decimals and display readiness

- **Area:** PRICES
- **Priority:** High
- **Type:** API/UI integration
- **Requirement:** [Feature contract](../../specs/2026-09-08-mentor-prices.md).
- **Implementation:** [TypeScript test](../../../tests/integration/prices.integration.test.ts)
- **Executable case:** `TC-PRICES-002 edits raw decimals, shows readiness and exposes prices signed out`
- **Native executable ID:** `TC-PRICES-002`.
- **Prerequisites:** an owned invitation-backed offer-ready mentor and a signed-out visitor; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing time-based fixture creation uses the real clock (future times or invitation TTL); boundary clocks are not frozen. Some historical files set local timeout overrides, contrary to current shared-runner policy.

## Given-When-Then

```gherkin
Given an owned invitation-backed offer-ready mentor and a signed-out visitor
When edit price fields through the mentor UI, submit an excessive fractional amount, then valid prices
Then The fractional amount is rejected with the decimal error. Saving 80.00 and 160.00 shows Both session prices were saved. Readiness becomes shareable and public prices remain visible; screenshots include mobile layouts.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare an owned invitation-backed offer-ready mentor and a signed-out visitor. | The prerequisite state exists inside the owned integration environment. |
| 2 | edit price fields through the mentor UI, submit an excessive fractional amount, then valid prices. | The fractional amount is rejected with the decimal error. Saving 80.00 and 160.00 shows Both session prices were saved. Readiness becomes shareable and public prices remain visible; screenshots include mobile layouts. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

Invalid decimal precision and successful correction share the price-edit flow. API authorization and min/max boundaries are separate; external integration failures do not apply.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [PRICES-003](PRICES-003-enforce-price-bounds-and-owner-scope.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Not run in this invocation as of 2026-11-05. Selected for the pending `npm run test:integration` full-suite execution; this documentation task does not execute tests.
- **Observed result and evidence:** No execution result is claimed. Setup, actions and expected assertions were checked against the exact linked TypeScript case. Runtime screenshots/logs, when produced, remain in ignored [integration artifacts](../../../test-results/integration/).
- **Human review:** Pending; automation and agent review do not establish human review.
