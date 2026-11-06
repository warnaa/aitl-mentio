# AUTH-010: sign in mentee to home

- **Area:** AUTH
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/implemented/2026-09-04-accounts-and-roles.md).
- **Implementation:** [TypeScript test](../../../tests/integration/auth.integration.test.ts)
- **Executable case:** `TC-AUTH-002 GitHub sign-in lands on the role home / signs a mentee in to /home with a secure, httpOnly session cookie`
- **Native executable ID:** `TC-AUTH-002`.
- **Prerequisites:** the seeded mock-mentee persona; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps.

## Given-When-Then

```gherkin
Given the seeded mock-mentee persona
When start mock GitHub sign-in and open sign-in again while authenticated
Then The session cookie is secure, httpOnly, path / and SameSite Lax. The destination is /home with Grace Hopper, My sessions and no sessions yet. Reopening sign-in returns home.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare the seeded mock-mentee persona. | The prerequisite state exists inside the owned integration environment. |
| 2 | start mock GitHub sign-in and open sign-in again while authenticated. | The session cookie is secure, httpOnly, path / and SameSite Lax. The destination is /home with Grace Hopper, My sessions and no sessions yet. Reopening sign-in returns home. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

Seeded persona use is a known isolation gap. Cookie flags and repeat navigation are asserted; OAuth network timeouts are not exercised by the mock adapter.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [AUTH-009](AUTH-009-cancel-github-without-account.md), [AUTH-011](AUTH-011-sign-in-mentor-to-workspace.md), [AUTH-012](AUTH-012-sign-in-operator-to-admin.md).

Existing fixture-independence gap: this case reads one or more seeded personas rather than creating every identity it needs. It does not mutate their roles or sign them out.

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Not run in this invocation as of 2026-11-05. Selected for the pending `npm run test:integration` full-suite execution; this documentation task does not execute tests.
- **Observed result and evidence:** No execution result is claimed. Setup, actions and expected assertions were checked against the exact linked TypeScript case. Runtime screenshots/logs, when produced, remain in ignored [integration artifacts](../../../test-results/integration/).
- **Human review:** Pending; automation and agent review do not establish human review.
