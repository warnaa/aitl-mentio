# Mentio

Mentio is a Next.js application organised as an npm-workspaces monorepo.

## Stack

| Concern              | Choice                                                        |
| -------------------- | ------------------------------------------------------------- |
| Framework            | [Next.js](https://nextjs.org) 16 (App Router, Turbopack)      |
| UI runtime           | React 19                                                      |
| Language             | TypeScript (strict)                                           |
| Database             | PostgreSQL                                                    |
| ORM / migrations     | [MikroORM](https://mikro-orm.io) 7 (`@mikro-orm/postgresql`)  |
| Dependency injection | [Awilix](https://github.com/jeffijoe/awilix)                  |
| Styling              | [Tailwind CSS](https://tailwindcss.com) v4                    |
| Admin UI components  | [shadcn/ui](https://ui.shadcn.com) (Radix + Tailwind)         |
| Package management   | npm workspaces                                                |

## Getting started

Requirements: Node.js ≥ 22.17 (MikroORM 7) and a PostgreSQL server.

```bash
npm install
cp .env.example .env          # then set DATABASE_URL (and JWT_SECRET)
npm run db:migrate            # create the schema
npm run dev                   # http://localhost:3000
```

- `/` — public marketing pages (Tailwind)
- `/admin` — admin panel (shadcn/ui); `/admin/users` lists users via `/api/users`, which
  requires a session (sign-in arrives with the auth concept — until then it shows
  "Sign in to view users")
- `/api/health` — liveness and database reachability

## Scripts (run from the repo root)

| Script                         | What it does                                          |
| ------------------------------ | ----------------------------------------------------- |
| `npm run dev`                  | Next.js dev server                                    |
| `npm run build` / `start`      | Production build / server                             |
| `npm run lint`                 | ESLint across all packages (incl. layer boundaries)   |
| `npm run typecheck`            | `tsc` for every package                               |
| `npm test` / `test:watch`      | Vitest unit tests (`*.test.ts(x)` next to the code)   |
| `npm run audit`                | `npm audit` of production deps (fails on critical)    |
| `npm run db:migration:create`  | Generate a migration from entity changes              |
| `npm run db:migrate`           | Apply pending migrations                              |
| `npm run db:migrate:down`      | Revert the last migration                             |

The **validation gate** before any change is done: `lint`, `typecheck`, `test`,
`build`, `audit`.

## Environment

Env files live at the **repo root** and are loaded by both the Next.js app and the
MikroORM CLI. Real environment variables take precedence over `.env`; an empty value
(`KEY=`) counts as unset. See [`.env.example`](.env.example):

| Variable                  | Default | Purpose                                              |
| ------------------------- | ------- | ---------------------------------------------------- |
| `DATABASE_URL`            | —       | PostgreSQL connection string                         |
| `DB_POOL_MIN`             | `0`     | Minimum pooled connections (per process)             |
| `DB_POOL_MAX`             | `10`    | Maximum pooled connections (per process)             |
| `DB_POOL_IDLE_TIMEOUT_MS` | `30000` | Close idle connections after this                    |
| `DB_DEBUG`                | `false` | Log SQL queries                                      |
| `JWT_SECRET`              | —       | HS256 session key, ≥ 32 bytes (`openssl rand -base64 32`); session-protected routes fail closed without it |
| `LOG_LEVEL`               | `info`  | pino log level                                       |

## Architecture

```
.
├── package.json            # workspace root; scripts forward to packages
├── tsconfig.base.json      # shared compiler options
├── eslint.config.mjs       # one ESLint config, incl. package boundary rules
├── vitest.config.mts       # one test runner for all packages
├── .env.example
└── packages/
    ├── app/   @mentio/app   # Next.js: pages + API routes (HTTP wiring only)
    ├── core/  @mentio/core  # business layer: services, DI, validators, http layer
    ├── db/    @mentio/db    # persistence: MikroORM config, entities, migrations
    └── ui/    @mentio/ui    # presentation: shadcn/ui + reusable panel building blocks
```

### Package dependency graph

```
@mentio/app ──┬──► @mentio/core ──► @mentio/db ──► MikroORM ──► PostgreSQL
              └──► @mentio/ui
```

Layers never import upward, and the boundaries are enforced by ESLint
(`no-restricted-imports`): `app` reaches data only through `core`, `core` never imports
`next`/`react` or MikroORM directly, `db` imports no workspace package and is the only
package that imports MikroORM, and `ui` is standalone. Internal packages ship
TypeScript source (their `exports` point at `src/`) and are transpiled by Next.js, so
there is no per-package build step.

### Domain concepts

Domain code is organized by **concept** (`auth`, `mentors`, `bookings`, …): the same
folder name repeats in each layer that needs it, created only when its first file is
added. The `auth` concept's `User` is the reference implementation:

```
packages/db/src/entities/auth/user.entity.ts          # schema only
packages/core/src/services/auth/user.service.ts       # business rules, returns DTOs
packages/core/src/validators/auth/user-list.schema.ts # shared Zod schema (route + form)
packages/app/src/app/api/users/route.ts               # makeCrudRoute — config, no logic
packages/app/src/app/admin/users/                     # apiCall + DataTable
```

The full conventions (naming table, recipe for a new concept, security baseline,
review checklist) are in
[`.ai/specs/implemented/2026-10-23-engineering-standards.md`](.ai/specs/implemented/2026-10-23-engineering-standards.md).

### `@mentio/app` — pages and HTTP wiring

```
packages/app/src/app/
├── layout.tsx            # root layout, imports globals.css
├── globals.css           # imports @mentio/ui/styles.css (Tailwind + theme)
├── (marketing)/          # public pages — plain Tailwind
├── admin/                # backend panel at /admin — @mentio/ui components
│   └── users/            # reference list screen
└── api/
    ├── health/route.ts   # public liveness + database up/down
    └── users/route.ts    # reference CRUD route (session required)
```

### `@mentio/core` — business layer

Imported through subpaths so client code never pulls in the ORM:

| Import                                 | Contents                                                        |
| -------------------------------------- | --------------------------------------------------------------- |
| `@mentio/core/http`                    | `AppError` hierarchy, `apiHandler`, `makeCrudRoute`, `requireSession` / `requireRole` / `assertOwner`, request parsing |
| `@mentio/core/container`               | Awilix composition root, `Cradle`, `withScope`, `checkDatabase` |
| `@mentio/core/validators/<concept>/…`  | Shared Zod schemas (also used by `CrudForm` on the client)      |
| `@mentio/core/services/<concept>/…`    | Service classes and their DTO types                             |
| `@mentio/core/config`, `/logger`       | Zod-validated env; pino logger with secret redaction            |

### `@mentio/db` — persistence

- **Entities** use MikroORM's `defineEntity` (no decorators) with shared
  `baseProperties()` (UUID id, timestamps), one file per entity under
  `src/entities/<concept>/`, registered explicitly in `src/entities/index.ts`.
- **Configuration**: `createOrmConfig()` builds the runtime config from Zod-validated
  env (`src/env.ts`); `src/mikro-orm.config.ts` adds the `Migrator` extension for the CLI.
- **Connection pooling**: `getOrm()` lazily initialises one `MikroORM` instance per
  process and caches it on `globalThis`. Pool size is set by `DB_POOL_*`.
- **Migrations** live in `src/migrations/` with the schema snapshot. All schema changes
  go through generated, reviewed, committed migrations.

### `@mentio/ui` — presentation

- shadcn/ui primitives in `src/components/ui/` (`@mentio/ui/components/<name>`), added
  with `cd packages/ui && npx shadcn@latest add <component>`.
- Reusable panel building blocks in `src/backend/`: `api` (`apiCall`, the only
  sanctioned `fetch`), `forms` (`CrudForm`), `tables` (`DataTable`), `feedback`
  (`LoadingMessage`, `ErrorMessage`, `EmptyState`).
- `src/styles/globals.css` is the single Tailwind entry point plus shadcn theme tokens.

### Request flow

```
Browser ── apiCall("/api/users") ── (CSRF header, JSON envelope parsing)
   │
   ▼
api/users/route.ts ── makeCrudRoute → apiHandler
   │   requireSession (JWT cookie)  →  parse query (Zod)  →  withScope
   ▼
Awilix request scope ── em = orm.em.fork()          (fresh identity map)
   │
   ▼
userService.list() ──► em ──► MikroORM ──► pg pool ──► PostgreSQL
   │
   ▼
{ ok: true, data } | { ok: false, error: { code, message, fieldErrors? } }
```

Errors thrown anywhere below the route are `AppError`s mapped to a status code and
the error envelope; anything unexpected is logged server-side and returned as a
generic 500.

## Working on this repo

Coding agents and contributors follow [`AGENTS.md`](AGENTS.md): stack rules, package
boundaries, and the spec-driven workflow under [`.ai/`](.ai) (specs, run logs,
lessons).
