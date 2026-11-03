# Root `.env` reaches the app, and `npm run setup` runs on Windows

## Problem / Goal

Two defects found while building and running the app on Windows from a fresh clone.

1. **The Next.js app never reads the repository-root `.env`.** README, AGENTS.md and
   `npm run setup` put `.env` at the repo root, but Next loads env files only from its
   own project directory, `packages/app/`. `npm run dev` / `npm run start` therefore
   ignore every value in it. The database appeared to work only because the zod
   defaults match `docker-compose.yml`; `SESSION_SECRET` and the GitHub OAuth
   credentials were silently missing, so production sign-in failed ("SESSION_SECRET is
   required when NODE_ENV=production") and GitHub sign-in reported "unavailable". The
   MikroORM CLI is unaffected because `packages/db/src/mikro-orm.config.ts` loads
   `../../.env` itself. This affects every OS.
2. **`npm run setup` crashes on Windows right after preflight** with `spawn EINVAL`.
   `scripts/setup/effects.mjs` spawns `npm.cmd` without a shell, which Node refuses
   since CVE-2024-27980. The refusal is a *synchronous* throw, so the `'error'` handler
   meant to turn launch failures into data never runs and the process dies with a stack
   trace. The integration harness already solved the same problem
   (`tests/integration/npm.ts`, lesson 2026-11-02).

Goal: the app reads the root `.env` under `next dev`, `next build` and `next start`
on every OS, and `npm run setup` completes on Windows, with no behaviour change on
Linux/macOS beyond (1).

## Non-goals

- Supporting `.env` files inside `packages/app/` or Next's `.env.local` /
  `.env.<mode>` cascade. The root `.env` stays the one documented location.
- Changing the env schema, precedence between `DATABASE_URL` and `DB_*`, or the
  Docker image (the `Dockerfile` is a placeholder).
- Fixing how stopping an npm wrapper leaves `next start` orphaned on Windows (the
  integration harness already handles it with `taskkill /T`).

## Approach

### 1. Load the root `.env` from `next.config.ts`

- New `packages/app/src/lib/repo-env.ts` exporting `loadRepoEnv(path = <repo>/.env)`.
  It calls Node's built-in `process.loadEnvFile(path)` and treats `ENOENT` as "no
  file" (CI, Docker, fresh clones); any other error (e.g. unreadable file) is
  rethrown so a broken `.env` is not silently ignored.
- `next.config.ts` calls `loadRepoEnv()` at module load. Next evaluates the config in
  every `dev` / `build` / `start` process before serving, and `next dev` forks its
  render server with the already-populated `process.env`.
- Precedence: `process.loadEnvFile` never overwrites a variable that is already set
  (verified: an existing `A=real` and an existing empty `C=` both survive). So the
  real environment still wins over `.env`, matching `mikro-orm.config.ts` (dotenv's
  default) and the setup installer's documented "environment before `.env`".
- This is the same pattern as the db CLI's loader, not new direct `process.env`
  reading: values still reach code only through the zod schemas.

### 2. Keep integration runs hermetic

Now that the app reads the developer's `.env`, any key the harness leaves unset would
leak in (e.g. `MAILER_ADAPTER=resend` + a real `MAIL_API_KEY` would send real mail).
`integrationChildEnvironment` pins the remaining documented keys: blank-tolerant
optional keys (`SESSION_SECRET_PREVIOUS`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
`TRUSTED_PROXY_HOPS`, `PASSWORD_HASH_CONCURRENCY`, `PASSWORD_HASH_WAIT_MS`,
`MAIL_API_KEY`, `MAIL_FROM`) to `''`, and `APP_NAME`, `LOG_LEVEL`, `DB_DEBUG`,
`DB_POOL_IDLE_MS` to their defaults. `MAILER_ADAPTER` stays pinned to `log` (E01's
`waitForMail` reads it), and must appear only once in the object literal. An already-set empty value
blocks `loadEnvFile`, and `blankAsUnset` reads it as "not configured".

### 3. Spawn npm through a shell on Windows in `npm run setup`

- Replace `npmExecutable(platform)` in `scripts/setup/run.mjs` with
  `npmInvocation(platform, args)` → `{ command, args, shell }`, mirroring
  `tests/integration/npm.ts`: on `win32` one command string `npm.cmd <args>` with
  `shell: true` and no argument array (avoids DEP0190); elsewhere `npm` + `args`,
  `shell: false`. Every npm argument is a fixed literal, so the shell has nothing to
  interpret.
- `SetupEffects.run(command, args, options?)` forwards `options.shell` to `spawn`.
- `effects.run` also wraps `spawn` in `try/catch` so any *synchronous* launch refusal
  becomes `{ code: SPAWN_FAILED }` like an asynchronous one, and a step prints its
  own message instead of a stack trace.

## Acceptance criteria

- [x] With `SESSION_SECRET` and GitHub credentials only in the root `.env`,
      `npm run build && npm run start` serves `/api/auth/github` as a 302 to
      `github.com/login/oauth/authorize`; `npm run dev` does the same.
- [x] A variable set in the real environment beats the same key in `.env`.
- [x] With no `.env` (CI/Ubuntu), `npm run build` succeeds unchanged.
- [x] `npm run setup` on Windows completes (or reports each step as ran/skipped)
      instead of crashing with `spawn EINVAL`; on Linux it calls `npm` with an
      argument array and no shell, exactly as before.
- [x] A synchronous `spawn` throw is reported as `SPAWN_FAILED`, not thrown.
- [x] Integration child environment pins the keys listed in Approach 2.
- [x] Unit tests cover every new/changed branch; `repo-env.ts` and `next.config.ts` are in
      `coverage.include`; `npm run test:unit:coverage`, `typecheck`, `lint` and
      `build` pass.
