# AUTH-014: restore admin deep link

- **Area:** AUTH
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/implemented/2026-09-04-accounts-and-roles.md).
- **Implementation:** [TypeScript test](../../../tests/integration/auth.integration.test.ts)
- **Executable case:** `TC-AUTH-004 a signed-out deep link survives sign-in / returns the operator to /admin/users through the email form, not to the admin layout's /admin`
- **Native executable ID:** `TC-AUTH-004`.
- **Prerequisites:** a signed-out visitor opening the operator-only users page; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps.

## Given-When-Then

```gherkin
Given a signed-out visitor opening the operator-only users page
When open /admin/users and submit the configured operator email sign-in form
Then Sign-in preserves returnTo=/admin/users. After authentication the browser opens that exact page, renders Users and Ada Lovelace and holds a session.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare a signed-out visitor opening the operator-only users page. | The prerequisite state exists inside the owned integration environment. |
| 2 | open /admin/users and submit the configured operator email sign-in form. | Sign-in preserves returnTo=/admin/users. After authentication the browser opens that exact page, renders Users and Ada Lovelace and holds a session. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

Existing test uses a seeded operator and demo password rather than an owned account/credential reference; record this existing policy gap without changing the test. Unsafe returnTo paths have route unit coverage.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [AUTH-009](AUTH-009-cancel-github-without-account.md), [AUTH-010](AUTH-010-sign-in-mentee-to-home.md), [AUTH-011](AUTH-011-sign-in-mentor-to-workspace.md).

Existing fixture-independence gap: this case reads one or more seeded personas rather than creating every identity it needs. It does not mutate their roles or sign them out.

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
