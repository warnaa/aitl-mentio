# ROLES-009: navigate combined role workspaces

- **Area:** ROLES
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/implemented/2026-09-04-accounts-and-roles.md).
- **Implementation:** [TypeScript test](../../../tests/integration/roles.integration.test.ts)
- **Executable case:** `TC-ROLES-002 navigation follows the union of roles, with no way to gain one (R07) / lets the combined mentor/operator open both workspaces from one navigation`
- **Native executable ID:** `TC-ROLES-002`.
- **Prerequisites:** the seeded mentor/operator who has no mentor profile; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing seeded personas are shared by the suite; they are not independently created by this case, so full fixture independence is a known quality gap.

## Given-When-Then

```gherkin
Given the seeded mentor/operator who has no mentor profile
When follow Mentor workspace and then Users from the shared navigation
Then The mentor workspace shows Mentor profile not found while retaining all four permitted links. Users then opens /admin/users and displays the table.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare the seeded mentor/operator who has no mentor profile. | The prerequisite state exists inside the owned integration environment. |
| 2 | follow Mentor workspace and then Users from the shared navigation. | The mentor workspace shows Mentor profile not found while retaining all four permitted links. Users then opens /admin/users and displays the table. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

The missing-profile recovery state is covered. This case deliberately uses a seeded operator with mentor role but no profile; it does not grant a role.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [ROLES-004](ROLES-004-redirect-mentee-from-privileged-pages.md), [ROLES-005](ROLES-005-redirect-mentor-from-admin-pages.md), [ROLES-006](ROLES-006-show-only-mentee-navigation.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Not run in this invocation as of 2026-11-05. Selected for the pending `npm run test:integration` full-suite execution; this documentation task does not execute tests.
- **Observed result and evidence:** No execution result is claimed. Setup, actions and expected assertions were checked against the exact linked TypeScript case. Runtime screenshots/logs, when produced, remain in ignored [integration artifacts](../../../test-results/integration/).
- **Human review:** Pending; automation and agent review do not establish human review.
