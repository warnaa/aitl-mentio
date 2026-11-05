# {AREA}-{number}: {action, condition and expected result}

- **Area:** {AREA}
- **Priority:** {High / Medium / Low}
- **Type:** {UI / API / integration}
- **Requirement:** [Business requirement or contract]({relative-spec-path})
- **Implementation:** [TypeScript test]({relative-path-to-existing-test.ts})
- **Executable case:** `{exact describe / it title and native ID if present}`
- **Prerequisites:** {role, independently created fixtures and relevant configuration}
- **Determinism:** {controlled clock/explicit instants, recorded seed if used}

## Given-When-Then

```gherkin
Given {owned initial state}
When {one business action or flow}
Then {specific requirement-backed observable outcome}
And {other outcomes essential to this same case, if any}
```

## Steps and expected results

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | {observed action or API request} | {specific response, state or visible outcome} |

## Related negative and boundary cases

{Link separately documented cases. Explain coverage gaps or inapplicability for
relevant validation, permission, missing-resource, conflict, external timeout/error,
boundary and idempotency cases. Keep this document focused on its one case.}

## Cleanup

{How owned data and browser sessions are released, including after failure.}

## Verification and review

- **Latest execution:** {not run / passed / failed / skipped; date and actual command}
- **Observed result and evidence:** {actual result, relative artifact links or blocker}
- **Human review:** {pending / reviewed by person on date; only if verified}

Replace all placeholders before delivering a scenario. Resolve links from the
destination `.ai/qa/{AREA}/` directory, not from this template's directory.
