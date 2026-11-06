# MIGRATION-013: round trip availability schema

- **Area:** MIGRATION
- **Priority:** High
- **Type:** integration
- **Requirement:** [Schema compatibility and rollback contract](../../../BACKWARD_COMPATIBILITY.md) and [migration verification policy](../../../SDLC.md).
- **Implementation:** [TypeScript test](../../../tests/integration/migrations.integration.test.ts)
- **Executable case:** `TC-MIGRATION-006 availability migration round trip / preserves history, permits republishing removed starts and reverses the schema`
- **Native executable ID:** `TC-MIGRATION-006`.
- **Prerequisites:** a fresh database through the availability migration with a mentor profile; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Each round trip owns a fresh PostgreSQL container and pins its migration target. Fixed inputs determine assertions. Database-generated IDs/timestamps only identify fixtures; no random seed determines business outcomes.

## Given-When-Then

```gherkin
Given a fresh database through the availability migration with a mentor profile
When insert duplicate starts, soft-remove one, republish, then revert and reapply
Then An active duplicate start fails. Soft-removal permits another slot while preserving two rows. Down removes slots and last-published availability, then up restores schema.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare a fresh database through the availability migration with a mentor profile. | The prerequisite state exists inside the owned integration environment. |
| 2 | insert duplicate starts, soft-remove one, republish, then revert and reapply. | An active duplicate start fails. Soft-removal permits another slot while preserving two rows. Down removes slots and last-published availability, then up restores schema. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This is active-row uniqueness and history retention. Booking occupancy is outside this prerequisite migration and belongs to BOOKING tests.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [MIGRATION-008](MIGRATION-008-round-trip-auth-identity-schema.md), [MIGRATION-009](MIGRATION-009-round-trip-password-column.md), [MIGRATION-010](MIGRATION-010-round-trip-rate-limit-schema.md).

## Cleanup

Each describe block provisions its own PostgreSQL container and stops it in afterAll, including on failure. The global runner separately tears down its own app/database; no developer database is touched.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
