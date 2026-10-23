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
cp .env.example .env          # then set DATABASE_URL
npm run db:migrate            # create the schema
npm run dev                   # http://localhost:3000
```

- `/` — public frontend (Tailwind)
- `/admin` — admin dashboard (shadcn/ui), reads from the database

## Scripts (run from the repo root)

| Script                         | What it does                                          |
| ------------------------------ | ----------------------------------------------------- |
| `npm run dev`                  | Next.js dev server                                    |
| `npm run build` / `start`      | Production build / server                             |
| `npm run lint`                 | ESLint across all packages                            |
| `npm run typecheck`            | `tsc` for every package                               |
| `npm run db:migration:create`  | Generate a migration from entity changes              |
| `npm run db:migrate`           | Apply pending migrations                              |
| `npm run db:migrate:down`      | Revert the last migration                             |

## Environment

Env files live at the **repo root** and are loaded by both the Next.js app and the
MikroORM CLI. Real environment variables take precedence over `.env`. See
[`.env.example`](.env.example):

| Variable                  | Default | Purpose                              |
| ------------------------- | ------- | ------------------------------------ |
| `DATABASE_URL`            | —       | PostgreSQL connection string         |
| `DB_POOL_MIN`             | `0`     | Minimum pooled connections (per process) |
| `DB_POOL_MAX`             | `10`    | Maximum pooled connections (per process) |
| `DB_POOL_IDLE_TIMEOUT_MS` | `30000` | Close idle connections after this     |
| `DB_DEBUG`                | `false` | Log SQL queries                       |

## Architecture

```
.
├── package.json            # workspace root; scripts forward to packages
├── tsconfig.base.json      # shared compiler options
├── eslint.config.mjs       # one ESLint config for the whole repo
├── .env.example
└── packages/
    ├── app/   @mentio/app   # Next.js application
    ├── core/  @mentio/core  # framework-agnostic reusable code
    ├── db/    @mentio/db    # MikroORM: config, entities, migrations
    └── ui/    @mentio/ui    # shadcn/ui components + shared Tailwind theme
```

### Package dependency graph

```
@mentio/app ──┬──► @mentio/ui
              ├──► @mentio/db ──► @mentio/core
              └──► @mentio/core
```

`app` may depend on everything; `db` depends only on `core`; `ui` and `core` depend on
no other workspace package. Internal packages ship TypeScript source (their `exports`
point at `src/`) and are transpiled by Next.js, so there is no per-package build step.

### `@mentio/app` — the application

```
packages/app/src/
├── app/
│   ├── layout.tsx          # root layout, imports globals.css
│   ├── globals.css         # imports @mentio/ui/styles.css (Tailwind + theme)
│   ├── (frontend)/         # public pages — plain Tailwind
│   └── admin/              # backend pages at /admin — shadcn/ui from @mentio/ui
└── server/
    ├── container.ts        # Awilix composition root
    └── services/           # application services (constructor-injected)
```

### `@mentio/core` — reusable building blocks

- `createAppContainer()` — Awilix container preconfigured with PROXY injection and
  strict mode; Awilix resolvers (`asClass`, `asFunction`, `asValue`, …) are re-exported.
- `readEnv()` / `readIntEnv()` — typed env access that throws `ConfigError`.
- Base error classes (`AppError`, `ConfigError`, `NotFoundError`).

### `@mentio/db` — data layer

- **Entities** are defined with MikroORM's `defineEntity` (no decorators) in
  `src/entities/` and listed explicitly in `src/entities/index.ts`.
- **Configuration**: `createOrmConfig()` builds the runtime config from env vars;
  `src/mikro-orm.config.ts` adds the `Migrator` extension for the CLI.
- **Connection pooling**: `getOrm()` lazily initialises one `MikroORM` instance per
  process and caches it on `globalThis`, so the pool survives Next.js dev reloads.
  Pool size is set by `DB_POOL_*`.
- **Migrations** live in `src/migrations/` together with the schema snapshot. All
  schema changes go through generated, reviewed, committed migrations.
- MikroORM is kept out of the server bundle via `serverExternalPackages`.

### `@mentio/ui` — component library

- shadcn/ui components in `src/components/ui/`, imported as
  `@mentio/ui/components/<name>`; `cn()` from `@mentio/ui/lib/utils`.
- `src/styles/globals.css` is the single Tailwind entry point plus shadcn theme tokens
  (light + `.dark`), imported by the app.
- Add components with `cd packages/ui && npx shadcn@latest add <component>`.

### Request flow and dependency injection

```
Request ──► Server Component / Route Handler
              │  const scope = await createRequestScope()
              ▼
        Awilix request scope ── em = orm.em.fork()   (fresh identity map)
              │
              ▼
        scope.cradle.userService ──► em ──► MikroORM ──► pg pool ──► PostgreSQL
```

The root container (built once per process) holds singletons such as the `orm`.
Every request creates a scope with its own forked `EntityManager`; services that
use `em` are registered `.scoped()` and resolved from that scope only.

## Working on this repo

Coding agents and contributors follow [`AGENTS.md`](AGENTS.md): stack rules, package
boundaries, and the spec-driven workflow under [`.ai/`](.ai) (specs, run logs,
lessons).
