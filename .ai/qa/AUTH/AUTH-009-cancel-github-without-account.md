# AUTH-009: cancel github without account

- **Area:** AUTH
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/implemented/2026-09-04-accounts-and-roles.md).
- **Implementation:** [TypeScript test](../../../tests/integration/auth.integration.test.ts)
- **Executable case:** `TC-AUTH-001 a cancelled GitHub authorisation / explains that nothing was created, and creates nothing`
- **Native executable ID:** `TC-AUTH-001`.
- **Prerequisites:** a signed-out visitor and an operator capable of counting accounts; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps.

## Given-When-Then

```gherkin
Given a signed-out visitor and an operator capable of counting accounts
When open the GitHub callback with error=access_denied
Then The visitor lands on /sign-in?cancelled=1 with Sign-in was cancelled. No account was created. GitHub precedes the enabled email form, no session cookie is stored and account count is unchanged.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare a signed-out visitor and an operator capable of counting accounts. | The prerequisite state exists inside the owned integration environment. |
| 2 | open the GitHub callback with error=access_denied. | The visitor lands on /sign-in?cancelled=1 with Sign-in was cancelled. No account was created. GitHub precedes the enabled email form, no session cookie is stored and account count is unchanged. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This is the controlled provider-cancellation path. Unknown provider errors and malformed OAuth state are separate service/route cases.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [AUTH-010](AUTH-010-sign-in-mentee-to-home.md), [AUTH-011](AUTH-011-sign-in-mentor-to-workspace.md), [AUTH-012](AUTH-012-sign-in-operator-to-admin.md).

Existing fixture-independence gap: this case reads one or more seeded personas rather than creating every identity it needs. It does not mutate their roles or sign them out.

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Not run in this invocation as of 2026-11-05. Selected for the pending `npm run test:integration` full-suite execution; this documentation task does not execute tests.
- **Observed result and evidence:** No execution result is claimed. Setup, actions and expected assertions were checked against the exact linked TypeScript case. Runtime screenshots/logs, when produced, remain in ignored [integration artifacts](../../../test-results/integration/).
- **Human review:** Pending; automation and agent review do not establish human review.
