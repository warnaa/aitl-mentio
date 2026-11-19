# Reconcile resolved documentation drift

Request: step 2 of weekly maintenance; correct resolved contradictions in today's audit in one separate PR, move only the two specs classified fully implemented, and leave code and existing implemented/archive spec content untouched.

## Plan

1. Verify report findings against current source and read-only branch rules.
2. Correct resolved documentation (W01-W04, W06-W07, W09-W10); retain W05/W08 as team follow-ups without weakening standards.
3. Move the release and documentation CI specs byte-for-byte with git mv; update references.
4. Check routes, classifier regressions, rename integrity, protected content and documentation-only scope; open one PR from a dedicated branch.

## Work and evidence

- Baseline: a4fe6eba727f9f21fba6fbcd1d7cc40f88a98840. Existing cockpit changes are unrelated and excluded.
- Read-only GitHub main rules confirm five required checks: Build, Unit tests, Secret scan, Dependency audit, CodeQL. No ruleset mutation is in scope.
- An independent read-only reference inventory found no affected links in existing implemented/archive specs.
- Source report: .ai/maintenance/2026-11-19-audit.md; its snapshot paths remain historical evidence.

## Outcome and follow-ups

Validation: instruction routes passed (21 tasks, 46 targets, 55 instruction files); native classifier/audit regressions passed 25/25. Rename/blob, protected-spec, comment-only workflow, reference and staged whitespace checks all passed. No app/build/integration/full-coverage run: executable behavior is unchanged. The release workflow reference changes only its comment; conservative CI classification will still select application checks for that YAML path.

Corrected W01-W04/W06-W07/W09-W10 in SDLC, development/review/security docs, README, lessons and affected active specs. Updated the two older run-record links and the release-workflow comment. The release and CI-split specs are moved without content edits; their original problem statements and check-count premise remain historical, qualified by current development docs. The audit's original paths identify the audited main snapshot and are deliberately retained.

The source maintenance Markdown report is included as evidence; pre-existing cockpit state/workflows and the broad HTML audit are excluded. No code, dependency, gate configuration, ruleset or existing implemented/archive spec content changed.

Local documentation reconciliation is complete and validated; publishing this branch as one ready PR is the final action. W05/W08 and check-membership policy will be carried in the PR description. Source-complete status does not establish production release execution or current full-suite coverage.
