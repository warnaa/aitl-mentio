# Platform primitives and mentor discovery — accepted corrections

Date: 2026-10-29
Outcome: complete — accepted corrections applied to both specs; implementation remains future work.

## Request

Apply all corrections, anti-pattern fixes, and simplifications accepted by the user
after `.ai/runs/2026-10-29-platform-mentor-design-review.md`.

## Plan and checklist

- [x] Align JSON form values, link arrays, datetime validation, and action error handling.
- [x] Preserve publication requirements under edits and concurrent writes.
- [x] Separate availability from booking eligibility and keep discovery queries local.
- [x] Replace render-time settlement with an authorized POST and durable payment retries.
- [x] Defer generic lifecycle code and primitives to actual consumers; reconcile phases.
- [x] Complete Polish error coverage and precise import enforcement.
- [x] Check both specs against the accepted review and verify the documentation diff.

## Scope and choices

The existing specs are the implementation plan; this run changes their design text,
not application code. Choose plain URL arrays, reject invalid edits to published pages,
and add small action/form error interfaces. Preserve the 15-minute grid while spelling
out its effective 60-minute spacing; no finer grid was explicitly chosen. Rates and
slots follow the mentor page independently; the complete discovery list follows both.

D22 (open publishing), R18 (block/grid), and R19 (publish window) remain the existing
owner decision gates. The user's acceptance resolves the reviewed technical fixes;
it does not select a different publishing policy or a different scheduling grid.

## Work completed

Updated both source specs and their implementation/Done means sections. Aligned URL
arrays and datetime wire values, added action errors/dirty-state interfaces, preserved
published completeness with content-only transactional upsert, and separated visible
availability from bookability. Discovery owns its query rather than exporting an ORM
builder between services. Pending payment creation and execution now have distinct
contracts, and actual visits trigger a CSRF-protected POST; GET/prefetch/metadata remain
read-only. Generic lifecycle machinery, mutation hooks, custom error codes, formatters,
commission helpers and role-scoped CRUD wait for their real consumers.

The installed MikroORM 7 types confirm `onConflictMergeFields` is a supported upsert
option. The specs keep existing package/security boundaries and require semantic
regression tests in the eventual implementation. No application code or database was
changed, and no tracker or publishing operation was performed.

## Verification

- Cross-checked all ten review findings and its anti-pattern/simplification recommendations
  against the corrected contracts, implementation plans and completion lists.
- A fresh-context scope/dependency review identified the staged money type and explicit
  auth fallback. Phase 1 now uses structural DTO money shapes without an unbuilt module;
  Phase 1a explicitly translates invalid/expired-session messages and tests that path.
- Markdown tables, fenced blocks, all 21 B/F primitive identifiers and cross-references,
  and completion sections passed a non-mutating structural check.
- `git diff --check` passed. Changes are confined to `.ai/` Markdown. Application tests,
  build, database migrations and browser QA were not run for these documentation changes;
  both specs retain the full implementation validation gate.
- Added a lesson about durable payment retry intent and linked the historical review to
  this accepted follow-up. D22/R18/R19 remain explicitly recorded product gates.

## Needs from you

None to apply the accepted corrections. The existing product gates remain documented
for implementation.
