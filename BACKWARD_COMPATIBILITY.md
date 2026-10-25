# Backward compatibility

The surfaces Mentio protects, what counts as a breaking change to each, and the path a breaking change must take. Review skills check every PR against this file. Implementation skills warn when a change is not compliant with it.

Mentio is a single deployed app in a private monorepo. Its workspace packages (`@mentio/*`) are not published and have no consumers outside this repo. So the contracts that matter are the ones that outlive one deploy: what browsers, cookies, the database, and operators already hold. A change to a surface below is breaking when something that worked before the deploy stops working after it, without anyone changing their side.

Any breaking change needs a `risk-high` label, a migration note in the PR body (what breaks, who is affected, how to roll back), and, where the surface needs one, the deprecation step listed below. A change that is not breaking needs none of this.

## 1. HTTP API — `packages/app/src/app/api/**`

Current routes: `GET /api/health` (public), `GET /api/users` (session-protected, paginated).

**Contract:**

- The JSON envelope: `{ ok: true, data }` on success, `{ ok: false, error: { code, message, fieldErrors? } }` on failure. It is declared twice: in `packages/core/src/http` and `packages/ui/src/backend/api`.
- Error `code` values and their HTTP status: `validation_error` 400, `unauthorized` 401, `forbidden` 403, `not_found` 404, `conflict` 409, `config_error` 500.
- The CSRF header `x-mentio-request: 1` that `apiCall` sends on unsafe methods. Its name is declared on both sides as well.
- Each route's path, method, accepted query/body fields, and the `data` shape, including the `Page<T>` pagination shape from `validators/pagination.schema.ts`.

**Breaking:** removing or renaming a route, field, or error code; changing a status code or the envelope; making an optional input required; tightening validation so previously accepted input is rejected; changing the CSRF header; moving a route from public to protected or back without the review the security baseline requires.

**Not breaking:** adding a route, an optional input field, a response field, or a new error code.

**Required path:** the admin UI and the API deploy together, so in-repo consumers are updated in the same PR. Both copies of the envelope and the CSRF header change in the same commit. Removing a route or field that a page already shipped in production uses calls needs one release where the old and new shapes are both accepted.

## 2. Database schema — `packages/db/src/migrations/`

**Contract:** every applied migration, `.snapshot-mentio.json`, table and column names (`users`, plural snake_case), UUID primary keys from `baseProperties()`, and the data already stored.

**Breaking:** editing or deleting an applied migration; dropping or renaming a table or column with live data; changing a column type or nullability in a way that rejects or alters existing rows; a migration with no working `down()`.

**Not breaking:** adding a table, a nullable column, a column with a default, or an index that existing data already satisfies.

**Required path:** schema changes go only through `npm run db:migration:create`, committed with the snapshot, and never through `schema:update` on a shared database. A rename or drop is done expand → migrate → contract: add the new column, backfill it, switch the code over, and drop the old column in a later release. The PR body includes the rollback plan and confirms `down()` was tested.

## 3. Session and auth — `packages/core/src/http/auth.ts`

**Contract:** the `mentio_session` cookie name and flags (`httpOnly`, `sameSite=lax`, `secure` in production, path), the HS256 JWT signed with `JWT_SECRET`, its 24h lifetime, and the session claims services read.

**Breaking:** renaming the cookie or changing the signing algorithm or required claims logs every user out on deploy. Weakening a flag or extending the lifetime is a security regression, not a compatibility question, and needs a spec.

**Required path:** a forced logout is acceptable only when the PR body states it explicitly and gets a second person's review. Rotating `JWT_SECRET` has the same effect.

## 4. Environment variables — `.env.example`, `core/src/config/env.ts`, `db/src/env.ts`

**Contract:** `DATABASE_URL`, `DB_POOL_MIN`, `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_DEBUG`, `JWT_SECRET`, `LOG_LEVEL` (and `TEST_DATABASE_URL` for the integration suite): their names, accepted values, defaults, and whether each is required at boot.

**Breaking:** renaming or removing a variable; making an optional one required; changing a default or narrowing the accepted values. An existing deployment would fail to boot or behave differently.

**Required path:** update `.env.example` in the same PR. For a rename, read the old name as a fallback for one release and log a deprecation warning. The app must still build and boot with no database reachable.

## 5. Public URLs — `packages/app/src/app/**/page.tsx`

**Contract:** the routes users reach directly or bookmark: `/` (marketing) and `/admin`, `/admin/users`.

**Breaking:** removing or moving a page that has shipped.

**Required path:** add a redirect from the old path (`next.config.ts` `redirects`) in the same PR.

## 6. Internal workspace contracts — `@mentio/*` package `exports`

These are not external contracts. They are listed because changing one silently breaks the other packages.

**Contract:** the `exports` subpaths of `@mentio/core`, `@mentio/db` and `@mentio/ui`, the dependency direction enforced in `eslint.config.mjs`, and event IDs (`concept.entity.action`) once `core/src/events` exists.

**Rule:** a rename or removal updates every importer in the same PR, and the full gate (typecheck, lint, build) proves it. Loosening the dependency direction needs a spec, per `AGENTS.md`. An event ID, once a listener depends on it, is renamed only together with every listener.
