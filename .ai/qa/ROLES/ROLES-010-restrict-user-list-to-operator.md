# ROLES-010: restrict user list to operator

- **Area:** ROLES
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/implemented/2026-09-04-accounts-and-roles.md).
- **Implementation:** [TypeScript test](../../../tests/integration/roles.integration.test.ts)
- **Executable case:** `TC-ROLES-003 the user list is operator-only, in the page and the API / shows the operator the users list and answers a mentee 403 from /api/users`
- **Native executable ID:** `TC-ROLES-003`.
- **Prerequisites:** seeded operator and mentee personas in separate browser sessions; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing seeded personas are shared by the suite; they are not independently created by this case, so full fixture independence is a known quality gap.

## Given-When-Then

```gherkin
Given seeded operator and mentee personas in separate browser sessions
When read the Users page as operator and GET /api/users as mentee
Then The operator sees Users, Ada Lovelace and the mentee email. The mentee API returns 403 with ok=false/error.code=forbidden and no data payload.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare seeded operator and mentee personas in separate browser sessions. | The prerequisite state exists inside the owned integration environment. |
| 2 | read the Users page as operator and GET /api/users as mentee. | The operator sees Users, Ada Lovelace and the mentee email. The mentee API returns 403 with ok=false/error.code=forbidden and no data payload. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This compares authorized UI and denied API access for the same resource. Signed-out and wrong-role page redirects have separate coverage.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [ROLES-004](ROLES-004-redirect-mentee-from-privileged-pages.md), [ROLES-005](ROLES-005-redirect-mentor-from-admin-pages.md), [ROLES-006](ROLES-006-show-only-mentee-navigation.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
