# AUTH-018: verify registration before sign in

- **Area:** AUTH
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/implemented/2026-09-04-accounts-and-roles.md).
- **Implementation:** [TypeScript test](../../../tests/integration/auth.integration.test.ts)
- **Executable case:** `TC-AUTH-007 email registration, end to end / registers, refuses sign-in until the emailed link is opened, then lands on the mentee home`
- **Native executable ID:** `TC-AUTH-007`.
- **Prerequisites:** a fresh owned email account and the controlled log mail adapter; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps.

## Given-When-Then

```gherkin
Given a fresh owned email account and the controlled log mail adapter
When register, try early password sign-in, follow its real mailed verification link, then reuse the link
Then Registration displays Check your inbox and creates no session. Early sign-in returns 403 email_unverified. The confirmation email contains the verify endpoint; opening it lands on /home with the new name. Reusing the link grants no session; password sign-in then succeeds.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare a fresh owned email account and the controlled log mail adapter. | The prerequisite state exists inside the owned integration environment. |
| 2 | register, try early password sign-in, follow its real mailed verification link, then reuse the link. | Registration displays Check your inbox and creates no session. Early sign-in returns 403 email_unverified. The confirmation email contains the verify endpoint; opening it lands on /home with the new name. Reusing the link grants no session; password sign-in then succeeds. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This existing case covers the registration/verification lifecycle and replay boundary. It uses a literal synthetic test password and a Date.now mail cutoff; external delivery failures are not simulated.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [AUTH-009](AUTH-009-cancel-github-without-account.md), [AUTH-010](AUTH-010-sign-in-mentee-to-home.md), [AUTH-011](AUTH-011-sign-in-mentor-to-workspace.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
