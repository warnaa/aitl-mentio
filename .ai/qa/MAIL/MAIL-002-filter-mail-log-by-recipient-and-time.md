# MAIL-002: filter mail log by recipient and time

- **Area:** MAIL
- **Priority:** Medium
- **Type:** integration
- **Requirement:** [Integration harness contract](../../../tests/integration/AGENTS.md) and [mail-reader interface](../../../tests/integration/mail.ts). This is test-infrastructure behavior, not a product business promise.
- **Implementation:** [TypeScript test](../../../tests/integration/mail.integration.test.ts)
- **Executable case:** `TC-MAIL-001 waitForMail / returns the first message to the address since the given time, ignoring noise`
- **Native executable ID:** `TC-MAIL-001`.
- **Prerequisites:** an owned temporary log with noise, malformed lines, older mail and another recipient; use the native ephemeral integration runner and controlled configuration, never a developer database.
- **Determinism:** Fixed message timestamps and content determine assertions. The file shares one temporary log; individual timer/state dependencies are stated below. No external mail service or random input is used.

## Given-When-Then

```gherkin
Given an owned temporary log with noise, malformed lines, older mail and another recipient
When wait for mail to the target address since timestamp 1500
Then The returned message is the case-insensitive recipient match at timestamp 4000 with exact subject/text, and firstLink extracts the full verification URL.
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Prepare an owned temporary log with noise, malformed lines, older mail and another recipient. | The prerequisite state exists inside the owned integration environment. |
| 2 | wait for mail to the target address since timestamp 1500. | The returned message is the case-insensitive recipient match at timestamp 4000 with exact subject/text, and firstLink extracts the full verification URL. |
| 3 | Inspect the assertion outputs and any captured artifacts before teardown. | The exact native case assertions determine pass/fail; an unexecuted case has no observed success. |

## Related negative and boundary cases

This tests the harness contract, not mail delivery. Older/malformed/unrelated lines are negative inputs; no external provider is called.

This document maps one native executable case; existing bundled assertions are described honestly rather than silently split or rewritten. The [full integration contract](../../../tests/integration/AGENTS.md) governs isolation and semantic selectors. Relevant positive, validation, permission, missing-resource, conflict, provider-error, boundary and replay classes are covered only where stated above. No extra provider timeout or failure assertion is claimed. The all-15-section guide assessment records the specific existing gaps above; semantic roles/labels and concrete assertions are retained, helpers are named by purpose, and human review remains pending.

Related executable cases in this area: [MAIL-003](MAIL-003-observe-mail-arriving-during-poll.md), [MAIL-004](MAIL-004-report-mail-timeout-and-missing-log.md), [MAIL-005](MAIL-005-refuse-message-without-verification-link.md).

## Cleanup

afterAll recursively removes the owned temporary directory. The delayed-append case uses the same log; it does not provision an app or external mail account.

## Verification and review

- **Latest execution:** Not run in this invocation as of 2026-11-05. Selected for the pending `npm run test:integration` full-suite execution; this documentation task does not execute tests.
- **Observed result and evidence:** No execution result is claimed. Setup, actions and expected assertions were checked against the exact linked TypeScript case. Runtime screenshots/logs, when produced, remain in ignored [integration artifacts](../../../test-results/integration/).
- **Human review:** Pending; automation and agent review do not establish human review.
