# Code review rules

How changes to Mentio are reviewed. `om-code-review` (and therefore `om-auto-review-pr`) applies this file automatically; humans use it the same way. It complements the full checklist in `.ai/specs/implemented/2026-10-23-engineering-standards.md` ("Code Review Checklist") and the rules in `AGENTS.md` — when they disagree, `AGENTS.md` wins and this file should be fixed.

## Review priorities

In order — a finding higher up outranks any number of findings lower down:

1. **Correctness** — the change does what its spec/issue says, including the error, empty, and concurrent paths.
2. **Security** — auth, ownership, input validation, secrets (see below).
3. **Contracts** — nothing in `BACKWARD_COMPATIBILITY.md` breaks without its required path.
4. **Architecture** — package boundaries, shared layers, DI lifetimes.
5. **Tests** — 100% coverage of changed files, behavior asserted, integration test for new routes/pages.
6. **Quality** — readability, naming, dead code, scope creep.

## Gate

Before review sign-off the gate is green, in order: `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`, `npm run audit`. CI additionally runs `npm run test:integration`. A red gate is a blocker finding, reported together with the code findings, never instead of them.

## Repo-specific checks

### Package boundaries and layering

- Imports follow `app → core, ui`, `core → db`, `db`/`ui` → no workspace package. `app` never imports `@mentio/db` or `@mikro-orm/*`; `core` never imports `next`, `react` or `@mikro-orm/*`. Loosening `no-restricted-imports` in `eslint.config.mjs` is a **blocker** unless a spec approves it.
- `@mentio/core` is imported through subpaths only (`@mentio/core/http`, `/container`, `/validators/<concept>/<file>`, …). Client code pulling in a service or the container (and with it the ORM) is a **major**.
- Domain code follows the concept-folder convention (`entities/<concept>/`, `services/<concept>/`, `validators/<concept>/`, `api/<concept>/`). No `modules/` folders, no empty scaffolded concept folders.
- Vendor SDKs (payments, notifications, video) are reached only through a port in `core/src/services/<concept>/<name>.port.ts` with an adapter under `adapters/`.

### Routes (`packages/app/src/app/api/**/route.ts`)

- A route is HTTP wiring only: `makeCrudRoute(...)` or `apiHandler(...)` calling services through `withScope`. A hand-written `try/catch` + `Response.json`, or business logic in the route, is a **major** unless the PR states why.
- Every non-public route calls `requireSession` first (`makeCrudRoute` defaults to it). `access: "public"` or a missing `requireSession` needs an explicit justification — otherwise **blocker**.
- Mutations check ownership of the specific record (`assertOwner`). A missing ownership check is treated exactly like a missing auth check: **blocker**.
- Input reaches services only through `parseJsonBody` / `parseSearchParams` / `parseWith` with a Zod schema from `@mentio/core/validators`. Spreading a raw body into `em.create()`/`em.assign()` is a **blocker** (mass assignment).
- `csrf: false` on `apiHandler` is allowed only for signature-verified webhooks — **blocker** otherwise.
- Anything that touches the database exports `dynamic = "force-dynamic"`; the app must build and boot with no database reachable.

### Services and DI (`packages/core`)

- One class per file, constructor-injected via `Pick<Cradle, ...>`, registered explicitly in `container/container.ts` and added to the `Cradle` interface. `loadModules` globbing is banned.
- Anything that depends on `em` is registered `.scoped()` and resolved through `withScope`/`createRequestScope()`, never from the root container. A singleton depending on a scoped registration is a **blocker**.
- Services throw only `AppError` subclasses from `@mentio/core/http` and never build HTTP responses.
- Services return DTOs, never entities. Returning an entity (new columns could leak to clients) is a **major**.
- Events use `concept.entity.action` IDs through the typed emitter in `core/src/events`, in process only. Adding a queue or worker is out of scope without a spec.

### Persistence (`packages/db`)

- Entities use `defineEntity` + `p.*`, spread `baseProperties()`, and export the generated class (`export const X = XSchema.class`). Subclassing the generated class is a **blocker**: it breaks MikroORM metadata lookup in production bundles.
- New entities are registered in the explicit `entities` array in `entities/index.ts`. Table names are plural snake_case.
- Every schema change ships a generated migration plus the updated `.snapshot-mentio.json`, with a working `down()`. Editing an applied migration is a **blocker**.
- No raw SQL built from user input. A check-then-write on shared state (slots, booking status) runs in a transaction backed by a unique constraint — **blocker** for bookings and payments.

### UI (`packages/ui`, admin pages)

- `fetch()` happens only inside `@mentio/ui/backend/api` (`apiCall` / `apiCallOrThrow`). ESLint enforces it; do not disable the rule.
- Forms use `CrudForm`, lists use `DataTable`, and loading/error/empty states use `backend/feedback`. A bespoke equivalent needs a stated reason in the PR.
- New components go in their designated home: shadcn primitives in `ui/src/components/ui/` (added via the shadcn CLI, never hand-written), generic panel patterns in `ui/src/backend/<category>/`, concept-specific components in `ui/src/components/<concept>/`, single-use components next to their `page.tsx`.
- `(marketing)/` pages use plain Tailwind and no `@mentio/ui`; `admin/` pages are built from `@mentio/ui`. Components are presentational: data and callbacks arrive as props.
- The JSON envelope and the CSRF header name are declared in both `core/src/http` and `ui/src/backend/api`. A change to one without the other is a **blocker**.

### Security

- Sessions are HS256 JWTs signed with `JWT_SECRET` (≥ 32 bytes), valid 24h, stored in an `httpOnly`, `sameSite=lax` cookie that is `secure` in production. A token in `localStorage`, weakened cookie flags, or a longer lifetime are all **blockers**.
- Passwords are hashed with bcrypt at cost ≥ 12. Login, register, and password reset have a brute-force control. Auth errors stay generic ("invalid credentials").
- Errors inside an auth or ownership check fail closed (deny). Falling through to allow is a **blocker**.
- No password, token, or full JWT appears in a log, error response, or client payload. New auth-related logging extends `REDACTED_PATHS` in `core/src/logger.ts`.
- Prices and ownership fields are recomputed server-side. Client-supplied values are parsed but never trusted.
- New production dependencies keep `npm run audit` green. Adding to `scripts/audit-allowlist.json` needs a reason in the file and in the PR.
- Env vars are validated in `core/src/config/env.ts` (or `db/src/env.ts`) and documented in `.env.example`. `.env` is never committed.

### Tests

- Every changed file stays at 100% lines/branches/functions/statements. Lowering thresholds in `vitest.config.mts` is a **blocker**. Additions to the coverage-exclusion list or `/* v8 ignore */` need a same-line reason.
- Unit tests sit next to the code, mock at the package boundary, and never touch a real database or network. They assert behavior, not just that code ran.
- A new page or API route ships at least one test in `tests/integration/`: status codes and envelope (including the auth failure) for routes, a browser check via `support/browser.ts` for pages. Each test seeds its own uniquely named data.
- A behavior change ships a test that fails without it. A bug fix ships a regression test. Concurrency-sensitive flows (booking, reschedule) get a test that simulates the concurrent case.

### Process

- Non-trivial work has a spec in `.ai/specs/` with a **Done means** list, moved to `implemented/` once complete. Autonomous runs leave a log in `.ai/runs/`. Non-obvious fixes add a `.ai/lessons.md` entry.
- npm only — a `pnpm`/`yarn` lockfile is a **blocker**.
- The diff traces entirely to its stated purpose: no drive-by renames, formatting passes, or speculative options.

## Severity

| Severity | Meaning | Examples here |
|---|---|---|
| **blocker** | Must be fixed before merge. | Missing `requireSession`/`assertOwner`; mass assignment; secret in logs; subclassed entity; edited applied migration; boundary rule loosened; red gate; coverage below 100%. |
| **major** | Should be fixed in this PR. Merging anyway needs a stated reason. | Route with hand-rolled `try/catch`; service returning an entity; missing integration test for a new route or page; bespoke form or table without a reason. |
| **minor** | Worth fixing. May become a follow-up issue. | Naming that drifts from the convention table; unclear test names; a comment that restates the code. |
| **nit** | Optional. | Wording or ordering preferences. |

Only blockers and majors hold an approval. When requesting changes, list each finding with its file, line, why it is a problem, and a fix.
