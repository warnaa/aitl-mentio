# Run: idempotent `npm run setup` installer

Date: 2026-10-25
Issue: #5 (no spec: single script with an obvious change surface; the issue's Done-when is the acceptance list)
Branch: `feat/setup-installer` → PR #6

## Ask

One command, `npm run setup`, that does the README "Getting started" steps and skips
whatever is already done on a re-run; README keeps the manual steps as an alternative.

## Checklist

- [x] issue #5 filed with implementation notes (`om-prepare-issue`)
- [x] `scripts/setup.mjs` + `scripts/setup.test.mjs`, `setup` script in `package.json`, README
- [x] validation gate (lint, typecheck, test:coverage, build, audit)
- [x] PR #6 opened and labeled; issue lock released (`om-open-pr`)
- [x] self-review (`om-code-review`): 1 major, 4 minor, 3 nits
- [x] all review findings fixed, gate re-run, re-reviewed
- [ ] CI green on PR #6
- [ ] merge

## Log

- Steps: Node ≥ 22.17 check → `npm install` unless `node_modules/.package-lock.json` is at
  least as new as `package-lock.json` → copy `.env.example` if `.env` is missing and fill
  `JWT_SECRET` only when empty → `migration:pending`, then `db:migrate` only if needed.
  I/O is injected (`createIo`), following `scripts/audit.mjs`.
- Review findings and fixes:
  - **major**: an exported `DATABASE_URL` silently wins over `.env` (`process.loadEnvFile`
    never overrides, even an empty export), so setup could migrate another project's
    database. The DB step now names the target (`host:port/db`, no credentials) and its
    source in every outcome; the hint says how to fall back to `.env`.
  - `migration:pending` stderr was swallowed (invalid URL showed no cause); it now streams.
  - `migration:pending` does **not** verify connectivity (unreachable host → exit 0, all
    migrations pending); the comment and tests now model the real path (`db:migrate` fails).
  - npm is spawned via `process.execPath` + `npm_execpath` (Windows `npm.cmd` cannot be
    `execFileSync`'d without a shell); npm failures read as `` `npm install` failed (exit 1) ``.
  - `JWT_SECRET=""` now counts as empty; replacement is `$`-safe; the secret is generated lazily.
- Verified end to end in a throwaway repo skeleton via `npm run setup` (fresh, re-run with
  an exported `DATABASE_URL`, failing pending check). Not run against a real PostgreSQL:
  this sandbox's shell exports a `DATABASE_URL` for an unrelated local database.

## Outcome

Done pending CI and merge.

## Needs from you

- Review and merge PR #6.
- Optional: remove the stale `braces` entry from `scripts/audit-allowlist.json` (unrelated;
  `npm run audit` warns about it).
