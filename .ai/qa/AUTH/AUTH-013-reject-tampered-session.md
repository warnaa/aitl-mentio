# AUTH-013: reject tampered session

- **Area:** AUTH
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/implemented/2026-09-04-accounts-and-roles.md).
- **Implementation:** [TypeScript test](../../../tests/integration/auth.integration.test.ts)
- **Executable case:** `TC-AUTH-003 an invalid session on a signed-in screen / redirects to sign-in and shows nothing of the user`
- **Native executable ID:** `TC-AUTH-003`.
- **Prerequisites:** a signed-in mentee whose copied session signature is deliberately corrupted; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps.

## Given-When-Then

```gherkin
Given a signed-in mentee whose copied session signature is deliberately corrupted
When replace the cookie with the tampered value and open /home
Then The browser lands on /sign-in with returnTo=/home, shows GitHub sign-in and exposes none of the signed-in user name, email or sessions content.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare a signed-in mentee whose copied session signature is deliberately corrupted. | The prerequisite state exists inside the owned integration environment. |
| 2 | replace the cookie with the tampered value and open /home. | The browser lands on /sign-in with returnTo=/home, shows GitHub sign-in and exposes none of the signed-in user name, email or sessions content. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

Tampering is the negative credential boundary. Expired/version-retired tokens have other service and sign-out coverage; this case does not issue a valid token itself.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [AUTH-009](AUTH-009-cancel-github-without-account.md), [AUTH-010](AUTH-010-sign-in-mentee-to-home.md), [AUTH-011](AUTH-011-sign-in-mentor-to-workspace.md).

Existing fixture-independence gap: this case reads one or more seeded personas rather than creating every identity it needs. It does not mutate their roles or sign them out.

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Not run in this invocation as of 2026-11-05. Selected for the pending `npm run test:integration` full-suite execution; this documentation task does not execute tests.
- **Observed result and evidence:** No execution result is claimed. Setup, actions and expected assertions were checked against the exact linked TypeScript case. Runtime screenshots/logs, when produced, remain in ignored [integration artifacts](../../../test-results/integration/).
- **Human review:** Pending; automation and agent review do not establish human review.
