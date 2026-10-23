# Mentio — CI pipeline, 100% unit coverage, browser integration tests

Status: confirmed 2026-10-23 (exclusions: generated + type-only; integration test per new route/page)

## Goal

Every pull request is checked automatically by GitHub Actions: the app builds, lints,
typechecks, passes unit tests with **100% coverage**, passes the dependency audit, and
passes integration tests that boot the production build against an ephemeral
PostgreSQL (testcontainers) and drive it in a real browser with `agent-browser`.
AGENTS.md makes 100% unit coverage a rule for all new code, and the existing code is
brought to 100%.

## Decisions

### Unit tests — Vitest + V8 coverage (existing runner, now gated)

- Keep Vitest (already in use, 66 tests). Add `@vitest/coverage-v8`.
- Split into two Vitest **projects** in `vitest.config.mts`:
  - `unit` — `packages/*/src/**/*.test.{ts,tsx}`, `scripts/**/*.test.mjs` (as today).
  - `integration` — `tests/integration/**/*.test.ts`, with its own `globalSetup`,
    long timeouts, run serially.
- Scripts: `npm test` = unit only (fast, no Docker); `npm run test:coverage` = unit with
  coverage thresholds; `npm run test:integration` = integration project.
- Coverage thresholds: **100% lines, branches, functions, statements**, measured over
  `packages/*/src/**` and `scripts/**` (`coverage.include`), so a file with no test at
  all still counts as 0% (not silently skipped).
- Excluded from coverage — an explicit list in `vitest.config.mts`, each with a
  comment saying why. Nothing else may be excluded without a stated reason in the PR:
  - `packages/ui/src/components/ui/**` — shadcn primitives, CLI-generated vendor code
    (rendered by the integration tests through real pages).
  - `packages/db/src/migrations/**` — generated; exercised by `db:migrate` in the
    integration suite.
  - Type-only files and pure re-export barrels, listed by name (not `**/index.ts` —
    `db/src/entities/index.ts` has runtime code): `db/src/index.ts`,
    `core/src/{container,http}/index.ts`, `ui/src/backend/*/index.ts`,
    `ui/src/lib/utils.ts`, `container/cradle.ts`, `backend/api/types.ts`.
  - Config entry points read by tools, not by app code: `packages/app/next.config.ts`,
    `packages/db/src/mikro-orm.config.ts`.
  - Test files themselves and `tests/integration/**`.
- `/* v8 ignore */` comments are allowed only for genuinely unreachable branches, with
  a same-line reason (`/* v8 ignore next -- reason */`). Review rejects others.

### Integration tests — testcontainers + production build + agent-browser

- Location: `tests/integration/` at the repo root (not a workspace package; it drives
  the app from outside like a user would, so the `app → core → db` boundary rules do
  not apply — but it imports only `@mentio/core/http` (to sign a session) and
  `@mentio/db` (to seed), never app internals).
- `globalSetup` (`tests/integration/setup/global-setup.ts`):
  1. Start `postgres:17-alpine` via `@testcontainers/postgresql` (Postgres 17 matches
     what we verified against). If `TEST_DATABASE_URL` is set, use that database
     instead and skip the container — for machines without Docker (including the agent
     sandbox). CI always uses the container.
  2. Run migrations with the real CLI (`npm run db:migrate`) and an explicit
     `DATABASE_URL` (never inherit the shell's — see lessons).
  3. Start `next start` on a free port with `NODE_ENV=production`, `DATABASE_URL`,
     a random 32-byte `JWT_SECRET`; it requires a prior `npm run build` (CI builds in
     the same job). Wait for `/api/health` → `up`.
  4. Expose base URL, DB URL and secret to tests via Vitest `provide`/`inject`;
     teardown stops the server's process group, the browser sessions and the container.
- Browser: `agent-browser` (Vercel Labs CLI, devDependency) driven through a small typed
  wrapper `tests/integration/support/browser.ts` (`execFile` with `--json` and a
  per-test `--session`, parses `{ success, data }`, throws on failure). Assertions are
  plain Vitest `expect`. Chrome is installed with `npx agent-browser install --with-deps`
  in CI.
- HTTP-level checks (status codes, envelope) use Node `fetch` against the running server.
- Initial suites (covering what exists today):
  - `marketing.test.ts` — `/` renders.
  - `health.test.ts` — `/api/health` reports `up` with the DB.
  - `users-api.test.ts` — `/api/users` 401 without/with a bad cookie, 400 for
    `limit=500`, 200 with a signed session and a seeded user; POST → 405 (the route
    exposes no unsafe method yet, so the CSRF check stays covered by unit tests).
  - `admin.test.ts` (browser) — `/admin` shows the user count; `/admin/users` with a
    session cookie renders the seeded user in the table (this also closes the
    "not verified in a real browser" gap from the engineering-standards run).
- Data isolation: each suite seeds what it needs with unique values; no shared
  fixtures across files. Container is per run (ephemeral).

### CI — `.github/workflows/ci.yml`

- Triggers: `pull_request` (all branches) and `push` to `main`. `concurrency` cancels
  superseded runs per ref. `permissions: contents: read`.
- Node from `.nvmrc` (24, matching local); `actions/setup-node` with npm cache;
  `npm ci`.
- Separate jobs so each shows as its own PR check: **lint**, **typecheck**,
  **unit** (`npm run test:coverage`, uploads the coverage report as an artifact),
  **build**, **audit**, **integration** (builds, installs Chrome, runs
  `npm run test:integration`; uploads agent-browser screenshots on failure).
- GitHub-hosted `ubuntu-latest` runners have Docker, which testcontainers needs.
- Making these checks *required* is a branch-protection setting on GitHub (not in the
  repo) — listed under "Needs from you".

### AGENTS.md rules

- New section "Testing": every new or changed source file must reach 100% unit
  coverage (lines, branches, functions, statements); CI enforces it via thresholds;
  exclusions only through the commented list in `vitest.config.mts`.
- Every new page or API route also gets at least one integration test (route: status +
  envelope; page: browser render of its main content).
- Validation gate gains `npm run test:coverage` and `npm run test:integration` (the
  latter needs Docker or `TEST_DATABASE_URL`).

### Bringing existing code to 100%

Write unit tests for all currently uncovered files (pages, route handlers, `UserService`,
container, env/logger branches, `db` config/orm/health, `ui` feedback components,
`request.ts`, `errors.ts`, remaining branches in tested files). DB-touching code is
unit-tested with mocked collaborators (`em`, ORM), not a real DB — the real DB is the
integration suite's job. Server-component pages are tested by awaiting the page
function with mocked `@mentio/core/*` imports and rendering the result.

## Out of scope

- E2E tests of features that don't exist yet (auth flows, bookings).
- Deploy/preview pipelines, release automation, coverage badges/third-party services.
- Visual regression baselines.

## Done means

- [ ] `.github/workflows/ci.yml` runs lint, typecheck, unit (coverage), build, audit,
      integration as separate jobs on every PR, and all pass on the PR that adds it.
- [ ] `npm run test:coverage` enforces 100% on all four metrics; exclusions are the
      commented list above only.
- [ ] Existing code is at 100%; `npm test` and `npm run test:coverage` pass.
- [ ] `npm run test:integration` boots Postgres via testcontainers (CI) or
      `TEST_DATABASE_URL` (local), migrates, starts the production build, and the
      suites above pass, including the `agent-browser` checks of `/admin` and
      `/admin/users`.
- [ ] AGENTS.md states the 100% unit-coverage rule and the integration-test rule;
      README commands table and `.env.example` (`TEST_DATABASE_URL`) updated.
- [ ] Lint, typecheck, build, audit still pass; lessons and run log written.
