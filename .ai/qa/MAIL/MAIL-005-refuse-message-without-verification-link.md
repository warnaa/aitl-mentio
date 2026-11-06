# MAIL-005: refuse message without verification link

- **Area:** MAIL
- **Priority:** Medium
- **Type:** integration
- **Requirement:** [Integration harness contract](../../../tests/integration/AGENTS.md) and [mail-reader interface](../../../tests/integration/mail.ts). This is test-infrastructure behavior, not a product business promise.
- **Implementation:** [TypeScript test](../../../tests/integration/mail.integration.test.ts)
- **Executable case:** `TC-MAIL-001 waitForMail / refuses a mail without a link`
- **Native executable ID:** `TC-MAIL-001`.
- **Prerequisites:** a synthetic mail object whose text has no URL; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed message timestamps and content determine assertions. The file shares one temporary log; individual timer/state dependencies are stated below. No external mail service or random input is used.

## Given-When-Then

```gherkin
Given a synthetic mail object whose text has no URL
When extract its first link
Then The helper throws an error containing has no link.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare a synthetic mail object whose text has no URL. | The prerequisite state exists inside the owned integration environment. |
| 2 | extract its first link. | The helper throws an error containing has no link. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This is a pure harness error contract selected by the native integration runner. Authorization, concurrent writes, provider errors and idempotency are inapplicable.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [MAIL-002](MAIL-002-filter-mail-log-by-recipient-and-time.md), [MAIL-003](MAIL-003-observe-mail-arriving-during-poll.md), [MAIL-004](MAIL-004-report-mail-timeout-and-missing-log.md).

## Cleanup

afterAll recursively removes the owned temporary directory. The delayed-append case uses the same log; it does not provision an app or external mail account.

## Verification and review

- **Latest execution:** Passed on 2026-11-06 with `npm run test:integration`: all 40 files and 81 tests passed in 848.86s. This run predates the later read-only reporting addition.
- **Observed result and evidence:** This exact linked native case passed its authored assertions in the [full integration run](../PAYMENTS/2026-11-06-full-run.md). Scenario steps and documented historical quality gaps remain unchanged; passing automation does not establish human review.
- **Human review:** Pending; automation and agent review do not establish human review.
