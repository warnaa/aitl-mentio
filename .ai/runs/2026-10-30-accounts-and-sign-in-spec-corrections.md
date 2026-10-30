# Accounts and sign-in — accepted corrections

Date: 2026-10-30
Outcome: complete — accepted design corrections applied; implementation remains future work.

## Request

Apply all recommendations and simplifications from
`.ai/runs/2026-10-30-accounts-and-sign-in-design-review.md`, accepted by the user.

## Checklist

- [x] Preserve the original session deadline on mentor enrollment and require authoritative roles.
- [x] Simplify login throttling to synchronous all-attempt admission without live-key eviction.
- [x] Define legacy email normalization, collision refusal, and database enforcement.
- [x] Serialize role writes and align password rules and taken-email field errors.
- [x] Combine backend and UI into one deployable core-accounts PR and defer role-aware landing selection.
- [x] Align platform/E01 primitive ownership and E01/E02 account dependencies.
- [x] Re-read the corrected contracts, update lessons, and check the documentation diff.

## Scope and decisions

Only specifications and AI memory are changed. Core accounts become Phase 1 with
internal backend/UI stages; self-service mentor enrollment remains Phase 2 in this
spec, independently deployable after D22. The platform's own Phase 2 remains named
Phase 2 and is delivered by accounts Phase 1.

Resolve the review's implementation alternatives with the smallest concrete rules:
count all admitted login attempts, reject new limiter keys at capacity while keeping
active counters, retain the existing email unique constraint with a canonical-storage
check, lock the user row for role writes, return `400` for overlong login passwords,
and transport `fieldErrors.email` from the conflict itself. Token replacements use
the verified original expiry; initial credential sign-in sets a fresh 24-hour deadline.

D23 and D22 remain the source spec's existing owner gates. The technical review
acceptance does not select or enter these separate product-policy decisions. No
application code, migrations, runtime agent rules, or environment settings are changed.

## Files and downstream alignment

- `.ai/specs/2026-10-30-accounts-and-sign-in.md`: all six fixes, reduced abstractions,
  combined Phase 1, updated implementation steps and completion criteria.
- `.ai/specs/2026-10-29-platform-primitives.md`: accounts owns initial B7/B12/B13
  consumers; F2 uses verified expiry and ships within core accounts.
- `.ai/specs/2026-10-29-mentor-pages-and-discovery.md`: reuse accounts' migration
  harness, DB exports and role-aware route factory; depend only on core accounts.
- `.ai/specs/2026-10-29-book-and-pay.md`: depend on core accounts and align test
  expectations with every valid session containing `mentee`. The prior mentor-only
  `403` case was impossible under the accepted claims invariant; mentors may book
  other mentors, with self-booking and ownership restrictions retained.
- `.ai/lessons.md` and the original review log: record accepted contracts and link
  the historical findings to these corrections.

## Verification

Re-read the affected contracts and reviewed the tracked documentation diff. A second
scope review confirmed the two-phase structure and identified one gate-label wording
fix, which was applied. `git diff --check` and document whitespace/contract checks
passed, including the initially untracked accounts spec and run logs. No application
validation gate was run for this documentation-only change; implementation tests are
specified in the source document rather than claimed as executed.

## Needs from you

None to apply these corrections. D23/D22 still apply before their implementation
phases under the source spec's recorded policy gates.
