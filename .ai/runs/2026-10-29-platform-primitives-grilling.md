# Apply accepted platform-primitives grilling decisions

Date: 2026-10-29
Status: done

## Request

Apply the ten design decisions accepted during the `grill-me` interview and confirmed
with “yes apply”. Update the platform specification and directly affected mentor
specification contracts. This run changes documentation only.

## Task checklist

- [x] Q1: retain B8–B11 safety invariants; future consumers own concrete designs.
- [x] Q2: require nonnegative safe-integer money and checked arithmetic; bound basis points.
- [x] Q3: busy mutation calls return null without a request or callbacks.
- [x] Q4: map only not-found/forbidden page errors to 404; pages handle bad input explicitly.
- [x] Q5: state last-write-wins for valid edits; retain publication locking and dirty input.
- [x] Q6: use a maintained timezone dependency with explicit calendar/DST behavior.
- [x] Q7: clear query data on path changes or disabling.
- [x] Q8: identify invalid URL rows in top-level field-error messages.
- [x] Q9: retain query data only for retries or shared offset/limit changes.
- [x] Q10: replace fractional PLN construction with integer-only fromWholePln.
- [x] Synchronize contracts, implementation plans, risks and Done means.
- [x] Check the diff and documentation structure; record outcome.

## Files

- `.ai/specs/2026-10-29-platform-primitives.md`
- `.ai/specs/2026-10-29-mentor-pages-and-discovery.md`
- `.ai/lessons.md` (accepted future-design refinements)
- This run log.

## Outcome and verification

All ten decisions are applied to the platform spec; directly affected mentor contracts
and acceptance tests are aligned. The timezone library is deliberately selected in
the #16 implementation step, with compatibility and DST criteria specified here.

Verification:

- `git diff --check` passed.
- Read-only structural checks passed for Markdown fences/tables, final completion
  sections, all B1–B13/F1–F8 definitions/references and all ten accepted contracts.
- Obsolete endpoint/state/helper and money/query/time-conversion wording was checked.
- D22/R18/R19 owner gates are unchanged; lessons remain append-only.
- Independent diff review found no actionable blockers and confirmed consistency
  across contracts, implementation plans and completion criteria.

Application validation is skipped under the repository's Markdown/`.ai/` exemption.
No application code, dependencies, commits or tracker actions were changed.
An unrelated `.ai/specs/2026-10-29-book-and-pay.md` appeared in the shared worktree
during this run; this task did not edit it.

## Needs from you

none
