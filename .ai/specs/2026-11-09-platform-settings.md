# DevMentor — E05-S02: The operator sets the price bounds and the platform fee

Issue: #50 (epic #30). Depends on E01-S03 (#33, merged). Feeds E03-S06 (#44, open).

## 📝 TLDR

Today the 25- and 50-minute price bounds come from the `PLATFORM_PRICE_BOUNDS` environment variable that a founder edits by hand
(R18), and there is no platform fee setting at all. This spec moves the bounds and the fee into one database row
that an operator edits on `/admin/settings`. The new values apply to every later price save, offer-readiness
check and booking. Mentors whose existing prices fall outside new bounds are flagged on the same screen; their stored
prices are not changed. The fee defaults to 20 % (D11/R10) and is exposed through `PlatformSettingsService.get()` for
E03-S06 to snapshot.

## Resolved assumptions (autonomous defaults)

The ticket listed no open questions. Writing the design surfaced the following. Each one was resolved with the most
reversible default and can be overridden before merge.

| # | Question | Default applied | Rationale |
|---|---|---|---|
| Q1 | Should the bounds and the fee be split into two specs? | No, one spec. | Both are fields on the same settings row, the same service, the same screen, and the same ticket. On its own the fee is only a stored number until E03-S06 reads it, so a split would leave two half-screens. |
| Q2 | What happens to a mentor whose existing price falls outside new bounds? | Keep the shipped behaviour from the mentor-prices spec. The stored price is untouched and listed on the settings screen. The mentor is not offer-ready, so their prices are hidden and they cannot be booked until they save prices inside the bounds. Bookings already reserved keep their snapshotted `priceCents`. | `mentorOfferReady` and `pricesDto` already apply the bounds when the price is read. Keeping that rule changes no existing contract and matches R08 ("held to the bounds"). The settings screen shows which mentors a change affects, so the effect is never silent. |
| Q3 | Should the fee be a whole percent or allow fractions (basis points)? | A whole integer percent from 0 to 100, as the ticket says. | D11 states 20 % and the ticket says `0 <= feePercent <= 100`. Widening the column to basis points later is an additive migration. |
| Q4 | How do the env values reach the new row without changing behaviour on deploy? | Lazily. The migration creates the table without inserting a row. While no row exists, `get()` returns the env values (bounds) and 20 % (fee). The first operator save inserts the row. The env variables stay as they are. | A migration runs under `packages/db`'s env, which does not know `PLATFORM_PRICE_BOUNDS`, so it cannot seed the deployed value. A literal seed would silently override a deployment that set different bounds. A lazy fallback keeps today's behaviour until an operator acts. Removing the variables is a later PR under `BACKWARD_COMPATIBILITY.md` §4. |
| Q5 | Is a change history required (D19 asks for operator actions to be logged)? | No history table. The row stores `updatedBy` and `updatedAt`, and the screen shows them. The service writes one structured `info` log line (`operator.settings.updated`) with the actor and the old and new values. That log line is the audit record, kept as long as application logs are retained. | This is the smallest surface that still answers "who changed it and when". A history table can be added later without changing this row. |
| Q7 | Should a save that flags many mentors ask for confirmation, and should flagged mentors be notified? | No to both in this story. The save response and the page list every affected mentor, and saving again undoes the change. Mentor notification is a follow-up. | Least new surface. The effect is visible and reversible straight away. A confirmation step or a notification is additive later. |
| Q6 | Can the operator change the currency? | No. PLN is displayed read-only. | R21/D28: a currency change needs a separate product decision and a price migration. |

## 📝 Problem Statement

D09/R08 and D11/R10 give the operator control over the price bounds and the platform fee. Until this story ships,
changing a bound means a founder edits an environment variable and redeploys (R18). That is slow, unaudited and
invisible to the other founder. The fee does not exist in the system yet. E03-S06 (#44) needs it to split each paid session.

## 📝 Proposed Solution

- One `platform_settings` row (fixed id) holds the four bounds, the fee percent, the currency, a version, and the
  last editor.
- `PlatformSettingsService` keeps its role as the single source of the settings. `get()` becomes `async`: it reads
  the row once per request scope, falls back to the env values when no row exists, and fails closed
  (`ServiceUnavailableError`) when neither the row nor the env value is valid, as it does today. `update(input)` is
  for operators only.
- A new operator route `GET/PUT /api/operator/settings` and a page `/admin/settings` built on `CrudForm`. Below the
  form, the page lists the mentors whose current prices are outside the saved bounds.

Alternatives rejected: keeping env-only configuration with a "restart to apply" note (does not meet the ticket); a
generic key/value settings table (loses DB-level checks on money values and invents a primitive the codebase does
not have).

## 📝 Architecture

- **db** — `packages/db/src/entities/operator/platform-settings.entity.ts` (`PlatformSettings`), exported from the
  entities index; one additive migration `platform-settings`.
- **core**
  - `services/operator/platform-settings.service.ts`:
    - `get(): Promise<PlatformSettings>` returns
      `{ currency, priceBounds: { p25, p50 }, feePercent, version, updatedAt, updatedBy }`. `version` is 0 and
      `updatedAt`/`updatedBy` are null while the values come from the env. The result is memoised on the scoped
      instance, so one request reads the row once.
    - `update(input)`:
      1. `requireRole(session, 'operator')`.
      2. Parse the input with the update schema.
      3. In a transaction, run `INSERT … ON CONFLICT (id) DO NOTHING` with the current effective values at
         `version` 0, then lock the row (`PESSIMISTIC_WRITE`). Two concurrent first saves therefore never surface
         a primary-key violation; the loser fails the version check in step 4 instead.
      4. Compare `version` and throw `ConflictError` on mismatch.
      5. Write the values, `version + 1`, `updatedBy`, `updatedAt` (from `clock`).
      6. Log the change and clear the memo.
      7. Return the new settings plus `outOfBounds`.
    - The service gains `em`, `session` and `clock` dependencies, and keeps `env`.
  - `validators/operator/platform-settings-update.schema.ts`: `price25Min`, `price25Max`, `price50Min`, `price50Max` as
    major-unit decimal strings, parsed with `parseMajorAmount`. Each must be a positive integer number of cents no
    larger than `MAX_CENTS`, and `min <= max` per length. A `superRefine` puts the error on the `…Max` field.
    `feePercent` is an integer 0–100; `version` is a non-negative integer.
  - `services/mentors/mentor-profile.service.ts#listOutOfBounds(settings)` is operator-only. It returns up to 200
    mentors, each with at least one set price outside the bounds:
    `{ mentorProfileId, displayName, slug, published, price25Cents, price50Cents, breaches: ('price25'|'price50')[] }`,
    plus `total`. Mentors with no price yet are not flagged. Stored prices are never modified.
  - Every current `platformSettingsService.get()` caller adds `await`: `mentor-profile.service.ts` (owner DTO,
    `updatePrices`, public read) and `booking.service.ts`. Their `Pick<…, 'get'>` dependency types stay.
    `readiness.ts` keeps taking a settings object and is unchanged.
- **app**
  - `api/operator/settings/route.ts`: `GET` and `PUT` through `apiHandler`, operator only. `apiHandler` already
    enforces the CSRF header on `PUT`, and routes must not call `requireCsrfHeader` themselves
    (`packages/core/AGENTS.md`).
  - `admin/settings/page.tsx` uses `withPageScope` and `requirePageRole('operator', '/admin/settings')`.
  - A `Settings` entry is added to the operator's items in `lib/nav.ts`, which is where operator navigation lives;
    `admin/layout.tsx` only renders the shell.

No events are added. Price and booking consumers pick up new values on their next request because nothing caches
them past the request scope.

## 📝 Data Model

`platform_settings` table:

| Column | Type and constraints |
|---|---|
| `id` | `smallint` primary key, check `id = 1` |
| `price25_min_cents`, `price25_max_cents`, `price50_min_cents`, `price50_max_cents` | `integer`, checks `min > 0`, `min <= max`, `max <= MAX_CENTS` |
| `fee_percent` | `smallint`, default 20, check 0–100 |
| `currency` | `text`, check `= 'PLN'` |
| `version` | `integer`, default 0 (the first save writes 1) |
| `updated_by_id` | `uuid`, nullable, foreign key to `users` with `on delete set null` |
| `updated_at` | `timestamptz` |

The migration is additive, has a `down`, and inserts no row. Following the 2026-11-07 and 2026-11-08 lessons, keep
only the new table in the committed snapshot and hand-write the migration if `db:migration:create` churns unrelated
tables. The table holds no personal data apart from the editor's user id.

## 📝 API Contracts

`GET /api/operator/settings` returns 200 with:

```json
{
  "settings": {
    "currency": "PLN",
    "priceBounds": { "p25": { "minCents": 8000, "maxCents": 60000 }, "p50": { "minCents": 16000, "maxCents": 120000 } },
    "feePercent": 20,
    "version": 0,
    "updatedAt": null,
    "updatedBy": null
  },
  "outOfBounds": { "total": 0, "mentors": [] }
}
```

`updatedBy` is `{ "displayName": "…" }` when a row exists.

`PUT /api/operator/settings` takes this body and returns 200 with the same shape:

```json
{ "price25Min": "80.00", "price25Max": "600.00", "price50Min": "160.00", "price50Max": "1200.00", "feePercent": 20, "version": 0 }
```

Errors:

- 401 when signed out; 403 for any non-operator.
- 403 when the CSRF header is missing.
- 422 `ValidationError` with field errors, for example a minimum above the maximum or a fee of 101.
- 409 `ConflictError` ("Settings changed since you opened them. Reload to see the current values.") on a version
  mismatch.
- 503 when the settings are unreadable.

## 📝 UI/UX

`/admin/settings` ("Platform settings"):

- **Form.** A `CrudForm` with `method: 'PUT'` and two fieldsets, "25-minute sessions" and "50-minute sessions", each with
  a minimum and maximum PLN amount. A third field holds the "Platform fee (%)". The currency appears as read-only
  text. Field-keyed errors come from the 422 response.
- **Last change.** A caption reads "Last changed by {name} on {date}", or "Using the default values; not yet changed
  here" when no row exists.
- **Flagged mentors.** A section titled "Prices outside the bounds" with a table (mentor, 25-min price, 50-min price,
  which bound is breached) and the sentence "These prices are not changed. These mentors cannot be booked until
  they set prices within the bounds." The empty state reads "Every mentor's prices are within the bounds." The table
  refreshes from the `PUT` response after a save.

Visible copy follows `packages/ui/.storybook/Guidelines.mdx`. Mockup: `assets/platform-settings/mockup-01-settings.png`.

## 📝 Edge Cases & Failure Scenarios

1. No row and a valid env: the env values plus 20 % are served (today's behaviour). The first save inserts the row.
2. No row and a malformed env: `get()` throws 503, so price saves, bookings and the settings page fail closed. The
   operator can still `PUT` valid values, which repairs the problem.
3. Two founders save at the same time: the second gets 409 and keeps their draft in the form.
4. Bounds are tightened past a mentor's price: that mentor is listed and becomes not offer-ready (Q2). A pending
   booking keeps its snapshotted price. The mentor's own readiness list shows "Set a valid 25-minute price."
5. A price save or booking runs while the bounds are changing: settings are read once per request, in one
   statement, and are not locked. A request that started before the save may therefore apply the old bounds. A
   price saved that way can sit outside the new bounds, and readiness gating is the backstop: that mentor is
   listed and is not offer-ready until they save again. A booking re-reads the settings on its own request, so it
   never mixes old and new values.
6. Checkout and payment confirmation for a booking that is already reserved do not re-check bounds; only
   `BookingService` asserts `mentorOfferReady`. A hold made before a tightening is paid at its snapshotted price.
7. A save that affects many mentors (for example, a very low maximum) takes effect immediately. The `PUT` response
   and the page list everyone affected, and the operator undoes it by saving again. Mentors are not notified in
   this story; that is a follow-up.
8. The operator role is removed mid-session: every request re-derives roles, so the next `PUT` returns 403.
9. The database is down: the page shows the app error page, as other admin pages do.

## 📝 Risks & Impact Review

- **Risk.** Money: every price check and the future fee split read these values. Labels `risk-high` and
  `needs-qa`, plus a second reviewer.
- **Compatibility.**
  - `BACKWARD_COMPATIBILITY.md` §3 (new table, additive) and §4: env variables are unchanged and still honoured
    while no row exists. Document in `README.md` and §4 that a saved row takes precedence over
    `PLATFORM_PRICE_BOUNDS`.
  - `get()` turning `async` is an internal change inside `core`, not a package export used outside it. Check this
    with a grep of `packages/app` during implementation.
- **Rollback.** Run the migration's `down`. This drops the table and its saved values, and the app returns to the
  env values. Before rolling back, copy the saved bounds into `PLATFORM_PRICE_BOUNDS` if they should survive.
  The fee has no env value, so it returns to 20 %; record the saved fee in the rollback note so it can be
  restored once the change is re-deployed.

## 📝 Decisions in play

D09/R08 (bounds), D11/R10 (fee 20 %, configurable), R21/D28 (PLN, initial bounds), R18 (manual operator changes
until this ships), D19 (operator is the two founders; actions logged), D13 (this story is 1.1). Nothing is superseded.

## ✅ Acceptance criteria

1. Given the operator, When they save minimum and maximum bounds for 25- and 50-minute prices, Then later mentor
   price saves are held to them. Existing prices outside the new bounds are listed on the screen and are not changed. (R08)
2. Given the operator, When they save a platform fee, Then `PlatformSettingsService.get()` returns it for later paid
   sessions (consumed by E03-S06). With nothing saved, the fee is 20 %. (R10)
3. Given a fee outside 0–100 or a minimum above its maximum, When saved, Then the save is refused with a field error
   and nothing changes. (negative)
4. Given a non-operator (or a signed-out visitor), When they open `/admin/settings` or call the route, Then they are
   refused. (negative)
5. Given a stale form version, When saved, Then the save is refused with 409 and the stored values are unchanged.
6. Given no saved row, When the app runs, Then the bounds come from `PLATFORM_PRICE_BOUNDS` exactly as before this change.

## 📋 Phasing

One phase, one PR. The fee is stored and served here; E03-S06 consumes it.

## 📋 Implementation Plan

1. **Entity and migration.** Add the `PlatformSettings` entity, register it, and add the migration with `up`/`down`.
   Write an entity test, and exercise the migration in both directions.
2. **Schema.** Add `platform-settings-update.schema.ts` with unit tests for min above max, fee of 101 and -1, a
   non-integer fee, a zero minimum, an amount above `MAX_CENTS`, and malformed decimals.
3. **Service read path.** Make `get()` async and DB-backed with the env fallback and memo. Update all callers and
   their tests to `await`. The existing suites must stay green, which shows the fallback preserves behaviour.
4. **Service write path.** Add `update()` with the operator check, row lock or insert, version check, audit fields
   and log line. Test 403 for non-operators, 409 on a stale version, insert-on-first-save writing version 1, two
   concurrent first saves (one wins, the other gets 409, never 500), and the next `get()` returning the new values.
5. **Out-of-bounds list.** Add `listOutOfBounds()` with tests: an out-of-bounds mentor is listed and their prices
   are unchanged, an unpriced mentor is not listed, and an operator check applies.
6. **Route.** Add `api/operator/settings/route.ts` with route tests: GET and PUT for the operator, 401, 403, CSRF,
   422 and 409.
7. **Page and nav.** Add the `admin/settings/page.tsx` client form and flagged list, the `lib/nav.ts` entry, and
   component tests.
8. **Integration and docs.** Add an integration test that saves tighter bounds as the operator: the mentor's price
   save is refused outside them, the out-of-bounds mentor is listed and not bookable, and their stored price is
   unchanged. Update `coverage.include` in `vitest.config.mts`, plus `README.md` and `BACKWARD_COMPATIBILITY.md`
   §3 and §4.
