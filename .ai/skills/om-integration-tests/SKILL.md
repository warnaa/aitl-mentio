---
name: om-integration-tests
description: Repository-local extension requiring linked Markdown scenarios and the supplied integration-testing practices.
---

# Integration tests in DevMentor

Apply this extension whenever the installed `om-integration-tests` skill runs.
Keep the installed skill's environment, runner, exploration, verification and
safety rules. This extension makes its optional Markdown step mandatory and
adds the user's scenario location and quality requirements.
Scenario documents are additional authored deliverables. Keep existing test,
report, evidence and environment outputs in their configured locations.

Before planning, authoring, modifying or running tests, read and apply all 15
sections of [the supplied best-practice guide](references/best-practices-testow-integracyjnych.md).
It is the user's required testing policy, preserved from their attachment.

## Required scenario documents

- Every scenario authored, modified or selected for execution by this skill must have a
  Markdown document at `.ai/qa/{AREA}/{AREA}-{number}-{slug}.md`, including in
  running-only mode. Update an existing document for the same case; do not
  create a new document on every run. For a suite, cover each selected case,
  including cases skipped or not reached after an aborted run.
- Use a short uppercase domain `AREA` matching `^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$`
  (for example `AUTH`, `MENTOR`, `BOOKING`). The folder and filename prefix must
  match. Reuse an existing area for the same domain.
- Use a positive per-area sequence padded to at least three digits (`001`,
  `002`, ..., `1000`). Inspect existing documents and executable case IDs;
  allocate the next unused number above the area's current maximum. Keep an
  existing case's number stable; never overwrite a different case or fill gaps
  belonging to retired cases. Detect conflicting IDs before writing.
- Use a lowercase kebab-case slug describing the condition and result, such as
  `.ai/qa/AUTH/AUTH-001-rejects-invalid-password.md`. Case ID: `AUTH-001`.
  Preserve an existing native executable ID separately when it differs.
- One document describes one business case. Keep TypeScript implementations in
  the repository's native integration-test location and follow its conventions.
  Commit scenario documents, sanitized screenshots and reports as project records
  alongside the work. Keep credentials and disposable runtime descriptors ignored.
- Every document must contain a clickable relative Markdown link to its actual
  TypeScript implementation and the exact `describe`/`it` test-case title (or
  stable native case ID) within that file. A file containing several existing
  cases may be linked by several documents; identify each exact case. Link to
  the test case, not just a helper, directory, placeholder or planned file.
- Resolve links relative to the scenario document. From `.ai/qa/{AREA}/`, a
  test under `tests/integration/` has a `../../../tests/integration/...` target.
  Check the file exists and the named case is present. Update links when moving
  or renaming tests, and keep documented steps and assertions synchronized.

## Scenario contents

Use [the scenario template](references/scenario-template.md) for each document.
Include the case ID, condition/result title, area, priority, UI/API type,
business requirement/spec link, implementation link and exact case name,
prerequisite role/data, Given-When-Then, a step/expected-result table, relevant
negative/boundary cases, cleanup, and latest verification and review status.
Separate additional business cases into their own documents and implementations.

Expected results must follow an identified requirement or contract. Exploration
confirms actual interactions; observed behavior alone does not establish the
correct expected result. Record a requirement gap rather than inventing one.
Record actual execution separately from expectations, including skipped/not-run
cases and blockers; never describe an unexecuted case as passed.

## Applying the guide

Check every scenario against all 15 guide sections before completion. Apply the
relevant positive, negative, permission, missing-resource, conflict, integration
failure, boundary and idempotency cases to the feature's coverage plan; record
why a class is inapplicable rather than forcing unrelated checks into one test.

For reproducibility, record random seeds for generated input and control the
clock or use explicit instants for time-sensitive behavior. Unique fixture
identifiers must not determine expected business outcomes. Wait on observable
state with bounded polling; keep timeout/retry policy in shared runner config.
Use controlled external adapters and assert relevant outgoing contracts, while
keeping the internal components under integration real.

The guide requires human review of AI-generated scenarios. Mark that review
`pending` until a person actually reviews them; passing automation or an agent
review does not establish human review. Continue authorized local work and
report the outstanding review honestly.

In running-only mode, assess and report existing test-quality gaps under the
guide without silently refactoring the suite. Produce/synchronize the required
scenario documents and preserve the actual executable cases and run outcomes.

## Completion check

Verify scenario paths and per-area ID uniqueness, resolve every implementation
link, confirm the exact case mapping, and compare documents with executable
setup/actions/assertions/cleanup. Include scenario and implementation links in
the run report. Keep normal execution and failure-analysis reporting from the
installed skill. No remote writes or suite-wide historical backfill are implied
beyond the cases in the requested run or authoring scope.
