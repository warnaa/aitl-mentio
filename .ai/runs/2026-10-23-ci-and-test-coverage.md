# Run: CI pipeline, 100% unit coverage, browser integration tests

Date: 2026-10-23
Spec: `.ai/specs/implemented/2026-10-23-ci-and-test-coverage.md`
Branch: `feat/ci-and-test-coverage`

## Ask

GitHub CI for every PR: build, lint, unit tests, and integration tests on an ephemeral
testcontainers Postgres driven by agent-browser. AGENTS.md must require 100% unit
coverage for new features; bring existing code to 100%.

## Checklist

- [x] spec written and confirmed (exclusions: generated + type-only; one integration
      test per new route/page)
- [x] coverage tooling + thresholds (`vitest.config.mts` projects)
- [x] unit tests → 100% for existing code
- [x] integration harness (testcontainers / `TEST_DATABASE_URL`, `next start`, agent-browser)
- [x] integration suites (marketing, health, users API, admin pages)
- [x] `.github/workflows/ci.yml`
- [x] AGENTS.md, README, `.env.example`, lessons
- [x] validation gate locally
- [x] PR #3; CI green (all six jobs)

## Log

- Vitest split into `unit` / `integration` projects; `@vitest/coverage-v8` with 100%
  thresholds over `packages/*/src` + `scripts`; commented exclusion list (shadcn
  primitives, migrations, type-only files, named barrels, tool configs). Baseline 73.8%.
- Unit tests written by four parallel forks (core, db + scripts, ui, app), tests only,
  except `scripts/audit.mjs`, refactored into exported `main`/`runNpmAudit`/
  `readAllowlist` (same CLI behavior). Cross-checked: no `v8 ignore`/skip/only.
  Result: 137 tests, 33 files, 100% statements/branches/functions/lines.
- `tests/integration/`: global setup (testcontainers `postgres:17-alpine` or
  `TEST_DATABASE_URL` → `db:migrate` → `next start` on a free port with an explicit env
  and random `JWT_SECRET`, process-group teardown); agent-browser wrapper; seeding via
  `@mentio/db`; suites for `/`, `/api/health`, `/api/users`, `/admin`, `/admin/users`
  (10 tests). `/api/users` has no unsafe method yet, so CSRF stays unit-tested; the suite
  asserts POST → 405 instead.
- CI: `.github/workflows/ci.yml` with lint, typecheck, unit (coverage), build, audit,
  integration jobs; `.nvmrc` = 24.
- Docs: AGENTS.md "Testing" section (100% unit rule, integration test per route/page) and
  validation gate; README scripts/env; `.env.example` `TEST_DATABASE_URL`; lessons.

## Verification

- Local: lint, typecheck, `test:coverage` (100%), build, audit, `test:integration`
  (via `TEST_DATABASE_URL`, local Postgres 17) all pass; no leftover server processes.
- Not verifiable locally: the testcontainers path (no Docker) — verified in CI: the
  integration job started `postgres:17-alpine` via testcontainers and passed 10/10
  against the runner's Google Chrome 155.
- First CI run: integration hung in `agent-browser install --with-deps` (apt font
  download stalled on the Azure mirror); fixed by using the preinstalled Chrome
  (`AGENT_BROWSER_EXECUTABLE_PATH`) plus step timeouts. See lessons.

## Follow-up: skip CI on docs-only changes

- Added a `changes` job (plain `git diff`, no third-party action); all six jobs depend
  on it and are skipped when only `*.md`, `.ai/**` or `docs/**` changed. PRs diff the
  whole PR, pushes to `main` diff `before..after`; unknown base → run everything.
- Filter tested locally against real commits (docs-only → false; workflow change,
  whole PR, unknown base → true).
- Found: branch protection on `main` is not enforced (private repo, free plan).

## Outcome

Done.

## Needs from you

- Branch protection on `main` is not enforced: private repo on a free personal
  account (GitHub Pro or a public repo needed). Then require the six CI checks.
