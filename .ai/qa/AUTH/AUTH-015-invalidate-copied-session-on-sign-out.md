# AUTH-015: invalidate copied session on sign out

- **Area:** AUTH
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/implemented/2026-09-04-accounts-and-roles.md).
- **Implementation:** [TypeScript test](../../../tests/integration/auth.integration.test.ts)
- **Executable case:** `TC-AUTH-005 sign-out ends every session, including a copied cookie / refuses a sign-out without the CSRF header, then signs out and kills the copy`
- **Native executable ID:** `TC-AUTH-005`.
- **Prerequisites:** an owned mock GitHub account and a copied live session cookie; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps.

## Given-When-Then

```gherkin
Given an owned mock GitHub account and a copied live session cookie
When attempt logout without CSRF, then use the visible Sign out action
Then The forged logout returns 403 without retiring the session. Successful sign-out removes the browser cookie; the copied cookie then receives page redirect to sign-in and API 401 unauthorized.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare an owned mock GitHub account and a copied live session cookie. | The prerequisite state exists inside the owned integration environment. |
| 2 | attempt logout without CSRF, then use the visible Sign out action. | The forged logout returns 403 without retiring the session. Successful sign-out removes the browser cookie; the copied cookie then receives page redirect to sign-in and API 401 unauthorized. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This flow covers CSRF denial and successful global invalidation. Replayed stale credentials are checked after sign-out; provider errors are inapplicable.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [AUTH-009](AUTH-009-cancel-github-without-account.md), [AUTH-010](AUTH-010-sign-in-mentee-to-home.md), [AUTH-011](AUTH-011-sign-in-mentor-to-workspace.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
