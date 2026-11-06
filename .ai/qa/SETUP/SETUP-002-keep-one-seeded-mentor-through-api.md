# SETUP-002: keep one seeded mentor through api

- **Area:** SETUP
- **Priority:** Medium
- **Type:** integration
- **Requirement:** [Feature contract](../../specs/2026-09-03-setup-installer.md).
- **Implementation:** [TypeScript test](../../../tests/integration/setup.integration.test.ts)
- **Executable case:** `TC-SETUP-001 setup is idempotent / leaves exactly one sample mentor after the seeder ran twice`
- **Native executable ID:** `TC-SETUP-001`.
- **Prerequisites:** the global harness after it migrates and runs db:seed twice; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed business inputs and mock GitHub/log-mail adapters control the flow. Browser sessions are isolated and closed. Process IDs/sequences only namespace owned records; no random seed determines expected outcomes. Browser waits target observable text rather than fixed sleeps. Existing seeded personas are shared by the suite; they are not independently created by this case, so full fixture independence is a known quality gap.

## Given-When-Then

```gherkin
Given the global harness after it migrates and runs db:seed twice
When authenticate as the seeded operator and GET /api/users
Then The successful envelope contains exactly one mock-mentor@devmentor.test row with displayName Ada Lovelace.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare the global harness after it migrates and runs db:seed twice. | The prerequisite state exists inside the owned integration environment. |
| 2 | authenticate as the seeded operator and GET /api/users. | The successful envelope contains exactly one mock-mentor@devmentor.test row with displayName Ada Lovelace. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

Repeated seeding is the idempotency boundary. Wrong-role reads are covered in ROLES. Seed failure prevents this case from being reached.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [SETUP-003](SETUP-003-keep-one-seeded-mentor-in-table.md).

## Cleanup

Browser sessions close in finally (or the existing inBrowser wrapper), with failure screenshots/console diagnostics where implemented. Owned account/profile/invitation/slot data remains inside the native runner's disposable database until global teardown; these historical cases do not individually delete those rows. The runner stops its app process tree and database on success or failure.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
