# Backward compatibility

What this repository treats as a protected contract surface, what counts as a breaking
change to each, and the path such a change must take. Review skills check every PR
against this file; implementation skills warn when a change is not compliant. Humans
use it the same way.

The consumers of these surfaces are inside the repository today: the four workspace
packages consume each other as TypeScript source, the integration harness under
`tests/integration/` drives the running app, CI and the branch ruleset key on script
and job names, and the local tooling (`docker-compose.yml`, `openmercato.toml`,
`scripts/preview.sh`) keys on npm scripts. The packages are private (`0.1.0`,
unpublished), so there is no external semver to bump. "Breaking" therefore means: a
consumer listed below stops working, or an operator following `README.md` gets a
different result.

## General rule

Additive changes are free: a new optional field, a new export, a new route, a new
event, a new environment variable with a default. Everything else on a surface below is
a breaking change and follows the path in "How to make a breaking change" at the end.

## Surfaces

### 1. HTTP API (`packages/app/src/app/api/`)

**The envelope.** Every `/api/*` route built with `apiHandler` or `makeCrudRoute`
answers `{ ok: true, data }` or `{ ok: false, error: { code, message, fieldErrors?, retryAfterSeconds? } }`
(`retryAfterSeconds` only on a 429).
The shape is declared twice on purpose, in `packages/core/src/http/apiHandler.ts` and
`packages/ui/src/backend/api/types.ts`, because `ui` must not import `core`.

**Status and error codes**, from `packages/core/src/http/errors.ts` and `apiHandler.ts`:
400 `bad_request`, 401 `unauthorized`, 403 `forbidden`, 404 `not_found`,
409 `conflict`, 422 `validation_failed` (with `fieldErrors`, keyed by dotted path or
`_root`), 429 `rate_limited` (`TooManyRequestsError`: too many attempts in the rate-limit
window, with `retryAfterSeconds` in the envelope and a `Retry-After` header; the message never
says whether an email address has an account), 500 `internal_error`, 503 `service_unavailable` (`ServiceUnavailableError`:
a required integration or credential is missing, or an upstream timed out, failed or
answered non-2xx; see `fetchJson` in `outbound.ts`), the concept-owned 403
`email_unverified` (`EmailNotVerifiedError` in `services/auth/user.service.ts`: the password
was right, but the address has not been verified; never sent for a wrong password), the 403
`github_email_unverified` (`GithubEmailUnverifiedError` in
`services/auth/github-identity.port.ts`: the GitHub account has no verified primary
email), and the GitHub sign-in refusals thrown by `UserService.findOrCreateFromGithub`
(`services/auth/user.service.ts`): 403 `account_link_unverified`
(`UnverifiedAccountLinkError`: the email matches an account whose own address is not
verified, so nothing is linked) and 409 `github_account_conflict`
(`GithubAccountConflictError`: the verified account with that email is already linked to
a different GitHub account). An `AppError` may carry optional
`headers`, which `apiHandler` copies onto the response. The client adds
`network_error` and `invalid_response` in `apiCall.ts`.

**Routes in place:**

- `GET /api/health`: a plain JSON probe, not enveloped:
  `{ status: "ok", app, environment, database: "up" | "down", databaseError? }`, HTTP
  200 even when the database is down. `tests/integration/global-setup.ts` polls it and
  waits for `status === "ok"` and `database === "up"`; `README.md` documents it.
- `GET /api/users` returns `UserDto[]`, where
  `UserDto = { id, email, displayName, roles, githubLogin, avatarUrl, createdAt (ISO string), mentorProfile: { id, headline } | null }`
  (`roles` is the stored set in `ROLES` order; `UserDto` never carries `passwordHash`,
  `emailVerifiedAt`, `sessionVersion` or `githubId`). **Operators only** since E01: the
  route's `authorize` answers 401 `unauthorized` without a live session and 403
  `forbidden` without the `operator` role, before the service runs, and
  `UserService.list` repeats the check.
  *Breaking change recorded (E01, `.ai/specs/2026-09-04-accounts-and-roles.md`
  breaking changes 2 and 3):* the route was public before E01, and `POST /api/users`
  (`{ email, displayName }` → `UserDto`) has been **removed** — accounts are created by
  sign-in only. In-repo consumers: `admin/users/page.tsx` (client-side `apiCall`, moves
  under the operator page guard) and `tests/integration/setup.integration.test.ts`
  (fetches the route anonymously and must sign in as an operator first); the `POST` had
  no caller.
- `GET /api/auth/github` (`?returnTo&login`) and `GET /api/auth/github/callback`
  (`?code&state` / `?error`) are **browser-navigated**: they never answer JSON, only a
  302. The start route sets the `devmentor_oauth_state` cookie (HttpOnly, `SameSite=Lax`,
  `Secure` in production, `Path=/api/auth/github/callback`, 10 minutes) and redirects to
  GitHub; the callback always clears that cookie and, on success, sets
  `devmentor_session` and redirects to the sanitised `returnTo` or the role home
  (`homeFor`: `/admin`, `/mentor`, `/home`). Failures redirect to `/sign-in?cancelled=1`
  (the user cancelled on GitHub) or `/sign-in?error=` with one of the reasons
  `unavailable`, `state`, `email`, `unverified`, `conflict`
  (`packages/app/src/lib/sign-in.ts`, `SIGN_IN_ERRORS`) — the sign-in page renders
  them, so renaming or removing one is breaking. Own-site `Location`s are relative.
- `POST /api/auth/logout` (CSRF header required, no session required) answers
  `{ ok: true, data: null }` with the expiring `devmentor_session` cookie, and bumps
  `session_version` only when the request carries a live session. Past the CSRF check
  it never fails: if the session cannot be resolved (secret unset, database down) the
  failure is logged, the bump skipped, and the cookie still expired.
- `makeCrudRoute` behavior asserted by `packages/core/src/http/makeCrudRoute.test.ts`:
  the default id parameter `id`, and the messages "This operation is not supported",
  "Missing resource id", and "Request body must be valid JSON".

**Breaking:** removing or renaming a response field; changing a status code, an error
code, or the envelope shape; making a currently public route require a session without
shipping the client side of it; changing `/api/health` to return non-200 on database
loss (the file itself calls this out as an option; it also breaks the readiness poll).

**Required path:** change both envelope declarations together; update the unit tests
and the integration scenarios that assert on the route; update `README.md` where the
route is documented; list the change under "Breaking changes" in the PR body. A new
error code is additive as long as existing codes keep their meaning.

### 2. Workspace package exports

The `exports` maps in each `package.json` and the named exports behind them are the
API between packages. `npm run typecheck` is the consumer check.

- `@devmentor/core` (`.`, `./container`, `./services`, `./http`, `./events`,
  `./validators/*`): `getEnv`, `createLogger`, `getContainer`, `withScope`,
  `withRequestScope`, `withSessionCookieScope` (reserved for the app's page session
  helper), the `Cradle` keys (`env`, `logger`, `clock`, `orm`, `eventBus`,
  `sessionService`, `tokenService`, `passwordService`, `identity: GithubIdentityPort`, `em`,
  `userService`, `rateLimiter`, and the request-scoped `session: Promise<Session | null>`), the
  GitHub identity port (`GithubIdentityPort` with `authorizeUrl({ state, login? })`,
  `exchangeCode`, `fetchIdentity`; `GithubIdentity`, `AuthorizeUrlInput`,
  `GithubEmailUnverifiedError`, `GITHUB_CALLBACK_PATH`, `githubCallbackUrl`,
  `GITHUB_LOGIN_PATTERN`, `githubLoginHint`), the OAuth state cookie helpers
  (`OAUTH_STATE_COOKIE_NAME`, `OAUTH_STATE_COOKIE_PATH`, `OAUTH_STATE_PURPOSE`,
  `OAUTH_STATE_TTL_SECONDS`, `oauthStateCookie`, `clearOAuthStateCookie`,
  `readOAuthStateCookie`), `PasswordService` (`withHashingSlot(hasher => …)`) with
  `PasswordHasher`, the rate limiter (`RateLimiter` with `consume(key, policy)` and
  `consumeFor(policy, identifier | null)`, `RateLimitPolicy`, `rateLimitKey`, `clientIp`,
  and the policies `SIGN_IN_PER_IP`, `SIGN_IN_PER_EMAIL`, `REGISTER_PER_IP`,
  `VERIFICATION_MAIL_PER_EMAIL`), `homeFor(RoleSet)` and `ROLE_HOMES`, `readCookie`,
  `serializeCookie` and `CookieAttributes`,
  `Clock` and `systemClock`, `UserService` (`list`, `findByEmail`,
  `create(CreateUserInput)`, `findOrCreateFromGithub(GithubIdentity) → GithubSignIn`,
  `grantRole`/`revokeRole(userId, AssignableRole) → sessionVersion`,
  `endAllSessions(userId)`, `registerWithPassword(RegisterInput, RequestOrigin) → { email }`,
  `authenticateWithPassword(LoginInput, RequestOrigin) → GithubSignIn`,
  `verifyEmail(VerificationClaims) → EmailVerification`) with `UserDto`, `RequestOrigin`,
  `EmailVerification`, `EmailNotVerifiedError`, `INVALID_CREDENTIALS_MESSAGE`, the
  `EmailVerificationService` (`link`, `message`, `read`) with `VerificationClaims`,
  `EMAIL_VERIFY_PURPOSE` and `VERIFY_EMAIL_PATH`, the `Mailer` port with `MailMessage` and
  `MAIL_SENT_LOG_MESSAGE`, the shared schemas `validators/auth/register.schema`
  (`registerSchema`, `RegisterInput`) and `validators/auth/login.schema` (`loginSchema`,
  `LoginInput`),
  `CreateUserInput`, `GithubSignIn`, `UserServiceDeps`, `AssignableRole`,
  `ASSIGNABLE_ROLES`, `UnverifiedAccountLinkError` and `GithubAccountConflictError`, `SessionService` with `SessionClaims`, `IssuedSession`, `readSessionCookie`, `clearSessionCookie`,
  `SESSION_COOKIE_NAME` and `SESSION_TTL_SECONDS`, `TokenService` with
  `PurposeTokenInput`, the `AppError` family
  (with its optional `headers` and `retryAfterSeconds`, and `TooManyRequestsError`) and `isAppError`, `safeReturnTo`, `fetchJson`, `apiHandler`
  (with `ApiHandlerOptions`), `jsonOk`, `jsonError`, `makeCrudRoute` with `CrudService` and
  `MakeCrudRouteOptions`, `requireSession(req, cradle)`, `requireRole`,
  `requireCsrfHeader`, `assertOwnership`, `resolveRoles` with `RoleSource`, `ROLES`, `RoleSet`,
  `CSRF_HEADER_NAME`, `CSRF_HEADER_VALUE`, `Session` (`{ userId, roles }`, `roles` a
  non-empty `readonly [Role, ...Role[]]`), `Role` (`'mentee' | 'mentor' | 'operator'`), `EventBus`,
  `EventMap`, and the re-exported `checkDbConnection`.
  *Breaking change recorded (E01 breaking change 3):* `userCreateSchema` and
  `UserCreateInput` (`validators/auth/user-create.schema.ts`) were **removed** with
  `POST /api/users`; they had no in-repo consumer. `UserService.create` now takes the
  explicit `CreateUserInput` (`{ email, displayName }`) and cannot set roles.
- `@devmentor/db` (`.`, `./entities`, `./config`): `User`, `MentorProfile`, `IUser`,
  `IMentorProfile`, `baseProperties`, `entities`, `createOrmConfig`, `getOrm`,
  `closeOrm`, `checkDbConnection`, `getDbEnv`, `MikroORM`, `EntityManager`, and the
  re-exported `EntityRepository`, `UniqueConstraintViolationException`, `FilterQuery`,
  `Loaded`, `RequiredEntityData`.
- `@devmentor/ui` (`.`, `./backend`, `./tokens.css`, `./lib/utils`, `./components/*`):
  `cn`, `Button` and `buttonVariants`, the `Card*` family; from `./backend`:
  `apiCall`, `apiCallOrThrow`, `ApiError`, `ApiCallOptions`, `ApiResult`,
  `FieldErrors`, `CrudForm` with `CrudField`, `CrudFieldType`, `CrudFormProps`,
  `DataTable` with `Column`, `DataTableProps`, `DataTablePagination`,
  `LoadingMessage`, `ErrorMessage`, `EmptyState`; from `./tokens.css`: the CSS
  variable names (`--background`, `--foreground`, `--primary`, `--destructive`,
  `--border`, `--ring`, ...) that Tailwind utilities map onto.

**Breaking:** removing an export or a subpath; changing a function signature, a
component prop, or a `Cradle` key; changing the dependency direction
(`app -> core -> db`, `ui` standalone) enforced by `eslint.config.mjs`.

**Required path:** update every in-repo consumer in the same PR so `npm run typecheck`
and `npm run lint` stay green; keep the old name as a re-export for one PR only when
the change spans several concepts; note it in the PR body.

### 3. Database schema, migrations, and seed data (`packages/db/`)

- Tables: `users` (`id` uuid, `created_at`, `updated_at`, `email` unique,
  `display_name`, `roles` `text[]` default `{mentee}` under the `users_roles_check`
  constraint, `github_id` unique, `github_login`, `avatar_url`, `email_verified_at`,
  `session_version` default 0, `password_hash` `text` null — a self-describing scrypt
  hash, null for GitHub-only accounts), `auth_rate_limits` (`key` text primary key of the
  form `<scope>:<kind>:<sha256>`, `window_start` timestamptz indexed, `count` int; no id or
  timestamps — counters are disposable and may be truncated at any time) and `mentor_profiles` (`id`, timestamps, `user_id` unique with a
  cascading foreign key to `users`, `headline`, `bio` nullable,
  `years_of_experience` default 0). Column names are snake_case mappings of the
  camelCase entity properties.
- Migrations live in `packages/db/migrations/Migration<timestamp>.ts` next to the
  committed snapshot `.snapshot-devmentor.json`, run transactionally, and are
  generated with `npm run db:migration:create -- --name <x>`. `packages/db/src/config.ts`
  names the snapshot `.snapshot-devmentor`, so every migration command reads and writes
  that one file.
- The seeder `packages/db/src/seeders/database.seeder.ts` creates the mentor
  (`mock-mentor@devmentor.test`, `Ada Lovelace`, roles `mentor`) with a mentor profile
  (`Systems & algorithms mentor`), a mentee (`mock-mentee@devmentor.test`) and an
  operator who also holds `mentor` (`mock-operator@devmentor.test`), all with a verified
  email. The mentee and the operator also get the demo password `SEED_PASSWORD`
  (`devmentor-demo-password`), backfilled onto rows seeded earlier that have none; Ada
  stays GitHub-only. Addresses follow `<login>@devmentor.test` so the mock GitHub adapter links to
  them; a database seeded with Ada's pre-E01 `ada@devmentor.dev` row has that row
  adopted rather than duplicated. `tests/integration/admin.integration.test.ts`
  asserts on Ada's exact cells.

**Breaking:** dropping or renaming a table or column; tightening a constraint that
existing rows may violate; editing an already applied migration or the snapshot by
hand; changing the seeded values the integration test asserts on.

**Required path:** a new migration with both `up` and `down`, exercised in both
directions; a rollback plan in the PR body; renames as expand-then-contract (add the
new column, backfill, switch the code, drop the old column in a later PR); the seeder
and the integration test updated together; `risk-high` plus `needs-qa` per `SDLC.md`.

### 4. Configuration and environment

Variables, as listed in `.env.example`: `NODE_ENV`, `APP_NAME`, `LOG_LEVEL`,
`DATABASE_URL` (takes precedence), `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `DB_POOL_MIN`, `DB_POOL_MAX`, `DB_POOL_IDLE_MS`, `DB_DEBUG`. Two zod
schemas describe them, `packages/core/src/config/env.ts` for the app and
`packages/db/src/env.ts` for the MikroORM CLI, and they must agree. The harness sets
`NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`, and pool sizes in
`tests/integration/environment.ts`; `.github/workflows/ci.yml` sets
`NEXT_TELEMETRY_DISABLED`.

**Breaking:** a new variable without a default; renaming or removing a variable;
changing a default in a way that changes runtime behavior; dropping the
`DATABASE_URL` precedence.

**Required path:** both schemas, `.env.example`, `README.md`, the CI workflow, and the
harness environment updated in the same PR; a default wherever one is sensible.

### 5. npm scripts and CI check names

The root `package.json` scripts are this repository's command-line interface. They are
referenced by `README.md`, `AGENTS.md`, `.github/workflows/ci.yml`,
`.ai/agentic.config.json` (`validation.commands`), `SDLC.md`, `openmercato.toml`
(`scripts/preview.sh` runs `npm run dev`), and `tests/integration/run.sh` and
`run.ps1`. The CI job names `Build`, `Lint`, `Unit tests`, and `Integration tests` are
what the branch ruleset requires.

**Breaking:** renaming or removing a script; renaming a CI job.

**Required path:** update every reference above in the same PR; for a job rename, a
maintainer updates the ruleset before the PR merges, otherwise the PR blocks itself.

### 6. Domain events (`packages/core/src/events/event-map.ts`)

Event ids follow `concept.entity.action`. Today: `auth.user.created` with payload
`{ userId, email }`, and `auth.user.roles_changed` with payload
`{ userId, added: Role[], removed: Role[] }` (emitted by `grantRole`/`revokeRole` and by
operator-cache reconciliation), both subscribed in
`packages/core/src/container/container.ts`.

**Breaking:** renaming an event id; removing or retyping a payload field.

**Required path:** add the new event, move subscribers, remove the old event in a later
PR; adding a payload field is additive.

### 7. Session and CSRF conventions

The session cookie name `devmentor_session` lives in
`packages/core/src/services/auth/session.service.ts`; the `Role` union
(`'mentee' | 'mentor' | 'operator'`) is defined in
`packages/core/src/services/auth/roles.ts` and re-exported from
`packages/core/src/http/auth.ts`, where the `Session` shape (`{ userId, roles }`) and the
CSRF header name and value live. `apiCall` in
`packages/ui/src/backend/api/apiCall.ts` sends `x-devmentor-request: 1` on every
request, and `apiHandler` **enforces** it on every method other than GET, HEAD and
OPTIONS — so every mutating route, including `makeCrudRoute`'s `POST`/`PUT`/`DELETE`,
answers `403 forbidden` without it. The only opt-out, `apiHandler(logic, { csrf: false })`,
is reserved for the payment-webhook route. `requireSession(req, cradle)` verifies the
cookie, reloads the user, rejects a bumped `session_version`, and returns the stored
`mentee`/`mentor` roles with `operator` derived live from `OPERATOR_EMAILS`; when the
stored set disagrees it is reconciled (a de-listed operator-only account resolves to
`mentee`) without bumping `session_version`. `session_version` is bumped only by
sign-out and `grantRole`/`revokeRole`.

**Breaking:** renaming the cookie or the header, changing the header's value, changing
the `Role` values or the `Session` shape, or adding a CSRF opt-out other than the
webhook route.

**Required path:** change `core/src/http/auth.ts` and `ui/src/backend/api/apiCall.ts`
together, with an integration scenario covering the denied path.

### 8. Product decisions (`.ai/specs/product-brief.md`)

The Non-goals, Business rules, and Decisions tables carry stable ids, owners, and a
review-by date. A PR that builds what a non-goal excludes, or contradicts a rule or a
decision, is a review blocker unless the same PR carries a superseding entry approved
by the entry's owner. `SDLC.md` describes the mechanism.

## How to make a breaking change

1. Name the surface and the entry above in the PR body under a "Breaking changes"
   heading, and say who is affected and how they migrate.
2. Update this file in the same PR when the surface itself changes shape.
3. Update every in-repo consumer in the same PR; the validation gate
   (`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`) and the CI
   integration check are the proof.
4. Prefer expand-then-contract over a single cut for schema and export renames.
5. Label the PR `risk-high` where `SDLC.md` says so (schema migrations, shared
   contract surfaces, auth, money) and get a second reviewer.

## What is not protected

Internal, unexported helpers; the markup of the admin and public pages beyond the
semantics the integration tests assert on (the headings `Dashboard` and `Users`, the
link `Users`, the text `Connected`, the seeded table cells, and the landing heading
`Grow faster with the right mentor.`); Tailwind class choices; and the placeholder
`User` and `MentorProfile` fields, which `README.md` describes as a demo model. Even
those change through migrations and tests, only without the breaking-change paperwork.
