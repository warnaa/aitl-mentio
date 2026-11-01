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
  utilities (and may use the plain-Tailwind presentational components listed under
  `@mentio/app` below).
- **shadcn/ui** (Radix + Tailwind) for the **backend/admin** pages, consumed from
  `@mentio/ui`.
- **npm workspaces** — use `npm` only (single root `package-lock.json`); never add a
  pnpm/yarn lockfile.

## Monorepo layout

```
packages/
  app/   @mentio/app   Next.js application: pages, API routes (HTTP wiring only)
  core/  @mentio/core  Business layer: services, DI container, validators, http layer, logger, env
  db/    @mentio/db    Persistence: MikroORM config, entities, migrations, ORM singleton
  ui/    @mentio/ui    Presentation: shadcn/ui primitives, backend panel blocks, shared theme
```

Dependency direction — enforced by ESLint `no-restricted-imports` (`eslint.config.mjs`);
do not loosen it for convenience:

- `app` → `core`, `ui` (never `db` or `@mikro-orm/*` directly — go through `core`)
- `core` → `db` (no `next`/`react`; no `@mikro-orm/*` — use the types `db` re-exports)
- `db` → no workspace package (no `next`/`react`); the only package that imports MikroORM
- `ui` → no workspace package (standalone; importable by `app` only)

Add a new package only with a spec. New packages go in `packages/<name>`, are named
`@mentio/<name>`, are `private`, and export TypeScript source via `exports` (no build
step — Next transpiles workspace packages). Each has its own `tsconfig.json` extending
`tsconfig.base.json`, must be added to the root `typecheck` script, and gets a boundary
entry in `eslint.config.mjs`.

### Domain concept convention

Domain code is not organized into `modules/`. Each concept (`auth`, `mentors`,
`availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, ...) is a
same-named sub-folder repeated across the layers that need it:

- `packages/db/src/entities/<concept>/<name>.entity.ts`
- `packages/core/src/services/<concept>/<name>.service.ts`
- `packages/core/src/validators/<concept>/<name>-<action>.schema.ts` (shared Zod schemas)
- `packages/app/src/app/api/<concept>/route.ts` and the matching `page.tsx` under
  the relevant persona route group (`(marketing)/`, `(auth)/`, `(student)/`, `(mentor)/`)
  or under `admin/`

Create a concept folder (and a persona route group) only when its first file is added
— never scaffold empty ones. This is a directory convention, not a module runtime:
there is no per-concept setup/ACL/auto-discovery. Reference implementation: the `auth`
concept's `User` (`entities/auth/user.entity.ts` → `services/auth/user.service.ts` →
`validators/auth/user-list.schema.ts` → `api/users/route.ts` → `admin/users/`). See
`.ai/specs/implemented/2026-10-23-engineering-standards.md` for the full naming table,
the step-by-step recipe for a new concept, and the payments-port/event-emitter patterns.

Event IDs follow `concept.entity.action` (e.g. `bookings.booking.created`) and are
emitted through the typed emitter in `packages/core/src/events`, registered on the
`Cradle` — this is in-process only; there is no queue/worker in this project. (Add
`core/src/events/` with the first feature that emits an event, not before.)

External integrations (payments, later notifications/video) are reached through a port
interface in `core` (`services/<concept>/<name>.port.ts`) with adapters under
`services/<concept>/adapters/`; `core`/`db` never import vendor SDKs directly.

### Reusable API & UI layer

Every route and every page reuses two shared layers instead of re-implementing
fetch/validation/auth/error-handling per feature:

- `packages/core/src/http/` (`@mentio/core/http`) — `errors.ts` (typed `AppError`
  hierarchy: `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`,
  `ConflictError`, `ConfigError`), `apiHandler.ts` (wraps a route: CSRF header check on
  unsafe methods, `AppError` → status + JSON envelope `{ ok, data }` /
  `{ ok: false, error: { code, message, fieldErrors? } }`, logs unexpected failures and
  never leaks them), `makeCrudRoute.ts` (schemas + service calls in,
  `{ GET, POST, PUT, DELETE }` out, for plain CRUD resources), `auth.ts`
  (`requireSession`, `requireRole`, `assertOwner`, session cookie options), `request.ts`
  (`parseJsonBody` / `parseSearchParams` / `parseWith` — Zod-parsed input only).
- `packages/ui/src/backend/` — `api` (`apiCall` / `apiCallOrThrow`: the only
  sanctioned `fetch()` call site, enforced by ESLint), `forms` (`CrudForm`), `tables`
  (`DataTable`), `feedback` (`LoadingMessage`, `ErrorMessage`, `EmptyState`). Import as
  `@mentio/ui/backend/<category>`.

Routes never write their own `try/catch` + `Response.json`; forms use `CrudForm`, lists
use `DataTable`, loading/error/empty states use `feedback/`. A bespoke implementation
needs a stated reason in the PR description.

New reusable components have one designated home each — never scattered ad hoc:

1. Shadcn primitive → `ui/src/components/ui/` (via `npx shadcn@latest add`, never
   hand-written).
2. Generic, concept-agnostic panel pattern → `ui/src/backend/<category>/`.
3. Component tied to one concept's domain shape → `ui/src/components/<concept>/`,
   named after the same concept folder used in `db`/`core`.
4. Used by exactly one page → colocate next to that `page.tsx` until a second
   consumer appears.

The JSON envelope is a shape convention, not a shared type: `core/src/http` and
`ui/src/backend/api` each declare it (and the CSRF header name), because `ui` must not
import `core`. Keep them in sync; a shared package for it is an Ask First change.

## Package rules

### `@mentio/app`

- Routes live in `packages/app/src/app/`: `(marketing)/` (public pages, plain Tailwind,
  no `@mentio/ui` — except the public presentational components in
  `@mentio/ui/components/mentors` and `@mentio/ui/components/auth`, which are plain
  Tailwind on the design tokens, server-safe, with no Radix/shadcn and no client JS;
  approved 2026-10-31, see `docs/design-system.md`), `admin/` (backend panel at
  `/admin`, built from `@mentio/ui`), and `api/<concept>/route.ts`. Page files
  default-export `<Segment>Page`.
- A route file is HTTP wiring only: `makeCrudRoute(...)` or `apiHandler(...)` that calls
  `requireSession`/ownership checks, then service methods through `withScope`. Business
  rules live in `core` services.
- Anything that touches the database declares `export const dynamic = "force-dynamic"`;
  the app must build and boot with no database reachable.
- `@/*` is the path alias for `packages/app/src/*`.

### `@mentio/core`

- Import through subpaths only — `@mentio/core/http`, `/container`, `/config`, `/logger`,
  `/validators/<concept>/<file>`, `/services/<concept>/<file>` — so client code that needs
  a schema (for `CrudForm`) or a DTO type never pulls in the ORM.
- Services: one class per file in `services/<concept>/`, constructor-injected
  (`constructor({ em, otherService }: Pick<Cradle, ...>)`), throw `AppError`s only, never
  build HTTP responses, and return DTOs (never entities) so new columns can't leak.
- Validators: Zod schemas in `validators/<concept>/`, shared by the API route and the
  form. Generic pieces (e.g. `pagination.schema.ts`, `Page<T>`) live at `validators/`.
- Env: `config/env.ts` (Zod-validated; `getEnv()`, `getJwtSecret()`); config errors
  throw `ConfigError`. Logging: `getLogger()` (pino) — never log passwords, tokens or
  full JWTs; extend `REDACTED_PATHS` in `logger.ts` when logging anything auth-related.

### `@mentio/db`

- Entities: `entities/<concept>/<name>.entity.ts`, defined with `defineEntity` + `p.*`
  builders and spreading `baseProperties()` (UUID id, `createdAt`, `updatedAt`). Export
  the generated class — `export const X = XSchema.class; export type X = InstanceType<typeof X>`
  — **never subclass it** (`class X extends XSchema.class` + `setClass`): minification
  renames the subclass per bundle and Next bundles pages and route handlers separately,
  so MikroORM's metadata lookup fails in production. Register the schema in the
  `entities` array in `entities/index.ts` (explicit list, no folder discovery).
- Conventions: table names plural snake_case (`tableName: "users"`), columns snake_case
  (mapped from camelCase properties).
- Schema changes are made **only** through migrations: change the entity, then
  `npm run db:migration:create`, review the generated file in `src/migrations/`, and
  commit it with `.snapshot-mentio.json`. Never edit an applied migration; never use
  `schema:update` against shared databases. Write a `down()` for every migration.
- `getOrm()` returns the process-wide ORM (one connection pool per process, cached on
  `globalThis`). DB settings are validated in `src/env.ts` (`db` can't import `core`).
- All persistence goes through MikroORM's entity/query APIs — no raw SQL built from
  user input. Check-then-write on shared state (slots, booking status) runs in a
  transaction backed by a unique constraint.

### `@mentio/ui`

- **Building or changing a screen? Read `docs/design-system.md` first.** It is the design
  system's agent reference: character, the component table (import, when, when not),
  semantic tokens, “if… use…” guides, what to avoid and the Storybook commands. The full
  manual is the Storybook in `packages/ui` (`npm run storybook`, start at Design system ›
  Start here). The component table is generated (`npm run docs:agent`;
  `npm run check:agent-doc` fails when stale).
- shadcn/ui components live in `packages/ui/src/components/ui/` and are imported as
  `@mentio/ui/components/<name>`; `cn` from `@mentio/ui/lib/utils`.
- Add components from `packages/ui`: `cd packages/ui && npx shadcn@latest add <name>`.
  The project uses shadcn's own `cn` package (clsx + tailwind-merge replacement); the
  CLI imports it as `from "cn"` in generated components — leave that as is.
  `@mentio/ui/lib/utils` re-exports the same `cn` for hand-written code.
- Theme tokens (CSS variables) and the Tailwind entry point are in
  `src/styles/globals.css`, imported once by the app's `src/app/globals.css`.
- Components are presentational: they receive data and callbacks as props. Data
  fetching goes through `backend/api` only.

## Dependency injection

- Composition root: `packages/core/src/container/container.ts`; types in `cradle.ts`.
  Every dependency is registered there explicitly (no `loadModules` globbing) and added
  to the `Cradle` interface.
- Lifetimes: process-wide infrastructure (`orm`, `logger`, gateways) → `asValue` /
  singleton; anything that touches `em` → `.scoped()`. Strict mode rejects singletons
  that depend on scoped registrations.
- Per request: `withScope((cradle) => cradle.someService.doThing())` (or
  `createRequestScope()`). `em` is registered only on request scopes (a fresh fork
  each), so services that need it cannot be resolved from the root container. Awilix
  itself would allow resolving `.scoped()` registrations from the root (caching them
  there for the whole process) — never rely on that.

## Security baseline

The full list (bcrypt cost ≥ 12, JWT/cookie/CSRF/rate-limit rules, review checklist) is
in the engineering-standards spec. Non-negotiables enforced by the shared layers:

- Every non-public route calls `requireSession` first (`makeCrudRoute` defaults to it;
  `access: "public"` is a reviewed exception). Mutations also check ownership of the
  specific record (`assertOwner`). Errors in auth checks fail closed.
- Sessions are HS256 JWTs (`JWT_SECRET` ≥ 32 bytes, 24h, no refresh flow) in an
  `httpOnly`, `sameSite=lax`, `secure`-in-production cookie — never `localStorage`.
- State-changing requests must carry the CSRF header that `apiCall` sends;
  `apiHandler` rejects them otherwise (`csrf: false` only for signature-verified webhooks).
- Write endpoints only see the Zod schema's parsed output — never spread a raw body into
  `em.create()`/`em.assign()`. Prices and ownership fields are recomputed server-side.
- Auth error messages stay generic ("invalid credentials").

## Environment

- Env files live at the repo root (`.env`, `.env.local`, …) and are loaded by both
  `next.config.ts` and the MikroORM CLI config. Real environment variables take
  precedence over `.env`. `.env.example` documents every variable — update it when
  adding one. Never commit `.env`.

## Commands (run from the repo root)

- `npm run dev` / `npm run build` / `npm run start` — the Next.js app.
- `npm run db:migration:create`, `npm run db:migrate`, `npm run db:migrate:down`.
- **Validation gate** — all must pass before work is considered done (CI runs the same
  checks on every PR, `.github/workflows/ci.yml`; a PR that only touches Markdown,
  `.ai/` or `docs/` skips them — keep that filter job-level, never `paths-ignore`):
  `npm run lint`, `npm run typecheck`, `npm run test:coverage` (Vitest unit tests with
  the 100% gate; `npm test` runs them without coverage), `npm run build`,
  `npm run test:integration` (after the build; needs Docker or `TEST_DATABASE_URL`),
  `npm run audit` (`scripts/audit.mjs`: fails on any
  high/critical advisory in production dependencies unless it is listed, with a reason,
  in `scripts/audit-allowlist.json`; currently only `braces` via `awilix`, reachable only
  through `loadModules`, which ESLint bans).
- A behavior change ships with a test that fails without it; a bug fix ships with a
  regression test.

## Testing

- **Every new feature must be 100% covered by unit tests** — lines, branches,
  functions and statements — and so must every changed file. `npm run test:coverage`
  enforces this with global 100% thresholds over all of `packages/*/src` and
  `scripts/`, so an untested file fails the gate. Do not lower the thresholds.
- Unit tests live next to the code (`*.test.ts(x)`), run under Vitest, and never touch a
  real database or network: mock collaborators at the package boundary
  (`vi.mock("@mentio/db", ...)`, `@mentio/core/container`, ...). Components and pages are
  tested through Testing Library (jsdom); async server components by awaiting the page
  function and rendering the result. Assert behavior, not just that code ran.
- Coverage exclusions are only the commented list in `vitest.config.mts` (generated
  shadcn primitives and migrations, type-only files, pure re-export barrels, tool config
  entry points). Adding to it needs a reason in the comment and in the PR description.
  `/* v8 ignore */` only for truly unreachable branches, with a same-line reason.
- **Every new page and API route also gets at least one integration test** in
  `tests/integration/` — routes: status codes + JSON envelope (including the auth
  failure); pages: a browser check of the main content via the `agent-browser` wrapper
  (`support/browser.ts`). The suite runs the production build against an ephemeral
  Postgres (testcontainers; `TEST_DATABASE_URL` without Docker), migrated with the real
  CLI. Each test seeds its own uniquely named data (`support/db.ts`); never rely on
  another file's rows.

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
- **Verify before calling it done.** After changes, run the validation gate (see
  "Commands" above: lint, typecheck, test, build, audit). For UI changes, also run
  `npm run dev` and check the affected pages. Review your own diff and be ready to
  justify the approach. If the result is mediocre, rework it. Report what you verified,
  what you couldn't, and anything you need from the user.
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
