# MENTOR-PAGE-005: preserve slug through publication lifecycle

- **Area:** MENTOR-PAGE
- **Priority:** High
- **Type:** UI/API integration
- **Requirement:** [Feature contract](../../specs/2026-09-08-mentor-page.md).
- **Implementation:** [TypeScript test](../../../tests/integration/mentor-page.integration.test.ts)
- **Executable case:** `TC-MENTOR-PAGE-002 publication keeps one slug and a private boundary / refuses an incomplete page, then publishes, unpublishes and republishes under the same slug`
- **Native executable ID:** `TC-MENTOR-PAGE-002`.
- **Prerequisites:** a fresh invited mentor and an initially incomplete profile; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing time-based fixture creation uses the real clock (future times or invitation TTL); boundary clocks are not frozen. Some historical files set local timeout overrides, contrary to current shared-runner policy.

## Given-When-Then

```gherkin
Given a fresh invited mentor and an initially incomplete profile
When refuse incomplete publication, complete it, publish, unpublish and republish
Then Initial publication returns 422 fieldErrors for bio/publicWorkUrl/stackTags. Public DTO exposes only the exact allowed keys, no private email/deadline fields. Unpublication makes both public API/page 404; republishing reuses the same slug.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare a fresh invited mentor and an initially incomplete profile. | The prerequisite state exists inside the owned integration environment. |
| 2 | refuse incomplete publication, complete it, publish, unpublish and republish. | Initial publication returns 422 fieldErrors for bio/publicWorkUrl/stackTags. Public DTO exposes only the exact allowed keys, no private email/deadline fields. Unpublication makes both public API/page 404; republishing reuses the same slug. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This lifecycle checks privacy, missing-public-state and repeat publication. It bundles multiple assertions around one publication contract; a later quality pass can separate projection details.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [MENTOR-PAGE-003](MENTOR-PAGE-003-refuses-publication-without-technology.md), [MENTOR-PAGE-004](MENTOR-PAGE-004-publish-profile-and-open-share-link.md), [MENTOR-PAGE-006](MENTOR-PAGE-006-resolve-concurrent-slug-collision.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Not run in this invocation as of 2026-11-05. Selected for the pending `npm run test:integration` full-suite execution; this documentation task does not execute tests.
- **Observed result and evidence:** No execution result is claimed. Setup, actions and expected assertions were checked against the exact linked TypeScript case. Runtime screenshots/logs, when produced, remain in ignored [integration artifacts](../../../test-results/integration/).
- **Human review:** Pending; automation and agent review do not establish human review.
