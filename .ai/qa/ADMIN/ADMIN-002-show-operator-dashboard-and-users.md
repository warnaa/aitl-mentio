# ADMIN-002: show operator dashboard and users

- **Area:** ADMIN
- **Priority:** High
- **Type:** UI
- **Requirement:** [Feature contract](../../specs/implemented/2026-09-01-devmentor-monorepo-bootstrap.md).
- **Implementation:** [TypeScript test](../../../tests/integration/admin.integration.test.ts)
- **Executable case:** `TC-ADMIN-001 admin panel basics / shows a connected dashboard and the seeded users table to a signed-in operator`
- **Native executable ID:** `TC-ADMIN-001`.
- **Prerequisites:** a configured operator with seeded sample accounts; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing seeded personas are shared by the suite; they are not independently created by this case, so full fixture independence is a known quality gap.

## Given-When-Then

```gherkin
Given a configured operator with seeded sample accounts
When sign in as mock-operator and open /admin, then /admin/users
Then The dashboard shows Operator workspace, Connected, Users, View users and Sign out. The users page shows Ada Lovelace, the mentor email and Roles of Ada Lovelace.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare a configured operator with seeded sample accounts. | The prerequisite state exists inside the owned integration environment. |
| 2 | sign in as mock-operator and open /admin, then /admin/users. | The dashboard shows Operator workspace, Connected, Users, View users and Sign out. The users page shows Ada Lovelace, the mentor email and Roles of Ada Lovelace. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

Role denial is documented by ROLES cases; database failure is not exercised by this healthy-dashboard smoke test.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Passed on2026-11-06 in both the81-test full run and the final-source scoped native report/rejection/report-API/admin run (four files/four tests,38.73s).
- **Observed result and evidence:** Existing dashboard/users assertions passed after adding the report consumer. Report contents and state matrix are separately verified in the [payment final runtime report](../PAYMENTS/2026-11-06-final-runtime.md); this historical admin smoke test does not assert every new reporting value.
- **Human review:** Pending; automation and agent review do not establish human review.
