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

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Storage and validation

- [x] 1.1 Entity and migration — 070b4ae
- [x] 1.2 Update schema — 5f6789f

### Phase 2: Services

- [ ] 2.1 Service read path (async, DB-backed, env fallback)
- [ ] 2.2 Service write path (operator, version check, audit)
- [ ] 2.3 Out-of-bounds list

### Phase 3: HTTP and UI

- [ ] 3.1 Operator settings route
- [ ] 3.2 Settings page and nav

### Phase 4: Integration and docs

- [ ] 4.1 Integration test, coverage and compatibility docs

## Outcome

Pending.

## Follow-ups

Pending.
