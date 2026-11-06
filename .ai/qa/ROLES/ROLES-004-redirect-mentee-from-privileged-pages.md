# ROLES-004: redirect mentee from privileged pages

- **Area:** ROLES
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/implemented/2026-09-04-accounts-and-roles.md).
- **Implementation:** [TypeScript test](../../../tests/integration/roles.integration.test.ts)
- **Executable case:** `TC-ROLES-001 a wrong-role screen sends the user to their own home / sends a mentee who opens the mentor or admin screen to /home (edge case 19)`
- **Native executable ID:** `TC-ROLES-001`.
- **Prerequisites:** the seeded mock-mentee persona; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing seeded personas are shared by the suite; they are not independently created by this case, so full fixture independence is a known quality gap.

## Given-When-Then

```gherkin
Given the seeded mock-mentee persona
When open /mentor, /admin and /admin/users
Then Every request lands on /home, shows My sessions and exposes no mentor/operator workspace heading. A screenshot records the final redirect.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare the seeded mock-mentee persona. | The prerequisite state exists inside the owned integration environment. |
| 2 | open /mentor, /admin and /admin/users. | Every request lands on /home, shows My sessions and exposes no mentor/operator workspace heading. A screenshot records the final redirect. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This is the wrong-role redirect matrix for mentees. Signed-out and malformed-token behavior is covered by AUTH.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [ROLES-005](ROLES-005-redirect-mentor-from-admin-pages.md), [ROLES-006](ROLES-006-show-only-mentee-navigation.md), [ROLES-007](ROLES-007-show-only-mentor-navigation.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Not run in this invocation as of 2026-11-05. Selected for the pending `npm run test:integration` full-suite execution; this documentation task does not execute tests.
- **Observed result and evidence:** No execution result is claimed. Setup, actions and expected assertions were checked against the exact linked TypeScript case. Runtime screenshots/logs, when produced, remain in ignored [integration artifacts](../../../test-results/integration/).
- **Human review:** Pending; automation and agent review do not establish human review.
