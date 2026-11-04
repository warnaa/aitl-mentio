# AGENTS.md

## Project

**DevMentor** — a platform connecting developers with mentors.

### Tech stack

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Framework          | Next.js 16 (App Router, Turbopack) + React 19      |
| Language           | TypeScript 5 (strict), ESM everywhere              |
| Database           | PostgreSQL                                          |
| ORM                | MikroORM v7 (PostgreSQL driver) — migrations + pool |
| Dependency injection | awilix v13 (`PROXY` mode, typed `Cradle`)        |
| Config validation  | zod                                                |
| Logging            | pino                                               |
| Frontend styling   | Tailwind CSS v4 (public/marketing pages)           |
| Signed-in/admin UI | shadcn-ui components (in `@devmentor/ui`)          |
| Package manager    | npm workspaces (Node ≥ 24)                          |

### Monorepo layout

Workspace packages live under `packages/*`; dependencies flow `app → core → db`
and `app → ui`.

- `@devmentor/app`: Next.js host and composition root; may import every package.
- `@devmentor/core`: zod config, pino logger, awilix container and domain services;
  knows db, never imports React/Next/ui.
- `@devmentor/db`: MikroORM config, entities, migrations and seeders; imports no
  other workspace. Only db may import `@mikro-orm/*`.
- `@devmentor/ui`: presentational shadcn primitives and Tailwind tokens; no core/db imports.

Run `npm run lint` for the dependency rules (`no-restricted-imports` in
`eslint.config.mjs`).

### Domain concept convention

Do not organize domain code into `modules/`. Repeat each concept name (`auth`, `mentors`, `availability`,
`bookings`, `payments`, `messages`, `favorites`, `reviews`, ...) across layers:

- `packages/db/src/entities/<concept>/<name>.entity.ts`
- `packages/core/src/services/<concept>/<name>.service.ts`
- `packages/core/src/validators/<concept>/` (shared Zod schemas, when needed)
- `packages/app/src/app/api/<concept>/route.ts` and the matching `page.tsx` under
  the relevant persona route group

Create concept folders with their first file; no empty scaffolding or per-concept
setup/ACL/auto-discovery. Naming and payments-port/event-emitter patterns:
`.ai/specs/2026-09-01-engineering-standards.md`.

Event IDs follow `concept.entity.action` (e.g. `bookings.booking.created`) and are
emitted through the typed emitter in `packages/core/src/events`, registered on the
`Cradle` — this is in-process only; there is no queue/worker in this project.

### Reusable API & UI layer

Use these shared layers; never hand-roll fetch, validation, auth, error handling or CRUD:

- `packages/core/src/http/` — `errors.ts` (typed `AppError` hierarchy),
  `apiHandler.ts` (wraps a route: catches `AppError`s, maps to status + JSON
  envelope, logs unexpected failures), `makeCrudRoute.ts` (schema + service in,
  `{ GET, POST, PUT, DELETE }` out, for plain CRUD resources), `auth.ts`
  (`requireSession`, `requireRole`, ownership assertions). Services throw typed
  `AppError`s and return DTOs, never responses. Server routes use
  `makeCrudRoute`/`apiHandler`; no bare `try/catch` + `NextResponse.json`.
- `packages/ui/src/backend/` — `api/apiCall.ts` (the only sanctioned `fetch()` call
  site), `forms/CrudForm.tsx`, `tables/DataTable.tsx`,
  `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`. Client pages use
  `apiCall`/`apiCallOrThrow`, forms `CrudForm`, lists `DataTable`, and states `feedback/`.

New reusable components have one designated home each — never scattered ad hoc:

1. Shadcn primitive → `ui/src/components/ui/`; never hand-write. Run
   `npx shadcn@latest add <c>` in `packages/ui` (committed `components.json`).
2. Generic, concept-agnostic panel pattern → `ui/src/backend/<category>/`.
3. Component tied to one concept's domain shape → `ui/src/components/<concept>/`,
   named after the same concept folder used in `db`/`core`.
4. Used by exactly one page → colocate next to that `page.tsx` until a second
   consumer appears.

Declare matching `{ ok, data }` / `{ ok, error }` types separately in `core/src/http`
and `ui/src/backend/api`; ui must not import core. Copy `/api/users` +
`/admin/users/page.tsx` for new concepts. Rationale: the engineering-standards spec above.

### Scripts (run from the repo root)

- `npm run setup` — `npm install`, create `.env` from `.env.example`, ensure
  PostgreSQL, migrate and seed. Idempotent: report `ran`/`skipped` per step, never
  overwrite `.env` or start the nonterminating dev server. TCP-probe `DATABASE_URL`,
  else `DB_HOST`/`DB_PORT` (environment before `.env`); reuse a listening PostgreSQL,
  use Compose only if nothing answers. `scripts/setup/` uses plain Node ESM and
  `node:*` built-ins to run before install: pure decisions in `steps.mjs`, I/O in
  injectable `effects.mjs`, ordering in `run.mjs`.
- `npm run dev` — start the Next.js app (`@devmentor/app`).
- `npm run build` / `npm run start` — production build / serve (force `NODE_ENV=production`).
- `npm run typecheck` — `tsc --noEmit` across all packages.
- `npm run lint` — ESLint (includes the dependency-direction rules).
- `npm run test:unit` — run TypeScript unit tests with Vitest.
- `npm run test:unit:coverage` — run unit tests and enforce per-file 100% coverage.
- `npm run storybook` — build the prototype and start the local component catalogue.
- `npm run build-storybook` — build the prototype and static component catalogue.
- `npm run typecheck:storybook` — check catalogue configuration and examples.
- `npm run prototype` — rebuild the preview from `prototypes/devmentor-journey/`.
- `npm run typecheck:prototype` / `npm run test:prototype` — check prototype types and regressions.
- `npm run test:integration` — create ephemeral PostgreSQL with Testcontainers,
  build/start the app, and run the agent-browser scenarios.
- `npm run test:browser:install` — install agent-browser's Chrome runtime locally
  (use `test:browser:install:ci` on Linux CI to install system dependencies too).
- `npm run db:up` / `npm run db:down` — local Postgres via `docker-compose.yml`.
- `npm run db:migration:create -- --name <x>` — generate a migration from entity diff.
- `npm run db:migrate` / `npm run db:migrate:down` — apply / revert migrations.
- `npm run db:seed` — run the default seeder.

### Configuration

- Copy `.env.example` to `.env`. `.env` is git-ignored; defaults match
  `docker-compose.yml` (`devmentor` / `devmentor` / `devmentor`).
- Use only the root `.env`. Next normally reads from `packages/app/`;
  `next.config.ts` loads the root via `src/lib/repo-env.ts` (`process.loadEnvFile`),
  as `mikro-orm.config.ts` does for the CLI. Real environment wins; ignore a missing
  file. The integration harness pins every documented key to isolate developer config.
- Read env through zod: `@devmentor/core` `config/env.ts` for the app,
  `@devmentor/db` `env.ts` for the CLI. No direct `process.env` under `packages/`.
  Two documented exceptions outside packages:
  - `tests/integration/environment.ts` — inherits the parent environment to pass
    ephemeral test configuration to migration/build/app child processes.
  - `scripts/setup/effects.mjs` — before install, use no zod. Read `process.env`,
    `process.version`, `process.platform` behind injectable `SetupEffects`. Keep
    `steps.mjs` `resolveDatabaseTarget` (`DATABASE_URL` over `DB_*`) in sync with both schemas.

### Conventions & gotchas (learned the hard way — see `.ai/lessons.md`)

- Ship TypeScript source via `exports` → `./src/*`; Next compiles it with
  `transpilePackages`. No per-package build step.
- Use extensionless relative imports (`./foo`, not `./foo.js`) inside packages.
  Turbopack cannot rewrite `.js`→`.ts`; extensionless works with tsc (bundler) and tsx too.
- **MikroORM v7 has no decorators** in `@mikro-orm/core`. Define entities with
  `defineEntity` + the `p` (`defineEntity.properties`) builders. For cross-entity
  relations use a **per-property thunk** (`user: () => p.oneToOne(User)...`) so the
  reference resolves lazily at discovery time (avoids circular-import + wrapping bugs).
- Register entities as `globalThis` singletons (`entities/define.ts`) across Next's
  RSC/SSR/route graphs; different query/discovery schema instances break `populate`.
- **`MikroORM.init()` does not connect in v7** — `getOrm()` calls `orm.connect()`
  explicitly and does not cache a failed connection (so the app recovers if the DB
  comes back). The ORM and awilix container are cached on `globalThis` to survive HMR.
- **`em.persistAndFlush()` was removed** — use `em.persist(e); await em.flush()`.
- Touch the DB only in **dynamic** routes (`export const dynamic = "force-dynamic"`)
  and degrade gracefully; the app must build and boot with no database reachable.
- **Three surfaces, each with one styling rule** (primitives spec F1):

  | Surface  | Routes                                              | Styling                                          |
  | -------- | --------------------------------------------------- | ------------------------------------------------ |
  | `public` | landing, mentor catalogue and share links, `(auth)/*` | Tailwind utilities                               |
  | `app`    | `(mentee)/*`, `(mentor)/*` — signed in               | shadcn via `@devmentor/ui`, inside `AppShell`    |
  | `admin`  | `/admin/*` — operator                                | shadcn via `@devmentor/ui`, inside `AppShell`    |

  Every app/admin layout renders `SignedInShell` (`app/src/components/auth/`) with
  `AppShell` and `WorkspaceNav`. Add existing signed-in pages to `app/src/lib/nav.ts`
  for the union of user roles; never add nonexistent pages or role-granting links
  (R07: mentors by invitation, operators by configuration). App supplies rendered
  links; ui's `AppShell` knows neither `Role` nor `next/link`.
- Request-scoped work goes through `withScope(fn)` from `@devmentor/core`, which opens
  an awilix scope with a forked `EntityManager` and disposes it afterward.
- **Collection routes are non-dynamic**, so Next passes no `params` — CRUD helpers
  guard `ctx.params` before reading it.
- Browser-navigated routes (GitHub OAuth start/callback and later email verification)
  catch failures and redirect, typically to `/sign-in?error=…`. `apiHandler` passes
  the `Response` through so JSON is never rendered as a page. Other routes use
  `apiCall` and the `{ ok, data }` / `{ ok, error }` envelope.
- **State-changing routes are JSON-only.** `apiHandler` requires the
  `x-devmentor-request` header on every method other than `GET`/`HEAD`/`OPTIONS`
  (login CSRF defence), so a mutating route is called through `apiCall` or `CrudForm`,
  never a native HTML `<form>` post. Routes never call `requireCsrfHeader` themselves;
  the only opt-out, `apiHandler(logic, { csrf: false })`, is reserved for the payment
  webhook.
- **Signed-in pages guard at the layout and at every `page.tsx`** with
  `requirePageRole`/`requirePageAccount` from `app/src/lib/session.ts` (a layout does
  not re-run on client-side navigation), and the service checks the session again.
  `app/src/proxy.ts` is **not** an auth boundary: it only forwards the requested path
  as `x-devmentor-path` so a signed-out deep link survives sign-in. A new signed-in
  surface goes into its `matcher`, or its deep links fall back to the section root.

### Design-system rules confirmed by the user

- Form footer actions align right, with the secondary/Cancel action before the
  primary submit action in DOM and visual order. Authentication actions span the
  field width; provider alternatives use neutral styling and back navigation is
  visually separate. Preserve this order when actions wrap on mobile.

- Read `packages/ui/.storybook/Guidelines.mdx` before composing screens.
  Use clear visual hierarchy, comfortable reading widths and generous
  paragraph/component spacing; long prose may use 16px/28px while controls retain
  the compact DS scale.
- Present short comparable facts, such as a session length and its allowed price
  range, as separate neutral, noninteractive chips. Keep units/currency explicit
  and allow chips to wrap on mobile.
- Homepage feature chips use generous padding, semibold blue labels and decorative
  icons. Keep this emphasis distinct from neutral metadata and semantic statuses.
- Write visible copy in direct, specific language using the humanizer skill.
  Avoid generic promises and theatrical slogans; preserve product facts and useful
  validation/recovery instructions. Keep the current UI language unless requested.
- Never use dots, middle dots or bullet dots as inline metadata separators.
  Separate facts with spacing, new lines or chips. Normal sentence punctuation
  remains allowed. The reusable examples live in Storybook's usage guidelines.
- The DevMentor wordmark uses bundled DM Mono; ordinary UI text stays in Inter.
  The blue four-point star is the favicon. Technology chips retain text labels
  alongside decorative icons. Mentor ratings and reviews are included as
  presentational DS components; persistence and eligibility belong to the backend.

## Testing requirements

- **Every new feature must have unit tests covering 100% of its new or changed
  production behavior:** statements, branches, functions, and lines, per file. A
  feature is not complete and its spec must not move to `implemented/` until
  `npm run test:unit:coverage` proves all four metrics are 100%.
- Add each new or changed production file to `coverage.include` in
  `vitest.config.mts` in the same change. Coverage that only measures files imported
  by tests is bypassable and does not satisfy this rule. Do not narrow exclusions or
  remove a file from the coverage scope to make the gate pass.
- Unit tests live next to their source as `*.test.ts` / `*.test.tsx`. Test every
  success, error, validation, authorization, and edge-case branch. Every bug fix
  requires a regression test that fails without the fix.
- **Component tests.** `vitest.config.mts` keeps `environment: 'node'` and loads
  `@vitejs/plugin-react`. *Server components* (`page.tsx`, `layout.tsx`) are async
  functions returning an element tree: invoke them directly and assert the returned
  tree in the node environment, with no DOM or renderer. *Client components* opt in
  with a per-file `// @vitest-environment jsdom` pragma and use
  `@testing-library/react` + `@testing-library/user-event`.
- `redirect()` throws: guarded-page tests mock `app/src/lib/session.ts`, assert the
  allowed tree and a denied sentinel throw. `session.test.ts` mocks `next/navigation`
  and checks redirect arguments, never Next internals. Include every guarded
  `page.tsx` in coverage and cover authorized and redirected branches.
- Integration/browser tests **supplement but never replace unit tests** or the 100%
  unit-coverage requirement. Add integration coverage whenever behavior crosses the
  app/database/API/browser boundary.
- Integration tests must own their data and infrastructure. Use Testcontainers with
  random ports, apply migrations, create/seed prerequisites, and clean up browser
  sessions, app processes, and containers on success and failure. Never depend on the
  developer database, fixed ports, or shared/demo state.
- Use the pinned local `agent-browser` executable for browser scenarios. Observe the
  live accessibility tree first, assert semantic roles/text rather than guessed CSS,
  capture screenshots at key assertions, and close each isolated session in
  `finally`.

GitHub Actions runs Build, Lint, Unit tests, and Integration tests independently on
every pull request. A workflow result becomes merge-blocking only when the repository
ruleset requires those four exact check names.

## Spec-Driven Development (SDD)

All SDD artifacts live under `.ai/`:

```
.ai/
  specs/                  active specs
    implemented/          specs whose implementation has landed
    archive/               specs that were superseded or abandoned
  runs/                   logs of autonomous AI runs
  lessons.md              index of lessons learned
  lessons/                detailed lesson write-ups
```

### Specs — `.ai/specs/`

- Naming: `YYYY-MM-DD-slug.md`, dated when written; short kebab-case slug.
- Lifecycle:
  1. New/active work: file lives directly in `.ai/specs/`.
  2. Once the implementation is complete, verified, and merged: `git mv` the file into
     `.ai/specs/implemented/`.
  3. If a spec is superseded, abandoned, or no longer accurate: `git mv` it into
     `.ai/specs/archive/` instead of deleting it.
- Rules:
  - Before starting a nontrivial feature or fix, check `.ai/specs/` and
    `.ai/specs/implemented/` for a spec that already covers it.
  - If none exists, write one first for anything beyond a small/obvious change.
  - Never edit a spec after it has moved to `implemented/` or `archive/` — if
    requirements change, write a new spec instead.
  - A spec should cover: Problem/Goal, Non-goals, Approach, Acceptance criteria.

### Runs — `.ai/runs/`

- Every autonomous AI run (an agent operating on a task without a human reviewing
  each step — e.g. a workflow, an unattended long-running session) produces exactly
  one run log.
- Naming: `YYYY-MM-DD-slug.md`, dated the day the run happened.
- A run log should cover: what was requested, what was done, files touched, outcome,
  and any follow-ups left for a human or a future run.

### Lessons — `.ai/lessons.md` + `.ai/lessons/`

- `.ai/lessons.md` is a chronological index — one line per lesson, most recent first.
  Short lessons can be stated inline; anything longer gets its own file in
  `.ai/lessons/slug.md` and is linked from the index.
- Add a lesson when:
  - a nontrivial bug is fixed (what was wrong, why, the fix, how to avoid it again),
  - a project-specific gotcha or convention is discovered,
  - the user corrects an agent's approach in a way that should persist beyond the
    current session.
- Check `.ai/lessons.md` at the start of related work before repeating a known
  mistake.

### Enforcement

- Use this `.ai/` structure for specs, run logs, and lessons — don't create ad hoc
  scratch docs elsewhere in the repo for these purposes.

## Working Rules

1. Plan first. If implementation goes sideways, stop and revise the plan/spec.
   For high-stakes plans, get a skeptical staff-engineer subagent review before coding.

2. Before continuing after a user correction, write it to `.ai/lessons.md`; update
   this file for a standing rule.

3. **Promote anything repeated into a skill or command.** If you find yourself doing
   the same multi-step task more than a couple of times, propose codifying it as a
   project skill or slash command in `.claude/` instead of re-deriving the steps each
   run.

4. Before declaring work done or moving a spec to `implemented/`, check the diff
   against acceptance criteria and actively try to break it. If the result is merely
   adequate, scrap it and implement the elegant version rather than iterating on a
   mediocre base. Report failures plainly; claim success only after verification.

5. Delegate wide searches, multi-file reads and independent parallel work to
   subagents; keep conclusions in the main thread for judgment.

6. **Work locally; obtain explicit permission before any remote write.** Prepare
   and review changes locally. Never push commits, create or update remote PRs or
   issues, publish/deploy artifacts, or write changes to Figma or another external
   service without the user's explicit approval for that action. Read-only remote
   research remains allowed. A request to build or edit something locally is not
   approval to publish it.
7. **Keep session materials out of commits.** Run logs, local PR drafts, working
   references and generated previews stay local. Review the staged file list and
   commit only the requested project deliverables and their required source,
   tests and documentation.
