# 2026-11-01 — Admin Users screen stories (separate-session design-system test)

## Asked

Build the administrator Users screen (`/admin/users`) as new Storybook stories from the design system,
following the prepared test prompt in `packages/ui/POSTEP.md` (Stage 5 → Prepared test). Sources named:
`.ai/specs/backlog.md` E01-S01-T01; `.ai/specs/2026-10-30-accounts-and-sign-in.md` UI/UX → Admin pages
and Stage B.4; `packages/app/src/app/admin/users/` and its service/API contract. Constraints: preserve the
columns Email, Name (missing “—”), Created, newest first, page size 20; English story UI; fictional data;
no invented admin actions; current admin layout as reference (no PanelShell); real package components;
semantic tokens; no new variants, tokens, dependencies or production components; no app edits, no push.
Show first load, results, empty, load failure with retry, refresh/pagination with rows kept, missing names,
long data; verify 320/768/1440 in light and dark, keyboard and axe; keep a decision ledger.

## Checklist

- [x] Read `docs/design-system.md`, Start here, Content, Usage and accessibility, Contributing, What is missing,
      DataTable, Table, PanelShell, List with filters, E01 epic page, accounts screens
- [x] Read the accounts spec (UI/UX, API contracts, Stage B.4, Done means), backlog row, platform spec F1–F3, F7, F8
- [x] Read the app's admin layout, page, users table, `/api/users` route, `UserService`, pagination schema
- [x] Fixtures, frame helper, stories (14)
- [x] Story tests in both themes with axe (28/28); full story suite (986/986 on rerun)
- [x] Width/theme sweep 320/768/1440 × light/dark (84 checks), keyboard checks (6), screenshots
- [x] Gate: lint, typecheck, tokens, agent-doc, unit coverage 100%, app build, Storybook build, audit, integration
- [x] Decision ledger (below)
- [x] Reviewer decisions 2026-11-01 (see Follow-up): 1 platform spec, 2 ok, 3 fix in component, 4 fix all, 5 ok
- [x] Component fixes (Table, DataTable, CSS), unit tests, primitive stories, docs; admin stories updated
- [x] Gate and sweep rerun after the fixes
- [x] Remaining gaps L-11, L-12, L-13, L-16, L-18 added to **What is missing** (user decision 2026-11-01); page axe-checked at 3 widths × 2 themes (`…-what-is-missing-axe-report.json`: only the two docs-iframe page rules, 0 otherwise, 0 overflow)
- [x] Committed on branch `ui/admin-users-stories` (not pushed); unrelated root files (`lekcja-07.zip`, `prompty/`, `*.txt`, …) left out

## Files

Added (no existing file changed except the lessons log):
- `packages/ui/storybook/product/accounts/admin-users.stories.tsx` — 14 stories, title
  `Product/Platform and accounts/Admin users`.
- `packages/ui/storybook/product/accounts/admin-frame.tsx` — documentation helper mirroring `admin/layout.tsx`.
- `packages/ui/storybook/fixtures/users.ts` — 45 fictional accounts, legacy null names, one long account.
- `packages/ui/storybook/verification/2026-11-01-admin-users-browser-report.json` — sweep and keyboard results.
- `packages/ui/storybook/verification/2026-11-01-admin-users-negative-control.json` — the axe failure without L-14.
- `packages/ui/storybook/verification/admin-users-screenshots/` — 13 screenshots.
- `.ai/lessons.md` — one appended entry (scroll region without focusable content).

Not touched: `packages/app`, `docs/design-system.md`, any Storybook guide or component page, `src/`.

## Stories

| Story | State | Request (MSW) |
|---|---|---|
| Users — first load | LoadingMessage before the first page | `GET /api/users` never answers |
| Users — results | 20 rows, “1–20 of 45”, Previous disabled | page from the 45-row fixture |
| Users — empty | EmptyState “No users yet” | `items: [], total: 0` (see L-17) |
| Users — load failed (network) | ErrorMessage + Try again | network error → `apiCall`'s fixed message |
| Users — load failed (server error) | ErrorMessage with the envelope message | `500 { ok: false, error: internal_error }` |
| Users — retry after a failed load | Try again → rows | network error, then the list (play swaps the handler) |
| Users — next page loading (rows kept) | page 1 rows kept, `aria-busy`, both buttons disabled | offset 20 never answers |
| Users — paging to the last page and back | 21–40, 41–45 (5 rows), back | list |
| Users — next page failed, retry | rows replaced by ErrorMessage, retry loads 21–40 (L-15) | offset 20 fails, then the list |
| Users — missing names | “—” for three legacy rows | 6-row fixture |
| Users — long data | 80-character name, 87-character email, wrapped | long row + list |
| Users — narrow, results / narrow, long data | 320 px stacked rows | as above |
| Users — keyboard paging | Tab reaches Next, Enter loads page 2 | list |

## Validation evidence

| Check | Result |
|---|---|
| New stories, `vitest.storybook.config.ts` (axe `error`, light + dark) | 28/28 pass |
| Negative control: L-14 classes removed | 26/28 — “long data” fails `scrollable-region-focusable` in both themes (`…-negative-control.json`) |
| Full `npm run test:storybook` | first run 983/986 (Button Playground, PanelShell Skip link, Popover Playground: 15 s timeouts, light only — the cold-run timing noted in stage 5); identical rerun 986/986 |
| Sweep: 14 stories × 320/768/1440 × light/dark, Playwright + axe-core (WCAG 2.0–2.2 A/AA + best-practice), waiting for Storybook's render phase `finished` | 84 checks: 0 axe violations, 0 page overflow, 0 table-container overflow, all play phases finished, no console errors other than the browser's “Failed to load resource” for the deliberately failed requests |
| Layout | 320: rows stack, sidebar hidden; 768: rows stack (content column < 48rem), sidebar shown; 1440: table rows, sidebar shown |
| Rows kept on next page | `aria-busy="true"`, page-1 rows and “1–20 of 45” still shown, at every width/theme |
| Keyboard (6 width/theme runs) | Tab order 320: Mentio Admin → Next; 768/1440: Mentio Admin → Dashboard → Users → Next (Previous disabled, skipped). Next has the 3 px ring with 2 px offset; frame links show the browser's 1 px auto outline (L-10). After Enter on Next, focus is on `body` (L-20) |
| `npm run lint`, `npm run typecheck`, `npm run check:tokens`, `npm run check:agent-doc` | pass |
| `npm run test:coverage` | pass, 100% statements/branches/functions/lines (stories are outside the coverage scope) |
| `npm run build`, `npm run build-storybook` | pass; 14 stories in the built index |
| `npm run audit` | pass (it again reports the stale `braces` allowlist entry; out of scope) |
| `npm run test:integration` | 10/10 on a throwaway trust-auth PostgreSQL 17 cluster (port 5435), stopped afterwards; shared database untouched |

Not verified: manual screen reader, Safari/Firefox (same limitation as stage 5); reduced motion only as the
test harness default (`reducedMotion: 'reduce'`). The sweep script lived in `/tmp` and is not committed.

## Decision ledger

Kinds: **Sourced** — decided by the cited file; **Conflict** — sources disagree, the choice is named;
**Gap** — no file answers it; **Proposal** — my choice where files are silent, marked in code.

| # | Decision | Kind | Source (file → section) | Effect on the screen |
|---|---|---|---|---|
| L-01 | Stories under `Product/Platform and accounts/Admin users`, files in `storybook/product/accounts/` | Sourced | `packages/ui/POSTEP.md` → Storybook menu (“Platform and accounts # includes existing admin patterns”); same section, screen-stories table (“Existing admin overview/users”) | — |
| L-02 | English story copy | Sourced / Conflict | task; `design-system/content.mdx` (stories in English); accounts `screens.mdx`. Accounts spec UI/UX says every screen is Polish (R15, F1); the app's admin is English today | App copy differs after F1 |
| L-03 | Columns Email (`font-medium`), Name (`?? '—'`), Created (`text-right tabular-nums`) | Sourced | `admin/users/users-table.tsx` → `columns`; task | — |
| L-04 | **Resolved 2026-11-01 → platform spec:** “31 October 2026”, Warsaw time (English stand-in for F7 `formatDay`, which is not built). Originally: `createdAt.slice(0, 10)` | **Conflict** (resolved) | Kept: `users-table.tsx`. Against: platform spec F7 and Phase 1a step 3 (`formatDay`, “4 listopada 2026”, Warsaw time) and DS `primitives/table.mdx` → Content / `content.mdx` → Formats (“4 Nov, 18:00”, no year; the reason given is the 14-day booking window) | The format, and the day at a UTC/Warsaw midnight boundary. **Needs decision** |
| L-05 | Newest first is the server's order; the mock serves a pre-sorted fixture, no client sort | Sourced | `core/services/auth/user.service.ts` → `list` (`createdAt desc, id asc`) | — |
| L-06 | Page size 20, `limit`/`offset` query | Sourced | `users-table.tsx` (`PAGE_SIZE`); `core/validators/pagination.schema.ts` | — |
| L-07 | Requests through the real `apiCall('/api/users', { query })`; MSW returns the `{ ok, data: Page }` envelope; errors as `apiHandler` sends them | Sourced | task; AGENTS.md → Reusable API & UI layer; `ui/backend/api/apiCall.ts`, `types.ts`; `core/http/apiHandler.ts` (`INTERNAL_ERROR`) | — |
| L-08 | `AdminUser` type declared in the fixture, mirroring `UserDto` | Sourced | AGENTS.md → dependency direction (`ui` must not import `core`) | Must be kept in sync by hand |
| L-09 | Local state keyed by request identity: rows kept on retry and on offset change | Sourced / Gap | `users-table.tsx` (reference example); platform spec F3 (retain data only for retry and `offset`/`limit`). Gap: F3's `useApiQuery` does not exist in `ui/src/backend/api/` (Phase 1b not built), so the state logic is written in the story | When F3 lands, the screen should use it |
| L-10 | **Accepted 2026-11-01 (“ok”) until the PanelShell migration.** Frame mirrors `admin/layout.tsx`: sidebar from 768 px, header with “Mentio Admin” below 768 px, no skip link, no current-page marker, browser-default focus outline on frame links | Sourced / **Conflict** | task; `what-is-missing.mdx` (“/admin on PanelShell … until then the existing admin layout”); `panel-shell.mdx` §2. Against: `panel-shell.mdx` §12 lists exactly this layout as **Bad** (“navigation hidden on mobile with no alternative”); `usage-and-accessibility.mdx` → Keyboard (skip link, 3 px ring) and Colour (current page has bar + tint) | At 320 px there is no way to reach Dashboard except the home link; keyboard users get no skip link and a thin focus outline. **Needs decision** (fix in the layout, or record as accepted until the PanelShell migration) |
| L-11 | Frame surfaces opaque `bg-background` instead of the app's translucent `bg-muted/40`; `px-panel`/`p-panel` (24 px, same value as the app's `px-6`/`p-6`); other spacing as in the app (`w-60`, `h-14`, `py-5`, `p-3`, `px-3 py-2`, `gap-1`) | **Proposal** | `docs/design-system.md` decision 3 (opaque surfaces, no glass); `usage-and-accessibility.mdx` → Colour; Semantic tokens table. No token covers the other values | Main area is the page background, not a muted tint |
| L-12 | `h1` uses the page role `mentio-public-title` (24/32 semibold, same size as the app's `text-2xl`, without `tracking-tight`); description `text-sm text-muted-foreground` with the app's text; content up to `--content-max-width` (1152 px) instead of the app's `max-w-5xl` (1024 px); `gap-between-groups` (16 px) instead of `gap-6` | **Proposal** / Conflict | DS Semantic tokens → Type roles and Widths; `product/shells.tsx` `Stack` precedent. Against: `admin/users/page.tsx` | Slightly wider table and tighter header spacing than the app |
| L-13 | First load is DataTable's built-in LoadingMessage (“Loading…”), not a Skeleton | Sourced / Conflict | `data-table.mdx` §6 (First load → LoadingMessage). Against: `docs/design-system.md` If… use… (“First load, known layout: Skeleton plus a text status”) | Spinner + text instead of row skeletons |
| L-14 | **Resolved 2026-11-01 → fixed in the component:** `Table` makes its container a focusable region (named like the table) while it overflows; DataTable gains `label`; the story passes `label="Users"`; the wrap proposal is removed. Originally: Email/Name got `whitespace-normal wrap-anywhere` | **Proposal** (superseded) | Gap: `table.mdx` §8–9 says cell text does not wrap and a long value scrolls with the table, but that scroll region is only keyboard-reachable when cells contain links (the Table stories do). This list has none, so axe fails `scrollable-region-focusable` (negative control). The only alternatives were a production change or disabling the rule | Long emails/names wrap in the wide table instead of scrolling. **Needs decision**; possibly a DataTable/Table fix (focusable container) |
| L-15 | **Fixed 2026-11-01:** rows stay, ErrorMessage + Try again above them. Originally: a failed refresh replaces the kept rows with ErrorMessage; Try again repeats the same page | Sourced (existing behaviour) / Gap | `DataTable.tsx` (error before rows); `data-table.mdx` §6. Gap: F3 retains data while loading but no file says whether a failure on page 2 should keep page 1 visible | Rows disappear when the next page fails |
| L-16 | Failure copy is whatever `apiCall` returns: “Check your connection, then try again.” (network) or the envelope's “Internal server error” (server); title is ErrorMessage's default “Something went wrong” | Sourced / Gap | `apiCall.ts` (`NETWORK_ERROR_MESSAGE`); `apiHandler.ts`; `users-table.tsx` (`error.message`). Gap: `content.mdx` → Errors (say what happened, then what to do) vs the internal-error text, which has no next step; F1 only translates it | Server failure shows a terse, non-actionable message |
| L-17 | **Accepted 2026-11-01.** Empty: “No users yet”, no description, no action | Sourced / Gap | `users-table.tsx` (`emptyTitle`). Gaps: `content.mdx` → Empty states asks for why + next step, and no admin action exists to offer (task: no invented actions). Once Stage B.4 ships, only an admin can see the page, so `total` is at least 1 and this state is unreachable | Story kept because the task asks for it; labelled in code |
| L-18 | **Accepted 2026-11-01 as unspecified.** The app's client mapping of `401` to “Sign in to view users.” is not reproduced; no 401/403 stories | Sourced / Gap | task (guard is a server contract; do not simulate client-side authorization); accounts spec Stage B.4 (guard in the page loader). Gap: no file says what the list shows when `GET /api/users` returns `401`/`403` after the page rendered (session revoked or expired mid-visit; spec: every request re-checks PostgreSQL) | Undefined screen state |
| L-19 | Guard outcomes are not stories: signed out → `/logowanie?returnTo=…`; signed in without `admin` → Polish 404 | Sourced | accounts spec UI/UX → Admin pages, Stage B.4, Done means; platform spec F2. The 404 page is not designed (`what-is-missing.mdx`) | Documented in the stories file header only |
| L-20 | **Fixed 2026-11-01:** paging buttons are `aria-disabled` (focusable, inert) while loading and at the ends; the range is a polite `role="status"`. Originally: focus drops to `body` after Next/Previous (DataTable disables the buttons while loading); the new range is not announced (only `aria-busy`) | Gap (existing component; not changed) | Measured in all 6 keyboard runs. No guide covers focus or announcements after pagination (`data-table.mdx` §7 mentions `aria-busy` only) | Keyboard and screen-reader users lose their place on every page change |
| L-21 | **Fixed 2026-11-01:** stacked cells are `text-align: start !important`. Originally: in stacked rows, Created stays right-aligned | Gap (existing column + component) | The column's `text-right` utility overrides the stacked `text-align: start` (utilities layer beats components). `data-table.mdx` §9 does not mention alignment classes | Created label/value sit on the right at 320/768 px (screenshots) |
| L-22 | 768 px stacks rows | Sourced | `data-table.mdx` §9 (rows stack at 320 and 768) | — |
| L-23 | Fixtures: `example.test` addresses, fictional Polish names, null names for legacy rows, 80-character name, 87-character email; 45 rows (3 pages) | Sourced / Proposal | `fixtures/*` precedent; accounts spec Data Model → Legacy rows and Validation (`name` ≤ 80, email ≤ 320); `user.entity.ts` (`name` nullable). Proposal: the 320-character email maximum is not shown (not realistic) | — |
| L-24 | No row actions, search, filters or sort | Sourced | task; `list-with-filters.mdx` (no filters without a spec); `DataTable` `rowActions` unused | — |
| L-25 | No state-map MDX page for these stories (other product folders have `screens.mdx`) | **Proposal** | task (deliver stories; do not edit docs before review) | Reviewer decides whether to add one |
| L-26 | Spaced, pale digits in screenshots | Sourced (accepted limitation) | `what-is-missing.mdx` → Accepted limitations (system font; digits fall back on some Linux hosts) | Rendering only in this environment |
| L-27 | Retry stories swap the MSW handler inside `play` with `getWorker().use()` | Proposal (tooling) | `msw-storybook-addon` resets handlers on every story load (`applyRequestHandlers`) | Handlers cannot leak between stories |

## Follow-up — reviewer decisions applied (2026-11-01)

Decisions: (1) Created follows the platform spec; (2) the admin layout is accepted as is; (3) fix the scroll
region in the component; (4) fix focus loss, the range announcement, stacked alignment and kept rows; (5) the
empty state and the unspecified client 401/403 display are accepted.

Production changes (`@mentio/ui`, approved by (3) and (4)):
- `src/components/ui/table.tsx` — while the container overflows (ResizeObserver), it gets `tabindex="0"` and,
  when the table has `aria-label`/`aria-labelledby`, `role="region"` with that name.
- `src/backend/tables/DataTable.tsx` — `label` prop (names the table); a failed refresh keeps rows with the
  error above; Previous/Next use `aria-disabled` instead of `disabled` and ignore clicks while unavailable; the
  range is `role="status"`.
- `src/styles/globals.css` — focus ring on the table container; stacked cells `text-align: start !important`
  (utilities outrank the components layer); dimmed look and no hover tint for `aria-disabled` paging buttons.
- Tests: `DataTable.test.tsx` (regressions for L-15, L-20; label), `components/ui/data-display.test.tsx`
  (region on overflow, `aria-labelledby`, unnamed, no ResizeObserver).
- Stories: `primitives/data-table.stories.tsx` (Paginated asserts `aria-disabled` and the status; Failed is the
  first-load failure; new Refresh Failed), `primitives/table.stories.tsx` (new Scroll Region Without Links),
  admin stories (date format, `label`, focus kept on Next through the last page, rows kept on failure, region
  check in Long data, stacked alignment in Narrow results).
- Docs: `primitives/data-table.mdx` (§6, §7, §9, §10, §11, §12), `primitives/table.mdx` (§4, §6, §7, §8),
  `design-system/content.mdx` (Formats: date without a time), `docs/design-system.md` (If… use…, dates).

Evidence after the fixes:

| Check | Result |
|---|---|
| lint, typecheck, check:tokens, check:agent-doc, build, build-storybook, audit | pass |
| `npm run test:coverage` | 304 tests, 100% statements/branches/functions/lines |
| `npm run test:storybook` | 990/990 (adds 2 stories × 2 themes) |
| `npm run test:integration` | 10/10 on a throwaway PostgreSQL 17 (port 5435), stopped afterwards |
| Sweep, 84 admin story checks (`2026-11-01-admin-users-browser-report.json`) | 0 axe violations, 0 page overflow, all play phases finished |
| Long data | 1440 px: container overflows 427 px, `tabindex="0"`, `role="region"` “Users”, axe clean; 320/768: stacked, no overflow, not focusable |
| Stacked alignment | Created `start` at 320/768, `right` at 1440 |
| Keyboard (6 runs) | Tab: … → Previous (aria-disabled) → Next; after Enter focus stays on Next; at 41–45 focus is still on Next (`aria-disabled="true"`) |
| Docs axe, Table/DataTable/Content + unchanged Button control, 3 widths × 2 themes (`…-docs-axe-report.json`) | Only `landmark-one-main` and `region`, identical on the unchanged Button page (a bare docs iframe has no `main`); with those two page-level rules off, 0 violations; 0 overflow |
| Negative control (`…-negative-control.json`) | Records the original failure (long data without wrapping, before the component fix) |

Consequence to know: with one very long value, the wide table scrolls (as the Table docs intend), so later
columns such as Created can sit outside the visible area until the region is scrolled (screenshot
`long-data-1440-light.png`).

## Outcome

Done: stories, component fixes, docs, What is missing rows, committed locally. Originally: done for the build and verification. The design-system documentation was deliberately left unchanged so that
the reviewer sees the gaps first (task, POSTEP.md → acceptance of the test).

## Needs from you (original questions; answered 2026-11-01 — see Follow-up)

1. **L-04** Created format: keep the ISO date, adopt F7 `formatDay` (day, month, year, Warsaw time), or the table's “4 Nov, 18:00”?
2. **L-10** The admin layout hides navigation below 768 px and has no skip link or current-page marker, which `panel-shell.mdx` calls Bad. Accept until the PanelShell migration, or fix in the layout?
3. **L-14** Approve wrapping long values in a DataTable without focusable cells, or prefer a component fix (a focusable, labelled scroll container)?
4. **L-20 / L-21 / L-15** Existing DataTable behaviours: focus loss on paging, right-aligned stacked cells, rows dropped on a failed refresh. Fix them, or add them to What is missing?
5. **L-17 / L-18** The empty state is unreachable after the guard ships; the client display of a `401`/`403` after the page loads is unspecified.
6. Then decide which ledger gaps go to **What is missing**, and whether to commit (nothing is committed).

## Needs from you (after the follow-up)

- Merge `ui/admin-users-stories` into `main` (and push) when you want; nothing is pushed.
- The gaps now listed on What is missing (L-11–L-13, L-16, L-18) still need decisions.
