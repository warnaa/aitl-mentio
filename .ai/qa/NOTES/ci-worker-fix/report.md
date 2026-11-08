# PR 79 integration-worker configuration fix

The integration job now sets `INTEGRATION_TEST_RUN: '1'` alongside its existing mock-payment adapter. The flag is absent from the workflow-global environment and every other job. The production mock-adapter validator and application/test source are unchanged.

## Verification

- Parsed the prior committed and corrected workflow YAML and used each actual integration-job environment in a fresh logger process. Before: the expected ZodError rejects mock payments without the signal. After: createLogger succeeds. The validation also confirms the flag does not escape the integration job. See [environment probe](workflow-environment-probe.json).
- Ran the two CI-failing native integration cases using the corrected workflow environment. Both passed: `NOTES-004` notification recovery and `NOTES-009` real max-one shared service/limiter pool. Exit 0, 91.083 seconds, 2 passed and 100 excluded by the requested filter. See [executed cases](results.json) and [command result](command-result.json).
- The four native CI change-classifier tests passed. YAML parsing and diff checks passed. The preceding full local suite at b70a309 passed all 102 cases; it is separate evidence and is not misreported as a new full run under the corrected worker configuration.
- The native runner owned the PostgreSQL/app/browser fixtures and cleaned them. Generated migration snapshot churn was restored; the existing developer database was not used or changed. Raw logs and runtime credentials remain outside committed records.

No redundant full suite was started for this job-only configuration change. A push to the existing PR will run the full GitHub workflow; its result must be observed before claiming CI green. Human QA remains pending and no merge or QA approval is granted.
