# RATE-LIMIT-004: separate ip and email counters

- **Area:** RATE-LIMIT
- **Priority:** High
- **Type:** integration
- **Requirement:** [Feature contract](../../specs/2026-09-04-platform-primitives.md).
- **Implementation:** [TypeScript test](../../../tests/integration/rate-limit.integration.test.ts)
- **Executable case:** `TC-RATE-LIMIT-001 PostgreSQL-backed rate limiting / keeps per-IP and per-email counters independent`
- **Native executable ID:** `TC-RATE-LIMIT-001`.
- **Prerequisites:** the sign-in per-email and per-IP policies in a real database; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** The clock starts at the explicit instant 2026-11-03T10:00:00.000Z and advances without sleeping. Keys are fixed and partitioned per case. The file shares a clock/database, which is a documented independence gap.

## Given-When-Then

```gherkin
Given the sign-in per-email and per-IP policies in a real database
When exhaust one email counter, then consume a distinct IP and another email
Then The exhausted email is refused with 429; the independent IP and other email still succeed.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare the sign-in per-email and per-IP policies in a real database. | The prerequisite state exists inside the owned integration environment. |
| 2 | exhaust one email counter, then consume a distinct IP and another email. | The exhausted email is refused with 429; the independent IP and other email still succeed. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This is the partition-isolation boundary. The two policies are real; no HTTP route or external identity system is exercised.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [RATE-LIMIT-002](RATE-LIMIT-002-count-refused-attempt-and-retry-delay.md), [RATE-LIMIT-003](RATE-LIMIT-003-reset-expired-rate-window.md), [RATE-LIMIT-005](RATE-LIMIT-005-serialize-concurrent-rate-limit-attempts.md).

## Cleanup

afterAll closes the owned ORM and stops this file's disposable PostgreSQL container. Per-case counters remain until teardown; isolation limitations are recorded above.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
