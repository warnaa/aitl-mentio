# RATE-LIMIT-002: count refused attempt and retry delay

- **Area:** RATE-LIMIT
- **Priority:** High
- **Type:** integration
- **Requirement:** [Feature contract](../../specs/2026-09-04-platform-primitives.md).
- **Implementation:** [TypeScript test](../../../tests/integration/rate-limit.integration.test.ts)
- **Executable case:** `TC-RATE-LIMIT-001 PostgreSQL-backed rate limiting / counts every attempt and refuses past the limit, with the seconds left`
- **Native executable ID:** `TC-RATE-LIMIT-001`.
- **Prerequisites:** a real migrated PostgreSQL counter store and policy limit 3/window 60 seconds; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** The clock starts at the explicit instant 2026-11-03T10:00:00.000Z and advances without sleeping. Keys are fixed and partitioned per case. The file shares a clock/database, which is a documented independence gap.

## Given-When-Then

```gherkin
Given a real migrated PostgreSQL counter store and policy limit 3/window 60 seconds
When consume three times, advance the injected clock 20 seconds and consume again
Then Three attempts succeed; the fourth returns 429 rate_limited with retryAfterSeconds 40, and persisted count is 4.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare a real migrated PostgreSQL counter store and policy limit 3/window 60 seconds. | The prerequisite state exists inside the owned integration environment. |
| 2 | consume three times, advance the injected clock 20 seconds and consume again. | Three attempts succeed; the fourth returns 429 rate_limited with retryAfterSeconds 40, and persisted count is 4. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

The exact limit and rejection-count boundary is covered. API authorization/CSRF do not apply to this primitive-level contract.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [RATE-LIMIT-003](RATE-LIMIT-003-reset-expired-rate-window.md), [RATE-LIMIT-004](RATE-LIMIT-004-separate-ip-and-email-counters.md), [RATE-LIMIT-005](RATE-LIMIT-005-serialize-concurrent-rate-limit-attempts.md).

## Cleanup

afterAll closes the owned ORM and stops this file's disposable PostgreSQL container. Per-case counters remain until teardown; isolation limitations are recorded above.

## Verification and review

- **Latest execution:** Not run in this invocation as of 2026-11-05. Selected for the pending `npm run test:integration` full-suite execution; this documentation task does not execute tests.
- **Observed result and evidence:** No execution result is claimed. Setup, actions and expected assertions were checked against the exact linked TypeScript case. Runtime screenshots/logs, when produced, remain in ignored [integration artifacts](../../../test-results/integration/).
- **Human review:** Pending; automation and agent review do not establish human review.
