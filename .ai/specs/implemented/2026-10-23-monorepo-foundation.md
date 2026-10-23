# Mentio — monorepo foundation

Status: implemented 2026-10-23; confirmed (npm workspaces, `/admin`, `@mentio/*`)

## Goal

Turn the single-package `create-next-app` starter into the Mentio monorepo with the
agreed stack, and document the architecture so humans and coding agents follow it.

## Stack (fixed assumptions)

| Concern            | Choice                                                          |
| ------------------ | --------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router), React 19, TypeScript (strict)          |
| Database           | PostgreSQL                                                      |
| ORM                | MikroORM 7 (`@mikro-orm/postgresql`), migrations, pooled conns  |
| DI container       | Awilix                                                          |
| Frontend styling   | Tailwind CSS v4                                                 |
| Backend (admin) UI | shadcn/ui (on Tailwind v4, Radix primitives)                    |
| Monorepo           | npm workspaces, `packages/*`                                    |

## Layout

```
package.json            # workspace root; scripts delegate to @mentio/app
tsconfig.base.json      # shared compiler options
packages/
  app/   @mentio/app    # Next.js application (routes, composition root, pages)
  core/  @mentio/core   # framework-agnostic reusable code: DI container, config, errors, utils
  db/    @mentio/db     # MikroORM config, entities, migrations, ORM/EM helpers
  ui/    @mentio/ui     # reusable React components (shadcn/ui), `cn()` helper, styles
```

Dependency direction (no cycles): `app → ui, db, core`; `db → core`; `ui` and `core`
depend on no other workspace package.

## Decisions

1. **npm workspaces** — the repo already uses npm (`package-lock.json`, preview runs
   `npm run dev`). Root `dev`/`build`/`start`/`lint` scripts forward to `@mentio/app`, so
   the existing preview config keeps working unchanged.
2. **Internal packages ship TypeScript source** (no per-package build step). Each package
   exposes `exports` pointing at `src/*.ts`; Next 16 transpiles workspace packages
   automatically, so no `transpilePackages` entry is needed.
3. **MikroORM** lives in `@mentio/db`:
   - Entities defined with `defineEntity` (no decorators → no `experimentalDecorators` /
     reflect-metadata, works with Turbopack/SWC).
   - `mikro-orm.config.ts` reads `DATABASE_URL` and pool settings (`DB_POOL_MIN`,
     `DB_POOL_MAX`); one ORM instance per process, cached on `globalThis` so dev HMR does
     not leak pools.
   - Migrations in `packages/db/src/migrations`, scripts: `db:migration:create`,
     `db:migrate`, `db:migrate:down` (root scripts forward to `@mentio/db`).
   - MikroORM packages are in `serverExternalPackages` and only imported from server code.
   - Request-scoped work uses `em.fork()`; never the global EntityManager.
4. **Awilix** container factory in `@mentio/core` (`createAppContainer`, injection mode
   `PROXY`, strict mode on). The app has a composition root
   (`packages/app/src/server/container.ts`) that registers the ORM and services;
   per-request scopes created with `container.createScope()` register a forked `em`.
5. **UI split**:
   - Public frontend pages: `packages/app/src/app/(frontend)/…` — plain Tailwind.
   - Backend/admin pages: `packages/app/src/app/admin/…` — shadcn/ui components from
     `@mentio/ui`.
   - shadcn components are generated into `packages/ui/src/components/ui` (via
     `components.json` in `packages/ui`); the app's `globals.css` imports Tailwind and the
     shadcn theme tokens from `@mentio/ui/styles.css` and `@source`s the ui package.
6. Starter template (`backdrop.tsx`, starter CSS, `public/*.svg`) is removed and
   replaced with a minimal Mentio landing page and a `/admin` dashboard placeholder.
7. Root `AGENTS.md` gains a "Mentio architecture" section (stack, layout, dependency
   rules, conventions). The existing Next.js and SDD blocks stay as-is. `CLAUDE.md`
   keeps importing `AGENTS.md`.
8. `README.md` rewritten: what Mentio is, stack, layout, getting started (env vars,
   Postgres, migrations), scripts.
9. `.env.example` committed with `DATABASE_URL` and pool settings.

## Out of scope

Auth, real domain entities beyond one example entity + initial migration, tests
framework, CI, Docker images.

## Done means

- [x] `packages/{app,core,db,ui}` exist with the dependency direction above.
- [x] `npm install` at the root installs all workspaces; one lockfile at the root.
- [x] `npm run dev` from the root serves `/` (Tailwind) and `/admin` (shadcn) pages.
- [x] `npm run lint` and `npm run build` pass from the root.
- [x] `db:migration:create` / `db:migrate` work against a local Postgres; an initial
      migration for the example entity is committed.
- [x] Awilix container resolves the ORM and an example service; a server route/page uses it.
- [x] `AGENTS.md` documents all stack assumptions and rules; `README.md` has architecture notes.
- [x] Run log written in `.ai/runs/`; spec moved to `.ai/specs/implemented/`.
