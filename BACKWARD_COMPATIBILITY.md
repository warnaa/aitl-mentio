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

- `POST /api/payments/webhook` is a new deliberate non-enveloped exception: bounded raw signed body, plain 200 after durable handling, plain 400 for invalid input/signature, 503 for unavailable configuration/provider and 500 for transient processing failure. It is the only mutation with `apiHandler` CSRF disabled; Stripe's verified signature replaces browser-session authorization. Browser success/cancel redirects never mutate payment state.
- `GET /api/bookings?role=mentee|mentor` is a bounded role-and-owner-scoped participant projection (default mentee); `POST /api/bookings/[id]/checkout` is owned mentee-only. Operator payment review/reconciliation/resolution routes require a live operator session and standard CSRF on mutations.
- `GET /api/notifications` and `POST /api/notifications` are new, additive and session-scoped (any signed-in role, own rows only, standard envelope, central CSRF on the mutation). GET returns `{ unreadCount, items }` (at most 50, newest first, no addresses or user ids); POST takes `{ ids }` (1–50 uuids), changes only the caller's own unread rows and answers `{ updated }`, so a foreign id is indistinguishable from a read one. `GET /api/bookings?role=` is unchanged and remains the only sessions list; `/home` and `/mentor` render it as Upcoming and Past sections, and `/home?booked=<uuid>` only marks that booking.
- `GET /api/sessions/[bookingId]` and `POST /api/sessions/[bookingId]/messages` are new, additive and booking-scoped (E04-S01, #45). Any signed-in user may call them, and the service answers `404 not_found` to anyone who is not a party to a **confirmed** booking, so a stranger, an unknown id and an unconfirmed booking are indistinguishable. GET returns `{ booking, window: 'not_started'|'open'|'ended', serverNow, viewerRole, counterpartName, truncated, messages }` (the newest 500, oldest first, no addresses or user ids; 120 reads per account per minute). POST takes `{ body }` (trimmed, 1–4,000 characters, no NUL, unknown keys stripped), answers 201, `409 conflict` outside the booked window and `429` past 30 posts per account per minute; the CSRF header is enforced centrally. The window is derived from the booking (`startsAt` to `startsAt + lengthMinutes`), never stored. `/sessions/[bookingId]` is a new signed-in page (any role; the service decides) and `/sessions/:path*` joins the `proxy.ts` matcher.
- The written answer (E04-S02, #46) is additive. `GET /api/sessions/[bookingId]` gains `answer: { body, postedAt } | null` and `answerOwed` (true once the window ended with no answer); existing fields are unchanged. `PUT /api/sessions/[bookingId]/answer` is new: `{ body }` (trimmed, 1–20,000 characters, no NUL, unknown keys stripped), the booking's mentor only (`403 forbidden` for its mentee, `404 not_found` for anyone who is not a party, including the mentor of another booking), `409 conflict` before the start, no deadline after the end, 30 saves per account per minute, central CSRF. Each save replaces the answer; there is no history. `GET /api/notifications` items gain `sessionPath` and `kind` may now be `answer_posted`; a client that switched on `kind` must handle the new value.
- `GET /api/payments/report` is a new operator-only aggregate. It returns both weekly views, recorded-payment total and valid-timing median for one server-derived twelve-booking-week cohort in Europe/Warsaw. No participant/provider identities are returned; callback delivery cannot multiply a booking row. Both week definitions remain labelled observations rather than a selected official D16 metric.
- Starting Checkout changes the original unpaid hold once: its immutable 31-minute payment window ends at least 30 minutes before session start, and unresolved provider state retains occupancy until verified terminal resolution. Q1/Q2 were owner-approved on 2026-11-06. Existing unpaid holds without payment attempts retain their original 30-minute expiry. Expired history is retained rather than deleted. All booking/removal/public-availability consumers share the payment occupancy rule.

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
  *Breaking change recorded (E01, `.ai/specs/implemented/2026-09-04-accounts-and-roles.md`
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
- `POST /api/auth/register` (CSRF header required; `registerSchema` body
  `{ displayName, email, password, returnTo? }`) answers `{ ok: true, data: { email } }`
  once the verification mail is accepted — it sets no cookie — or 409 `conflict` (a
  verified account owns the address; the message says whether to sign in or use GitHub),
  422, 429 `rate_limited`, 503.
- `POST /api/auth/login` (CSRF header required; `loginSchema` body
  `{ email, password, returnTo? }`) sets `devmentor_session` and answers
  `{ ok: true, data: { redirectTo } }` (the sanitised `returnTo`, else the role home —
  not a `UserDto`, which the spec first named: the form only needs where to go), or,
  with no cookie, 401 `unauthorized` with the one message "Email or password is
  incorrect." for an unknown address and a wrong password alike, 403 `email_unverified`,
  422, 429, 503.
- `GET /api/auth/verify-email?token` is **browser-navigated** (302 only): a fresh
  verification sets `devmentor_session` and redirects to the sanitised `returnTo` or
  the role home; an already-verified account goes to `/sign-in?verified=1` with no
  session; a missing, invalid, expired or superseded token to
  `/sign-in?error=verification`; anything unexpected to
  `/sign-in?error=verification-unavailable`. Both reasons are rendered by `/sign-in`.
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

Platform settings add `platform_settings` (E05-S02, #50). It holds one row (`id` smallint checked `= 1`), four inclusive integer-cent price bounds (each minimum positive and at most its maximum), `fee_percent` smallint default 20 checked 0–100, `currency` checked `= 'PLN'`, `version` int default 0 and `updated_at`, and has a nullable `updated_by_id` foreign key to `users` with `on delete set null`. Migration `Migration20261109224703_platform_settings` is additive, inserts no row and has a down. No existing row changes. Rollback: run the down migration, which drops the table and the saved bounds and fee; the app returns to `PLATFORM_PRICE_BOUNDS` and 20 %. Copy the saved values into the env first if they should survive.

The text session adds `session_messages` (`booking_id` and `author_id` with restrictive foreign keys to `bookings` and `users`, a `body` text column checked to 1–4,000 characters, an index on `(booking_id, created_at, id)`). Migration `Migration20261107080310_sessions` is additive with a down; no existing row changes. Rollback: drop the table with the migration's down, which **permanently deletes every message exchanged in a session**; export them first if they are needed for a dispute. Session windows are derived from `bookings.starts_at` and `length_minutes`, so no existing column is reinterpreted.

The written answer adds nullable `bookings.written_answer` (text, at most 20,000 characters by check) and `bookings.written_answer_at` (timestamptz), checked to be both null or both set, and widens `notifications_kind_check` to allow `answer_posted`. Migration `Migration20261107113147_written_answer` is additive with a down; no existing row changes. Rollback order: run the down migration **first** (it deletes `answer_posted` notifications so older code never renders them as booking confirmations, then drops the two columns and **permanently deletes every written answer**), then revert the code.

Notifications add `notifications` (one row per user, kind and booking under a unique constraint so a replayed event is idempotent; nullable `read_at` and `email_sent_at`; restrictive foreign keys to `users` and `bookings`). The migration is additive with a down; no existing row changes. Rollback: stop the `bookings.booking.confirmed` consumer, then drop the table; past notifications are not regenerated.

Payments add `payment_attempts` (one immutable provider attempt per booking with submission/rejection counters and indexed reconciliation state), `processed_webhook_events` (unique event identity/outcome), and `payment_resolutions` (operator evidence/audit). Bookings gain nullable payment identity/amount/time fields and `payment_pending` default false. Existing rows remain unpaid. Preserve history and unique payment/session identities; use the generated reversible migrations. Before rollback, stop payment entry, reconcile all provider sessions and export payment/audit history; do not drop unresolved money records. See `docs/payments-operations.md`.

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

Operator platform settings (E05-S02, #50) leave `PLATFORM_CURRENCY` and `PLATFORM_PRICE_BOUNDS` unchanged, and they are still honoured while no `platform_settings` row exists. Once an operator saves, the row takes precedence over `PLATFORM_PRICE_BOUNDS`. The variables remain the seed and fallback values; removing them follows the required path below. No fee variable is added: the fee defaults to 20 % in code.

Payment configuration adds `PAYMENT_GATEWAY_ADAPTER` default `stripe`, optional `STRIPE_SECRET_KEY` and optional `STRIPE_WEBHOOK_SECRET`. Payment calls fail closed without required credentials. A mock requires both explicit `PAYMENT_GATEWAY_ADAPTER=mock` and `INTEGRATION_TEST_RUN=1`, matching the existing harness boundary. These app-only values do not alter db's connection schema; CI and child integration environments pin them to synthetic settings.

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

`payments:reconcile` is a new bounded CLI recovery entry point. An external scheduler must invoke it every minute before paid traffic is enabled. Existing command/job names remain unchanged. Unit commands now run the CI classifier's native Node suite explicitly before Vitest; Vitest excludes that native test file from its own incompatible discovery. No test assertion is skipped.

The root `package.json` scripts are this repository's command-line interface. They are
referenced by `README.md`, `AGENTS.md`, `.github/workflows/ci.yml`,
`.ai/agentic.config.json` (`validation.commands`), `SDLC.md`, `openmercato.toml`
(`scripts/preview.sh` runs `npm run dev`), and `tests/integration/run.sh` and
`run.ps1`. The CI job names `Build`, `Lint`, `Unit tests`, and `Integration tests` are
what the branch ruleset requires.

These names remain unchanged with documentation-aware CI: Lint always validates
instruction routes and change classification, while application steps/jobs skip
only for an explicitly documentation-only PR diff. Classification failures default
to the full suite. Workflow/configuration, MDX and unknown changes run all checks;
`.gitignore` is an explicit maintenance exception.

**Breaking:** renaming or removing a script; renaming a CI job.

**Required path:** update every reference above in the same PR; for a job rename, a
maintainer updates the ruleset before the PR merges, otherwise the PR blocks itself.

### 6. Domain events (`packages/core/src/events/event-map.ts`)

`bookings.booking.confirmed` adds `{ bookingId: string }`, emitted after the durable payment-confirmation transaction commits. The existing in-process emitter offers no durable downstream delivery; future consumers must not infer a notification queue or exactly-once external delivery from payment idempotency.

`bookings.booking.confirmed` now has an in-process consumer that writes one notification and sends one email per participant (best effort: a failing handler is logged and swallowed, a process crash between the payment commit and the consumer loses the notification, and there is no outbox or sweep yet). The payload and emission point are unchanged.

`sessions.answer.posted` adds `{ bookingId: string }` (no answer text, no user ids), emitted after every successful save of the written answer. Its in-process consumer writes at most one `answer_posted` notification for the mentee and claims the email atomically, so repeated or concurrent events send at most one successful email and a failed send is retried on the next save; a process that dies between the claim and the send leaves that email unsent, and a send that the provider accepted but reported as failed may be repeated once on the next save. Delivery is best effort like the confirmation consumer: no outbox, and a failure never fails the save.

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
semantics the integration tests assert on (the headings `Operator workspace` and
`Users`, the links `Users` and `View users`, the text `Connected`, the seeded table
cells and role lists, and the landing heading `Work through your code with a mentor.`);
Tailwind class choices and `dm-*` layout classes; and the placeholder
`User` and `MentorProfile` fields, which `README.md` describes as a demo model. Even
those change through migrations and tests, only without the breaking-change paperwork.

## Screen alignment with the prototype (#65)

The E01/E02 screens follow their prototype screens; routes, guards and API contracts
are unchanged. One component prop changed shape: `MentorProfileEditor`
(`@devmentor/ui`) now names its values like the mentor profile API (`bio` for
`description`, `stackTags` for `stacks`), makes `displayName` optional, and adds
`stackOptions`, `schema` and `externalFieldErrors`. Its in-repo consumers (the app
profile page, the prototype and the stories) were updated in the same PR. `PublicLayout`
(`./backend`), `PublishedDays`, `useViewerTimeZone` and the `RoleChips` `label` prop are
additive.

## E02 availability and pricing add new contracts

Slices 3 and 4 add protected slot collection/removal and mentor-price routes, explicit price/readiness/availability DTO fields, the typed availability publication event, approved PLN configuration defaults, and two reversible additive migrations. The new owner slot collection returns bounded `{ items, page, pageCount }` pages; public availability is capped at the next 50 times.

`MentorProfileServiceDeps` and `Cradle` now require `platformSettingsService`. All in-repository constructors and DI registrations are updated in the same change; these private workspaces are not published. Existing one-argument `toPublicDto(profile)` and `toOwnerDto(profile)` calls retain their legacy shape through overloads. HTTP reads supply authoritative settings to the additive projections. Currency changes after stored money exists require a data migration, not an environment-only change.

## E03 pending reservation contract

Issue #40 adds POST /api/bookings with the existing envelope, live mentee authorization and central CSRF convention. New reservations return 201; matching-owner retries recover the same pending hold with 200 without extending it. Duration and slot are the only accepted client inputs; prices and identities come from stored server state. Existing error codes are reused. Public slot DTOs add viableLengths while retaining existing fields.

The additive bookings migration has up/down. A partial unique slot index reserves only pending/confirmed rows; expired/cancelled rows remain history. Mentor locking prevents overlapping active intervals across different start times. Slot removal now answers 409 while an active booking occupies that exact slot. Rollback requires stopping booking writes and exporting history before dropping the new table; there are no existing-row rewrites. Payment and cancellation APIs remain out of scope.

### Operator platform settings (E05-S02)

Additive operator-only routes: `GET /api/operator/settings` returns `{ settings: { currency, priceBounds, feePercent, version, updatedAt, updatedBy }, outOfBounds: { total, mentors } }`. `PUT` takes `{ price25Min, price25Max, price50Min, price50Max, feePercent, version }`, with amounts as major-unit decimal strings. A refused save is 422 with `fieldErrors` and a stale `version` is 409. `/admin/settings` is a new operator page linked from the operator navigation. Inside `core`, `PlatformSettingsService.get()` and `boundsFor()` are now async and `PlatformSettings` gains `feePercent`. That service is not a public API, and every caller in this repository is updated. Price, readiness and booking behaviour under unchanged bounds is identical.

### Private session note decisions (E04-S04, slice B)

Additive routes: `POST /api/notes/[bookingId]/approve` takes `{ version }`; `POST /api/notes/[bookingId]/decline` takes `{ version, comment }` (1-2,000 characters, required: 422 with `fieldErrors.comment`). Mentee only (mentor 403, outsiders 404), 30/minute/account, private no-store. Only the latest `awaiting_approval` version can be decided; an identical replay succeeds, anything else is 409. Approved is final. `PUT /api/notes/[bookingId]` gains optional `expectedVersion`: starting a redraft on a declined note requires it to equal the declined version, and creates `version + 1`. `GET` now fills `history` with older versions, newest first. No public or list payload contains a note, and R02/D05 are unchanged: nothing is published.

`PUT /api/sessions/[bookingId]/answer` now returns 409 once the booking has an approved note; before approval it is unchanged. Events gain `notes.note.approved` and `notes.note.declined` (identifiers only), consumed in-process. `CrudForm` gains the optional `canSubmit` prop. `/admin/sessions` is a new operator page showing session start, party names and a count of declined versions; never a body or comment.

Migration `Migration20261108224443_note_decisions` adds `notifications.note_version` (0 for non-note kinds, backfilled to 1 for existing `note_awaiting_approval` rows), replaces `notifications_user_kind_booking_unique` with `notifications_user_kind_booking_version_unique`, and widens `Notification.kind` to `note_approved` and `note_declined`. Consumers switching on kind must accept both. Booking and answer notification uniqueness is unchanged.

Rollback: run this migration down before reverting code. It deletes `note_approved`, `note_declined` and later-version notifications, then restores the old identity. Note rows, including approved and declined versions, stay in `session_notes`; after a code rollback slice A treats a non-draft latest note as locked.

### Private session notes (E04-S03, slice A)

Additive routes: `GET /api/notes/[bookingId]` returns `{ current, history }` (empty history in slice A); `PUT` takes `{ body, expectedRevision: positive integer | null }`; `POST /api/notes/[bookingId]/send` takes `{ version, revision }`. Standard envelopes/CSRF and live sessions apply. All note responses, including errors, carry `Cache-Control: private, no-store`. Parties to a confirmed booking can read; only its mentor can write (mentee 403, outsiders/unknown/unconfirmed booking 404). Reads are limited to 120/minute/account, saves and sends to 30/minute/account independently.

`NoteDto` explicitly contains id, version, revision, body, status, declineComment, sentAt, decidedAt, updatedAt and `private: true`. No relation or address is serialized. Body is normalized plain text, 1–20,000 characters, NUL forbidden. No public/list projection changes. A written answer is required before drafting. Null expectedRevision is create-only; saves increment revision; send submits precisely the displayed saved revision and freezes its body. Awaiting-state Notify mentee replays that same submission without changing sentAt/revision/body.

New `session_notes` table has booking/version uniqueness, positive version/revision and state/date/body checks. It can represent the reviewed lifecycle, but this slice creates only draft and awaiting states. It supplies no approval/decline/redraft/operator counts or answer freeze. Migration `Migration20261107171237_session_notes` also widens Notification.kind to `note_awaiting_approval` without changing existing user/kind/booking uniqueness. `notes.note.sent` carries only bookingId/noteId/version, after commit. The system-scoped consumer validates the persisted sent version and creates one mentee notification, in-product only, preserving readAt on replay. The in-process bus is not guaranteed delivery; retry is explicit.

Rollback: protect new writes during maintenance, run migration down before reverting application code. Down deletes only note notifications before narrowing the kind check and drops session_notes, permanently losing drafts/submissions. Existing booking/answer notifications and booking/answer contracts stay intact. Backups/retention are existing operator responsibilities; this change provisions neither. Human QA and independent implementation review remain required before merge.
