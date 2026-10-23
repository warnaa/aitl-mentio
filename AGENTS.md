<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Mentio — architecture and stack rules

Mentio is a monorepo. These are fixed project decisions; follow them in all work and
propose a spec (see SDD below) before changing any of them.

## Stack

- **Next.js** (latest, App Router, Turbopack) + **React** (latest) + **TypeScript**
  (strict). Read `node_modules/next/dist/docs/` before using Next APIs (see above).
- **PostgreSQL** is the only database.
- **MikroORM** (`@mikro-orm/postgresql`, v7) is the data layer: entities, migrations,
  connection pooling. No other ORM / query builder / raw `pg` client.
- **Awilix** is the dependency-injection container.
- **Tailwind CSS v4** for all styling. Public **frontend** pages use plain Tailwind
  utilities.
- **shadcn/ui** (Radix + Tailwind) for the **backend/admin** pages, consumed from
  `@mentio/ui`.
- **npm workspaces** — use `npm` only (single root `package-lock.json`); never add a
  pnpm/yarn lockfile.

## Monorepo layout

```
packages/
  app/   @mentio/app   Next.js application: routes, pages, server code, DI composition root
  core/  @mentio/core  Framework-agnostic reusable code: DI helpers, env/config, errors
  db/    @mentio/db    MikroORM config, entities, migrations, ORM singleton
  ui/    @mentio/ui    Reusable React components (shadcn/ui), `cn()`, shared Tailwind theme
```

Dependency direction (enforced by review — no cycles, no upward imports):

- `app` → `ui`, `db`, `core`
- `db` → `core`
- `ui` → (no workspace packages)
- `core` → (no workspace packages; no React, no Next, no MikroORM)

Add a new package only with a spec. New packages go in `packages/<name>`, are named
`@mentio/<name>`, are `private`, and export TypeScript source via `exports` (no build
step — Next transpiles workspace packages). Each has its own `tsconfig.json` extending
`tsconfig.base.json`, and must be added to the root `typecheck` script.

## Package rules

### `@mentio/app`

- Routes live in `packages/app/src/app/`:
  - `(frontend)/` — public pages, Tailwind only. Do not import `@mentio/ui` here.
  - `admin/` — backend/admin pages (served at `/admin`), built from `@mentio/ui`
    components.
- Server-only code lives in `packages/app/src/server/` and starts with
  `import "server-only"` where it touches the container or the database.
- Domain/application services go in `packages/app/src/server/services/` as classes
  that receive dependencies through the constructor (Awilix PROXY injection:
  `constructor({ em, otherService }: Deps)`).
- `@/*` is the path alias for `packages/app/src/*`.

### `@mentio/core`

- Pure TypeScript, safe to import anywhere on the server. No framework imports.
- Owns the Awilix wrapper `createAppContainer()` (PROXY mode, strict) and re-exports
  `asClass`/`asFunction`/`asValue`/`Lifetime`. Import Awilix through `@mentio/core`, not
  directly.
- Env access goes through `readEnv` / `readIntEnv`; config errors throw `ConfigError`.

### `@mentio/db`

- Entities: one file per entity in `src/entities/`, defined with `defineEntity` +
  `p.*` builders and `setClass` (no decorators, no `reflect-metadata`). Export every
  entity from `src/entities/index.ts` **and** add it to the `entities` array there —
  the ORM uses explicit entity lists, not folder discovery.
- Conventions: table names plural snake_case (`tableName: "users"`), `uuid` primary key
  generated with `randomUUID()`, `createdAt` / `updatedAt` timestamps.
- Schema changes are made **only** through migrations: change the entity, then
  `npm run db:migration:create`, review the generated file in `src/migrations/`, and
  commit it with the `.snapshot-*.json`. Never edit an applied migration; never use
  `schema:update` against shared databases. Write a `down()` for every migration.
- `getOrm()` returns the process-wide ORM (one connection pool per process, cached on
  `globalThis`). Pool size comes from `DB_POOL_MIN` / `DB_POOL_MAX` /
  `DB_POOL_IDLE_TIMEOUT_MS`.
- Never query through the global `orm.em`. Use a forked, request-scoped
  EntityManager — in the app, resolve `em` (or a service using it) from a request scope.
- MikroORM packages are in `serverExternalPackages`; never import `@mentio/db` from a
  Client Component.

### `@mentio/ui`

- shadcn/ui components live in `packages/ui/src/components/ui/` and are imported as
  `@mentio/ui/components/<name>`; `cn` from `@mentio/ui/lib/utils`.
- Add components from `packages/ui`: `cd packages/ui && npx shadcn@latest add <name>`.
  After adding, check imports point at `@mentio/ui/lib/utils` (the CLI can rewrite them
  wrongly) and that no unexpected dependency was added to `package.json`.
- Theme tokens (CSS variables) and the Tailwind entry point are in
  `src/styles/globals.css`, imported once by the app's `src/app/globals.css`.
- Components must be generic and presentational — no data fetching, no imports from
  `app`, `db` or `core`.

## Dependency injection

- Composition root: `packages/app/src/server/container.ts`. Register every service
  there and add it to the `AppCradle` interface.
- Lifetimes: process-wide infrastructure (`orm`, config, clients) → singleton /
  `asValue`; anything that touches `em` → `.scoped()`. Strict mode rejects singletons
  that depend on scoped registrations.
- Per request (page, route handler, server action): `const scope = await
  createRequestScope()` then use `scope.cradle.<service>`. `em` is registered only on
  request scopes (a fresh fork each), so services that need it cannot be resolved from
  the root container. Awilix itself would allow resolving `.scoped()` registrations from
  the root (caching them there for the whole process) — never rely on that.

## Environment

- Env files live at the repo root (`.env`, `.env.local`, …) and are loaded by both
  `next.config.ts` and the MikroORM CLI config. Real environment variables take
  precedence over `.env`. `.env.example` documents every variable — update it when
  adding one. Never commit `.env`.

## Commands (run from the repo root)

- `npm run dev` / `npm run build` / `npm run start` — the Next.js app.
- `npm run lint`, `npm run typecheck` — must pass before work is considered done.
- `npm run db:migration:create`, `npm run db:migrate`, `npm run db:migrate:down`.

# Spec-Driven Development (SDD) and AI memory

This project uses `.ai/` as the source of truth for specs, run logs, and accumulated
lessons. Any AI agent working in this repo MUST follow the structure and workflow below.

## `.ai/specs/` — specifications

- Every non-trivial feature or change starts as a spec file at `.ai/specs/YYYY-MM-DD-slug.md`
  (date the spec was created, short kebab-case slug describing the work).
- Before starting implementation of a non-trivial task, check whether a relevant spec
  already exists. If not and the task warrants one, write it first and confirm it with
  the user before coding.
- Every spec ends with a **Done means** list of checkable completion criteria (e.g.
  specific behavior works, lint and build pass). Work isn't finished until all are met.
- Lifecycle:
  - Active, not-yet-implemented specs live directly in `.ai/specs/`.
  - Once a spec has been fully implemented, move its file to `.ai/specs/implemented/`
    (keep the same filename).
  - Specs that are abandoned, superseded, or no longer relevant go to
    `.ai/specs/archive/` instead of being deleted.

## `.ai/runs/` — autonomous run logs

- Every autonomous AI run (unattended / multi-step agent work, not a short interactive
  back-and-forth) MUST produce a log file at `.ai/runs/YYYY-MM-DD-slug.md` (date of the
  run, short kebab-case slug describing what the run did).
- The log should capture: what was asked, what was done, which specs/files were
  touched, and the outcome (done / partially done / blocked), so a human or another
  agent can reconstruct what happened without replaying the whole session.
- Keep the run's task checklist in the log and update it as you go. It survives context
  summarization, which can drop details of the original plan.
- End the log with a **Needs from you** section listing blockers that only a human can
  resolve (API keys, manual confirmations, external config), or "none".

## `.ai/lessons.md` and `.ai/lessons/` — long-term memory

- `.ai/lessons.md` is an append-only running log of lessons learned: non-obvious bugs
  and their root causes, gotchas/footguns in this codebase or its dependencies, and
  decisions future work should respect. Read it before starting non-trivial work, and
  add an entry after fixing a bug or learning something worth remembering long-term.
- When the user corrects your approach, record it as a lesson so it isn't repeated. If
  the correction is a rule for every task, propose adding it to this file instead.
- For lessons that need more than a few sentences, write the full detail in
  `.ai/lessons/YYYY-MM-DD-slug.md` and link it from the corresponding entry in
  `.ai/lessons.md`.

## Working principles

Adapted from Boris Cherny's Claude Code tips and the Opus 5.5 prompting guide.

- **Keep going until done.** When a step doesn't need user input, continue. Put status
  notes in the same message as your next action, and take the next step rather than
  announcing it. Stop and ask only when you can't continue without the user, or before
  anything destructive (deleting data, force-pushing, changing anything outside the repo).
- **Plan complex tasks first.** Plan the whole task before editing. For non-trivial
  features, the plan is the spec. If implementation goes off track, stop and re-plan
  instead of pushing through.
- **Verify before calling it done.** After changes, run `npm run lint` and
  `npm run build`. For UI changes, also run `npm run dev` and check the affected pages.
  Review your own diff and be ready to justify the approach. If the result is mediocre,
  rework it. Report what you verified, what you couldn't, and anything you need from
  the user.
- **Fix bugs end to end.** Given a bug report, failing build, or error log, reproduce
  it, find the root cause, and fix it without needing step-by-step direction.
- **Split large jobs into narrow units.** Delegate heavy or broad work to subagents, one
  narrowly scoped unit each (e.g. one directory), and cross-check their findings before
  concluding. Run parallel sessions in separate git worktrees so they don't conflict.
- **Review for blockers.** When reviewing code, list only problems that would block a
  merge, each with file, line, why it's a problem, and a fix.
- **Turn repeated workflows into skills** under `.claude/skills/`, committed to git.

## Enforcement

- Do not skip writing a spec for non-trivial work, a run log for autonomous runs, or a
  lessons entry after a non-obvious fix or correction — these are how context persists across
  sessions and agents in this project.
- Always use the `YYYY-MM-DD-slug.md` naming convention for files under `.ai/specs/`
  and `.ai/runs/`.
