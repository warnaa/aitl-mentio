# DevMentor

A platform connecting developers with experienced mentors. Built as an
npm-workspaces monorepo on Next.js 16 + React 19 + TypeScript, with PostgreSQL via
MikroORM v7, awilix for dependency injection, Tailwind CSS for public pages, and
shadcn-ui for the admin surface.

> Working in this repo as a human or an AI agent? Read **[AGENTS.md](./AGENTS.md)**
> first — it documents the stack, conventions, and gotchas in depth.

## Getting started

Requires **Node ≥ 24**. Docker is optional — see
[Bring your own PostgreSQL](#bring-your-own-postgresql).

```bash
npm install
npm run setup
npm run dev
```

`npm run setup` does everything the manual steps below do: installs workspace
dependencies, creates `.env` from `.env.example`, makes sure a PostgreSQL is running,
applies migrations, and seeds a sample mentor.

It is **idempotent** — run it as often as you like. Every step checks whether it is
already done and reports itself as `ran` or `skipped`, so a second run only does the
work that is actually outstanding:

```text
✔ Preflight (ran) — Node v24.10.0
↷ Install dependencies (skipped) — node_modules is up to date with package-lock.json
↷ Configure .env (skipped) — .env already exists and sets every documented variable
✔ Start PostgreSQL (ran) — docker compose up -d postgres
✔ Wait for PostgreSQL (ran) — container reports healthy
✔ Apply migrations (ran) — npm run db:migrate
✔ Seed sample data (ran) — npm run db:seed
```

Your existing `.env` is never overwritten. If it is missing a variable that
`.env.example` documents, setup leaves the file alone and warns you which key to add.
Setting `DATABASE_URL` counts as setting the discrete `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER`, and `DB_PASSWORD` variables it replaces, so the URL style is never reported
as incomplete.
Setup deliberately stops short of starting the app — `npm run dev` never exits — and
prints it as the next command instead.

### Bring your own PostgreSQL

**Docker is only a fallback.** Setup first checks whether anything is already
listening at the address the app is configured to use, and reuses it if so — a
container you started yourself, a native PostgreSQL install, or a managed remote
database. Docker Compose is consulted only when nothing answers, and only then does
its absence become an error.

To point setup at an existing database, set `DATABASE_URL` (or the discrete `DB_*`
variables) in your environment or in `.env`:

```bash
DATABASE_URL=postgres://user:password@db.example.com:5432/devmentor npm run setup
```

```text
↷ Provision PostgreSQL (skipped) — something is accepting connections on
  db.example.com:5432 (per DATABASE_URL from the environment) — reusing it as the
  DevMentor database; Docker not needed
```

The check is a TCP probe, so it can tell that *something* is listening but not that it
speaks PostgreSQL. If the listener turns out not to be your DevMentor database, the
`Apply migrations` step below it reports the real connection error.

Resolution order matches the Zod config modules: `DATABASE_URL` wins over
`DB_HOST`/`DB_PORT`, and the real environment wins over `.env`. With no database
reachable *and* no Docker, setup stops and names both remedies rather than failing
with a stack trace.

### Manual setup (alternative)

The individual steps, if you would rather run them yourself or need to deviate:

```bash
# 1. Install (links all workspaces)
npm install

# 2. Configure — copy the example and adjust if needed
cp .env.example .env

# 3. Start Postgres (defaults match .env)
npm run db:up

# 4. Create the schema and seed a sample mentor
npm run db:migrate
npm run db:seed

# 5. Run the app
npm run dev
```

Note that step 4 races the container's startup on a cold `db:up`; wait for
`docker compose ps` to report `healthy` before migrating. `npm run setup` handles that
wait for you.

Then open:

- <http://localhost:3000> — public landing page (Tailwind).
- <http://localhost:3000/admin> — admin dashboard (shadcn-ui).
- <http://localhost:3000/admin/users> — users list, read through the DI container.
- <http://localhost:3000/api/health> — app + database health JSON.

The app **builds and boots even with no database running**; DB-backed pages degrade
to a visible "unavailable" state instead of crashing.

### Configuration

All configuration is read from the environment (or `.env`) and validated once by the
zod schema in `packages/core/src/config/env.ts`. `.env.example` documents every
variable; the database and logging ones are listed there as live defaults, the
account, sign-in and mail ones as commented-out lines you uncomment when needed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_URL` | `http://localhost:3000` | Public origin, for OAuth callback and email links |
| `SESSION_SECRET` | unset | HS256 key for session cookies and signed links, at least 32 characters (`openssl rand -base64 32`). **Required when `NODE_ENV=production`** |
| `SESSION_SECRET_PREVIOUS` | unset | The previous key during a rotation; verified, never used to sign |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | unset | GitHub OAuth app credentials |
| `OPERATOR_EMAILS` | empty | Comma-separated operator allowlist, matched case-insensitively |
| `TRUSTED_PROXY_HOPS` | `0` | Trusted reverse proxies when deriving the client IP from `X-Forwarded-For` |
| `PASSWORD_HASH_CONCURRENCY` | `2` | Password hashes run at once; each scrypt hash holds about 128 MiB |
| `PASSWORD_HASH_WAIT_MS` | `5000` | How long a sign-in or registration waits for a hashing slot before a retryable 503 |
| `MAIL_API_KEY` / `MAIL_FROM` | unset | Resend API key and sender address for transactional mail |
| `AUTH_IDENTITY_ADAPTER` | `github` | `mock` is for the integration harness only |
| `MAILER_ADAPTER` | unset | `resend` or `log`. Unset means `log` in development and `resend` elsewhere; an explicit `log` is for the integration harness only |
| `INTEGRATION_TEST_RUN` | `0` | Set to `1` by the integration harness; required alongside a `mock` or `log` adapter |

Production requires `SESSION_SECRET`, `MAIL_API_KEY` and `MAIL_FROM` at boot, and checks
them when the app handles its first request, not during `npm run build`, so a build needs
no secrets. In `npm run dev` with no `MAILER_ADAPTER`, mail is not sent: each message is
written to the server log as a `mail.sent` line (with the verification link), and a
warning at startup says so. A missing
`GITHUB_*` or `MAIL_*` value never stops the app from starting: only the feature that
needs it reports itself unavailable. Selecting a fake adapter (`mock`, `log`) without
`INTEGRATION_TEST_RUN=1` is refused at startup, so a misconfigured deployment can
never quietly accept "sign in as anyone".

#### Creating a GitHub OAuth app

1. On GitHub open **Settings → Developer settings → OAuth Apps → New OAuth App**
   (or the same page under an organisation's settings).
2. Set **Homepage URL** to your `APP_URL` and **Authorization callback URL** to
   `<APP_URL>/api/auth/github/callback`, e.g.
   `http://localhost:3000/api/auth/github/callback` locally. GitHub allows one
   callback URL per app, so use a separate app for each environment.
3. Register it, then **Generate a new client secret**. Put the Client ID in
   `GITHUB_CLIENT_ID` and the secret in `GITHUB_CLIENT_SECRET`, and set
   `SESSION_SECRET` if you have not already.
4. Restart the app. DevMentor requests the `read:user user:email` scopes and signs in
   only accounts whose primary GitHub email is verified. Add your email to
   `OPERATOR_EMAILS` to open `/admin`.

Without these values the "Sign in with GitHub" link sends you back to `/sign-in` with
a "not available" message; nothing else stops working.

#### Signing in locally

Two ways to sign in, GitHub first (`/sign-in`) and email registration (`/register`):

- **Email and password.** Register at `/register`. In `npm run dev` with no
  `MAILER_ADAPTER`, the verification link is not mailed but written to the server log
  as a `mail.sent` line; open it to confirm the address and land on the mentee home.
  `npm run db:seed` gives the seeded mentee (`mock-mentee@devmentor.test`) and the
  mentor/operator (`mock-operator@devmentor.test`) the demo password
  `devmentor-demo-password`; Ada Lovelace (`mock-mentor@devmentor.test`) is GitHub-only.
  Sign-in attempts are limited per address (5 per 15 minutes) and, behind a trusted proxy
  (`TRUSTED_PROXY_HOPS`), per IP; over the limit the form says to wait.
- **GitHub without an OAuth app.** With `AUTH_IDENTITY_ADAPTER=mock` and
  `INTEGRATION_TEST_RUN=1`, open `/api/auth/github?login=mock-operator` (or
  `mock-mentee`, `mock-mentor`, any other login for a new mentee). Never set these in a
  deployed environment.

## Scripts

| Command | Description |
| --- | --- |
| `npm run setup` | One-command install, configure, database up, migrate, and seed (idempotent; reuses an existing PostgreSQL, Docker only as fallback) |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` across all packages |
| `npm run lint` | ESLint, including dependency-direction rules |
| `npm run test:unit` | Run TypeScript unit tests with Vitest |
| `npm run test:unit:coverage` | Run unit tests with per-file 100% coverage gates |
| `npm run test:browser:install` | Install agent-browser's Chrome runtime locally |
| `npm run test:integration` | Test an ephemeral PostgreSQL + production app with agent-browser |
| `npm run db:up` / `npm run db:down` | Start / stop local Postgres (Docker) |
| `npm run db:migration:create -- --name <x>` | Generate a migration from entity diff |
| `npm run db:migrate` / `npm run db:migrate:down` | Apply / revert migrations |
| `npm run db:seed` | Run the default seeder |

## Testing and pull-request checks

Every pull request runs four independent GitHub checks: **Build**, **Lint**, **Unit
tests**, and **Integration tests**. Configure those exact names as required checks in
the GitHub branch ruleset if merges must be blocked until they pass.

**Lint** first runs `node scripts/check-agent-routes.mjs` to validate agent
instruction routes and line budgets (root ≤ 150 lines, units ≤ 120), then installs
dependencies and runs ESLint. The agent check also runs locally without installing
dependencies.

The unit suite uses Vitest and V8 coverage:

```bash
npm run test:unit
npm run test:unit:coverage
```

Coverage is enforced at 100% for statements, branches, functions, and lines on every
file listed in `vitest.config.mts`. New features must add their production files to
that explicit list and add adjacent unit tests in the same change.

The integration suite requires Docker and agent-browser's Chrome runtime. Install the
browser once, then run the suite:

```bash
npm run test:browser:install
npm run test:integration
```

The suite creates a fresh PostgreSQL 17 Testcontainer on a random port, applies
migrations, seeds prerequisites, builds and starts Next.js on another random port,
waits for database readiness, then tests the home page and admin panel through the
pinned `agent-browser` CLI. Screenshots and app logs go to `test-results/integration/`;
the browser, app process, and container are stopped in teardown. POSIX and native
PowerShell launchers are also available at `tests/integration/run.sh` and
`tests/integration/run.ps1`.

## Architecture

### Monorepo packages

The repo is an npm-workspaces monorepo under `packages/*` with a strictly one-way
dependency graph (enforced by ESLint — a cycle fails `npm run lint`):

```
app ──> core ──> db
 └────> ui
```

| Package | Name | Responsibility |
| --- | --- | --- |
| `packages/app` | `@devmentor/app` | Next.js host and **composition root** — the only package allowed to import all others. Contains routes, layouts, and API handlers. |
| `packages/core` | `@devmentor/core` | Config (zod), logging (pino), the **awilix DI container**, and domain services. Depends on `db`; never touches React/Next/UI. |
| `packages/db` | `@devmentor/db` | MikroORM configuration, entities, migrations, seeders. The **leaf** — the only package that imports `@mikro-orm/*`. |
| `packages/ui` | `@devmentor/ui` | shadcn-ui components and Tailwind design tokens. Presentational only. |

Packages are consumed as **TypeScript source** (no per-package build) and transpiled
by Next.js via `transpilePackages`.

### Dependency injection

`@devmentor/core` builds a single awilix container (`PROXY` injection mode, a typed
`Cradle` interface). Lifetimes:

- **Singleton** — `env`, `logger`, `orm` (cached on `globalThis` to survive HMR).
- **Scoped** — a forked `EntityManager` and the domain services that use it.

Request handlers call `withScope(fn)`, which opens a scope with its own forked
`EntityManager`, runs the callback, and disposes the scope. Work done for a request
uses `withRequestScope(req, fn)`, which also registers the caller's lazily-resolved
`session`. `GET /api/users` is a worked example: `withRequestScope(req, (c) =>
c.userService.list())` → operator check → forked EM → repository → entity with a
populated 1:1 relation.

### Database

- MikroORM v7 with the PostgreSQL driver, explicit connection pooling, and migrations
  under `packages/db/migrations`.
- Entities are defined with `defineEntity` (MikroORM v7 dropped decorators) and
  registered as `globalThis` singletons so the same schema object is shared across
  Next's RSC/SSR/route module graphs.
- The domain model ships a placeholder `User` 1:1 `MentorProfile` to exercise
  relations, repositories, and migrations end to end.

### Frontend / backend split

- **Public / marketing pages** (`/`) use plain Tailwind CSS v4 utilities.
- **Admin pages** (`/admin/*`) use shadcn-ui components from `@devmentor/ui`. The
  design tokens live in `packages/ui/src/tokens.css`; add components with
  `npx shadcn@latest add <component>` run inside `packages/ui`.

### Spec-driven development

Nontrivial work is specified before it's built. Specs, autonomous-run logs, and
lessons live under `.ai/` — see [AGENTS.md](./AGENTS.md) for the full workflow.

### Invite a mentor locally

An operator with repository/database access runs the invitation command by hand (R18).
It never sends mail: deliver the returned link to the invited address through the
agreed channel. Keep the bearer link private; copy only the separate token-free
JSON audit line into the shared operator note. `--operator` identifies the human
performing the action; it does not grant an application role.

```powershell
npm run invite -- create --operator "Founder A" --email engineer@example.com --tags typescript,react --batch first-20
npm run invite -- resend --operator "Founder A" --id <invitation-uuid>
npm run invite -- revoke --operator "Founder A" --id <invitation-uuid>
```

Allowed tag keys: `typescript`, `react`, `python`, `ai-agents`. Resend rotates the
secret and expiry; the previous link stops working. Revoke/resend only apply to
pending invitations. An expired unresolved invitation must be resent or revoked
before creating another for that address. Accepted invitations never remove roles.

`INVITATION_TTL_DAYS` and `MENTOR_PUBLISH_WINDOW_DAYS` default to 14 whole days
(valid range 1–365). Expiry is stored when created or
resent; the publication deadline is stored at acceptance and the first deadline
is retained on the mentor profile. Later configuration changes never move them.
The root `.env` is loaded without overriding real environment values.

### Mentor prices

Founder/operator approval2026-11-05 sets PLN with two decimal minor units. `PLATFORM_CURRENCY=PLN`; `PLATFORM_PRICE_BOUNDS={"p25":{"minCents":8000,"maxCents":60000},"p50":{"minCents":16000,"maxCents":120000}}`. These approved defaults mean25min80–600PLN and50min160–1200PLN. Bounds are inclusive positive integer minor units; malformed/missing injected policy fails closed in the settings service. Changing currency after stored prices requires a migration; zero/three-decimal or other currencies are unsupported. Both prices save atomically. Booking, fees and payouts are separate capabilities.
