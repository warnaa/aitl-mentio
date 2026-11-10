# Run: operator sets the price bounds and the platform fee (#50)

Source doc: .ai/specs/2026-11-09-platform-settings.md
Spec PR: #86 (design-only; the spec file merges there, not on this branch)
Issue: #50 (E05-S02)
Driver: `om-auto-fix-issue 50` → feature route → `om-auto-write-spec` (#86) → `om-auto-implement-spec` → `om-auto-create-pr`

## Request

Run `om-auto-fix-issue 50`. The issue is a feature request, so the run takes the feature route: the spec goes on PR
#86 and the implementation ships on this branch.

## Goal

Move the 25/50-minute price bounds and a new platform fee (default 20 %) from `PLATFORM_PRICE_BOUNDS` into one
database row that the operator edits on `/admin/settings`. Mentors whose existing prices fall outside the bounds are
flagged and their prices are not changed.

## Scope

- db: `PlatformSettings` entity and the additive `platform_settings` migration.
- core: an update schema; `PlatformSettingsService` becomes async and DB-backed with the env fallback, and gains
  `update()`; `MentorProfileService.listOutOfBounds()`; callers `await` it.
- app: `GET`/`PUT /api/operator/settings`, the `/admin/settings` page and the nav entry.
- Docs: `README.md` and `BACKWARD_COMPATIBILITY.md` §3 and §4.

## Non-goals

- Removing the `PLATFORM_*` env variables. That needs a later PR under §4.
- Fee allocation and payouts (E03-S06, #44).
- Notifying mentors.
- A history table.
- Making the currency editable.

## Risks

- Money settings carry `risk-high`. `get()` becoming async touches the booking and price paths, and the existing
  suites guard that.
- `db:migration:create` churns unrelated tables (see lessons), so the migration is hand-written and only the new
  table goes into the snapshot.

## Progress

PR: #88

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Storage and validation

- [x] 1.1 Entity and migration — 070b4ae
- [x] 1.2 Update schema — 5f6789f

### Phase 2: Services

- [x] 2.1 Service read path (async, DB-backed, env fallback) — d03385b
- [x] 2.2 Service write path (operator, version check, audit) — d03385b
- [x] 2.3 Out-of-bounds list — d03385b

### Phase 3: HTTP and UI

- [x] 3.1 Operator settings route — 242c33d
- [x] 3.2 Settings page and nav — d9d5f46

### Phase 4: Integration and docs

- [x] 4.1 Integration test, coverage and compatibility docs — 0ff6033

## Outcome

- **Feature route of `om-auto-fix-issue 50`.** Issue #50 was classified as a feature and passed FR triage: nothing was built, nothing was in flight, and the ticket-level Definition of Ready held.
- **Spec PR #86.** It is design-only, ready, and labelled `documentation`, `skip-qa`, `risk-low`. The seven Open Questions were resolved with autonomous defaults, and none needs human confirmation. A fresh-context review folded its six Medium findings into the spec.
- **Implementation PR #88, Phases 1–4 done.**
  - db: entity plus hand-trimmed additive migration.
  - core: async DB-backed `PlatformSettingsService` with env fallback, operator `update()` (conflict-proof first insert, row lock, version check, audit log line), `listOutOfBounds()`, and settings read before locking transactions.
  - app: `GET`/`PUT /api/operator/settings`, `/admin/settings` and the nav entry.
  - Docs and coverage.
- **Gate:** typecheck, lint, 1866 unit tests and build passed. Integration passed for SETTINGS-001 (new) plus migrations, prices, booking, booking-concurrency, admin, roles (updated for the nav link) and session-notes-pool.
- **Review (`om-code-review` in a fresh-context subagent):** APPROVE with five minors and three nits, all handled in the review-fix commit.
  - The stale success message after a failed save is reset.
  - The audit line is written before the post-commit re-read.
  - The new 503 ordering under broken settings is documented in `BACKWARD_COMPATIBILITY.md`.
  - An unpriced-mentor case is added to SETTINGS-001.
  - The README section is moved and the lesson is one line.
  - The `toCents` duplicate stays on purpose: `parseMajorAmount` throws a `ValidationError`, which cannot be used inside a schema refinement.
- **Deliberate deviation from the spec's UI wording.**
  - The form uses five labelled fields, because `CrudForm` has no fieldset grouping; every label names its length and bound.
  - The currency is stated in the intro sentence, because the form has no read-only field type.
  - The caption reads "Using the default values. Nobody has changed them here yet." (Guidelines: full sentences, no semicolons).
  - Layout and intent match the mockup on #86.
- **CI on the ready PR caught two gaps the configured local gate does not cover.**
  - 100 % per-file branch coverage (`test:unit:coverage`) required tests for the `?? null` and deleted-editor branches (`4d72bec`).
  - `NOTES-007` needed one more `db:migrate:down` for the new migration (`e3501d1`).
  - All 9 checks are green on `e3501d1`.
- **Process incident.** A `cezar autosave` commit made during a usage-limit pause (ac1c3ed) put the spec file on this branch. It was removed again in 38ad2d7, so the spec still merges only through #86.

## Follow-ups

- E03-S06 (#44) reads `feePercent` from `PlatformSettingsService.get()` and snapshots it per paid session. AC 2 ("later paid sessions use it") is verified there.
- Notify mentors when a bounds change flags their prices (spec Q7). This is not in this story.
- Remove the `PLATFORM_PRICE_BOUNDS` and `PLATFORM_CURRENCY` env variables once every environment has a saved row, under `BACKWARD_COMPATIBILITY.md` §4.
- Manual QA on #88 (`needs-qa`, `risk-high`, second reviewer).
