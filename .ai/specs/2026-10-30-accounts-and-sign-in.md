# Accounts and sign-in (E01-S01-T01)

Status: draft (gate answered and review corrections accepted 2026-10-30; not implemented; D23/D22 gates below remain)
Issue: #24 — task of story #14; also a prerequisite of #18 (E02-S01)
Design authority: `.ai/specs/product-brief.md` (D18, D19, D21, R15, D10; Key flows step 4)
Builds on: `2026-10-29-platform-primitives.md` (F1 Polish copy, F2 `loadPage`/`isSafeReturnTo`, B12 error codes, B13 role-scoped routes). Consumers: `2026-10-29-mentor-pages-and-discovery.md` (E01), `2026-10-29-book-and-pay.md` (E02)

## 📝 TLDR

**Who needs it:** mentors, who must sign in to publish a page, and mentees, who must sign in before paying (D18). **Today:** the repo has session helpers (`signSessionToken`, `requireSession`) but no way to create an account or sign in, and the session carries a single `student` role. **Proposed (future behavior):**
- A person registers with a name, email and password, and signs in and out. There is no email verification and no emailed reset (D18, D19).
- One account can hold several roles. The session carries a `roles` list (`mentee` always, plus `mentor` and, for operators, `admin`).
- Anyone can make themselves a mentor, at sign-up or later (needs D22; shipped last).
- `GET /api/users` and the `/admin` pages become admin-only in the same core-accounts PR that opens registration, because sign-up would otherwise expose every user's email to every account.
- Every screen is Polish (R15).

## 📝 Problem Statement

Nothing in the product can happen without an account: a mentor cannot publish a page (#14) and a mentee cannot pay (D18, E02). The only evidence against the account step is one interview: a mentee rejected "zakładam konto, weryfikacja maila" before getting help `[INTERVIEW]` 2026-09-01. D18 accepts that risk and D19 removes the email step, so the aim is the shortest credible sign-up: three fields, no verification, signed in straight away. Whether this loses mentees between the mentor page and payment is untested (D18's review trigger).

Sign-up also creates a new exposure: `GET /api/users` returns every user's email to any session today. `/admin` is already publicly reachable, including its server-rendered user count. The core-accounts PR protects both the API and the pages before opening registration.

## 📝 Proposed Solution

One concept, `auth`, following the folder convention. `AuthService` becomes the single writer of credentials and roles; the existing `UserService` stays read-only (list/count for `/admin`).

- **Credentials:** email and password, hashed with bcrypt at cost 12 (`bcryptjs`, behind `core/src/lib/password.ts`, the only importer). No OAuth, MFA or magic links.
  - Why `bcryptjs`: no native build in CI or on the host, and the standards allow either. The price is event-loop time (about 0.25 s per hash at cost 12), bounded by the rate limits below.
  - Native `bcrypt` can reuse this boundary. Adopting argon2id later also needs a reviewed storage-length change, validation policy, compatibility with existing bcrypt hashes, and a rehashing policy. No algorithm-selection framework is added now.
- **Session:** unchanged mechanism (AGENTS.md security baseline): HS256 JWT, `JWT_SECRET` of at least 32 bytes, 24 hours, no refresh flow, cookie `mentio_session` (`httpOnly`, `sameSite=lax`, `secure` in production). The claims change from `role` to `roles` (gate Q1 = a). Registration and login sign the user in immediately.
- **Roles (Q1 = a):** the user row stores `roles`, always containing `mentee`. A session carries a copy. Script changes become visible at the next password sign-in or mentor-enrollment token replacement, and old tokens expire at their original deadline (at most 24 hours after sign-in). Role mutations lock the user row inside a transaction; responses and new claims use the roles read and committed there, never a role array from the request or old token. To cut off every session at once, rotate `JWT_SECRET`.
- **Becoming a mentor (Q2 = a, Phase 2):** `POST /api/auth/mentor` adds the role and replaces the cookie without extending the original token's expiry. This also applies to an existing mentor's no-op. Registration with `asMentor: true` creates the initial roles atomically with the account. The variant `/rejestracja?jako=mentor` is chosen by the URL, so no new `CrudForm` field kind is needed (the `checkbox` kind stays with #17).
- **Admin (Q3 = a):** `admin` is a third role, granted only by an operator script. `/api/users` uses B13 (`access: { role: "admin" }`), and the `/admin` pages guard in their loaders (F2).
- **No verification, no reset (Q4 = a):** an address is not verified and never emailed. A forgotten password is reset by the operator script, which sets a generated password and prints it once. There is no change-password screen (out of scope, see Risks).
- **Rate limits (Q5 = a):** a process-memory limiter (below). Counters reset on restart and are not shared between instances; this is stated in `AGENTS.md`.
- **Sign-up reveals taken addresses (Q6 = a):** register answers `409 email_taken`; login stays generic ("Nieprawidłowy e-mail lub hasło") and runs a dummy bcrypt compare for unknown or password-less accounts so timing does not give the answer away. This departs from the AGENTS.md line "auth error messages stay generic" for sign-up only; it is carried as decision D23 (below) and the line is amended in the same PR.
- **Alternatives considered:**
  - Server Actions for the forms (the Next.js auth guide's default): rejected, because the project routes every mutation through `apiHandler` (CSRF header, error envelope) and `apiCall`.
  - DB-backed sessions (revocable, no stale roles): rejected for now; they would need a table and a read per request, against the standards' stateless-JWT baseline.
  - Re-reading roles from the database for admin checks: rejected as unneeded with one operator; it is the follow-up if admin ever has more than one holder.
  - Sign in with GitHub for mentors (their public work lives there): out of scope; the cheapest follow-up if sign-up friction shows up in A02.

### Research

- **Auth.js, Clerk, better-auth, Cal.com, Topmate (prior knowledge, not re-checked):** OAuth, verification and emailed recovery are common capabilities deliberately omitted here (D18, D19). This comparison is context, not evidence supporting the chosen policy.
- **OWASP (checked during review on 2026-10-30):** [password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) prefers argon2id and documents bcrypt's 72-byte input limit. The project fixes bcrypt at cost 12 or more. Enforce its byte maximum separately from the character minimum, without truncation. [Authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) supports throttling; the exact counters and timing estimates below remain unmeasured proposals.
- **Session revocation:** this design has no per-token revocation state; individual tokens remain usable until expiry. Adding per-user or per-session revocation would require a reviewed server-side state/check. The accepted window remains at most 24 hours from credential sign-in.

## 📝 Architecture

| Layer | `auth` |
|---|---|
| db | `entities/auth/user.entity.ts` (`User`: two columns added); `db/src/errors.ts` (`isUniqueViolation`, so `core` can recognise a unique violation without importing MikroORM) |
| core lib (client-safe) | `lib/roles.ts` (`ROLES`, `Role`, `hasRole`), `lib/return-to.ts` (`isSafeReturnTo`); redirect fallback is the literal `/` until a consumer needs another destination |
| core lib (server) | `lib/password.ts` (`hashPassword`, `verifyPassword`, lazy `dummyHash`), `lib/rate-limit.ts` (`RateLimiter`), `lib/client-key.ts` (`getClientKey`) |
| core http | `auth.ts` (roles in `Session`, `verifySessionToken`, `sessionCookieHeader`, `clearedSessionCookieHeader`), `errors.ts` (B12 codes, `TooManyRequestsError`), `apiHandler.ts` (response headers, `Retry-After`), `makeCrudRoute.ts` (B13) |
| core validators | `validators/auth/register.schema.ts`, `login.schema.ts`, plus `email.ts`/`password.ts` pieces |
| core services | `services/auth/auth.service.ts` (`AuthService`: `register`, `login`, `becomeMentor`, and operator methods `grantRole`, `revokeRole`, `resetPassword`); `services/auth/auth.limits.ts` (`AUTH_RATE_LIMITS`); `services/auth/user.service.ts` unchanged |
| core cli | `cli/user-admin.ts` (`runUserAdmin`) plus a thin entry file |
| app API | `api/auth/register/route.ts`, `login/route.ts`, `logout/route.ts`, `mentor/route.ts` (Phase 2); `api/users/route.ts` guarded |
| app pages | `(auth)/logowanie/page.tsx`, `(auth)/rejestracja/page.tsx`, `(auth)/zostan-mentorem/page.tsx` (Phase 2); `app/src/server/session.ts`, `load-page.ts` (F2); `not-found.tsx`, `error.tsx` |
| app components | `app/src/components/auth/account-nav.tsx` (server), `logout-button.tsx` (client), shared by the `(marketing)` and `(auth)` layouts |

**Dependencies, one way only:**
- `AuthService` takes `em`, `passwordHasher`, `authRateLimiter` and `logger` from the cradle. It never depends on `UserService` or on any later concept's service.
- `passwordHasher` (an object around `lib/password.ts`) and `authRateLimiter` (a `RateLimiter` instance) are process-wide `asValue` registrations. `authService` is `.scoped()`, because it touches `em`.
- The routes sign the token (`signSessionToken`) and set the cookie; the service never builds HTTP responses, and returns DTOs only.
- Verified `Session` is `{ userId, roles, expiresAt }`, where `expiresAt` is the required JWT `exp` in integer epoch seconds. `signSessionToken({ userId, roles }, { expiresAt? })` creates a fresh 24-hour deadline only for credential sign-in/registration; mentor replacement supplies the verified original deadline explicitly. Reject an expired deadline, including one crossed during the service call, before signing. The replacement cookie's `maxAge` is no greater than the remaining lifetime. Account DTOs do not expose `expiresAt`.

**What later work relies on:**
- E01 and E02 call `requireRole(session, "mentor" | "mentee")` and `loadPage({ role, returnTo })` exactly as their specs already assume. Their signatures do not change.
- `Session.userId` is the owner key for B5 lookups.
- E01 #14 introduces role-aware redirect selection when `/mentor/strona` exists; no role-dependent landing helper is built before then.

## 📝 Data Model

**`User`** — table `users`, concept `auth` (two columns added; no new table, no new relation).

| Property / column | Type | Notes |
|---|---|---|
| `passwordHash` / `password_hash` | `varchar(60)`, nullable | bcrypt `$2b$12$…` (always 60 characters). Null means the account cannot sign in (rows that predate this spec, or a cleared password). Never in any DTO, never logged (already in `REDACTED_PATHS`) |
| `roles` / `roles` | `jsonb` (`string[]`), not null, default `["mentee"]` | values from `ROLES` (`mentee`, `mentor`, `admin`); always contains `mentee`; written only by `AuthService`, which enforces that in code. Existing rows become `["mentee"]` |

- **Email:** `email` (`varchar(320)`, unique `users_email_unique`) is trimmed and lower-cased on every service write and lookup, including operator commands. The migration first checks the canonical forms of all existing emails for collisions, then normalizes them, and adds a named `users_email_canonical_check` requiring stored emails to equal that canonical form. Together with the existing unique constraint, this enforces canonical uniqueness even for a future writer. Service normalization, migration normalization and the check must agree on casing and surrounding whitespace; tests include uppercase, spaces and tabs/newlines. If canonicalization would collide, abort the migration atomically with a diagnostic identifying row IDs only; an operator must resolve ownership deliberately before retrying. Never merge or delete accounts automatically.
- **Role writes:** `grantRole`, `revokeRole` and `becomeMentor` use `em.transactional` and a pessimistic write lock on the `User` row before reading/modifying `roles`. Use `LockMode` re-exported by `db` (B7). Only the locked current array is changed; no whole-array write based on a pre-lock read. A fresh account's initial roles are inserted with the account. No role table or generic permission engine is introduced.
- **Legacy rows:** users with no hash (the integration seeds, any development data) cannot sign in. `register` with their address answers `email_taken`, so an unclaimed row cannot be taken over by signing up. The operator script sets a password.
- **Sensitive data:**
  - Passwords are never stored or logged; only the bcrypt hash is.
  - `AccountDto` has exactly `id, email, name, roles` (key-set test, as B6 does for later DTOs). `UserDto` keeps its current key set, and a test asserts `passwordHash` and `roles` stay out of the admin list.
  - A unique-violation error is mapped before it can be logged; a test provokes an unexpected database error during register and asserts that neither the password nor the hash reaches the log destination.
- **Migration:** one atomic migration adds the two columns, normalizes legacy emails after collision preflight, and adds the canonical-email check. Generate and review it with the entity and `.snapshot-mentio.json`. A hand-written `down()` drops the check and both new columns; email normalization is retained, since the original spelling is not recoverable. Rolling back loses every stored password hash and role; acceptable before launch and stated in the PR's rollback plan. `tests/integration/migrations.test.ts` uses a throwaway database on the same server and the real CLI up → down → up, checking columns, defaults, normalization, constraint rejection and collision rollback. E01 extends this harness for its migrations.
- **Graph:** the change is two columns on an existing entity, with no new relation, so no data-model graph is generated.

## 📝 API Contracts

All routes are `force-dynamic` and go through `apiHandler`, so the CSRF header is checked first on every unsafe method, including login and register. Bodies go through Zod (`parseJsonBody`), and only parsed output reaches the service. Responses carry `Cache-Control: no-store`. Before any database work, each route that signs a token calls `getJwtSecret()`, so a missing `JWT_SECRET` fails with a `ConfigError` (unexposed `500`) rather than after an account was created.

**DTO:** `AccountDto` = `{ id, email, name, roles }`. It is returned only to the account's owner.

| Method & path | Phase | Body | Success | Failures |
|---|---|---|---|---|
| `POST /api/auth/register` | 1 | `{ email, password, name }` | `201 AccountDto` + `Set-Cookie` | `400 validation_error` with `fieldErrors`; `409 email_taken` with `fieldErrors.email`; `429 too_many_attempts` + `Retry-After` |
| `POST /api/auth/login` | 1 | `{ email, password }` | `200 AccountDto` + `Set-Cookie` | `401 invalid_credentials` (the same for an unknown email, a wrong password and a password-less account); `400`; `429` |
| `POST /api/auth/logout` | 1 | — | `200 {}` + a cleared cookie; idempotent, works signed out | CSRF `403` |
| `POST /api/auth/mentor` | 2 | — | `200 AccountDto` from committed roles + replacement cookie preserving the original `exp`; role mutation is a no-op for an existing mentor | `401` without a valid, unexpired session |
| `GET /api/users` | 1 | — (query as today) | as today | `401` without a session; `403` for a session without `admin` |

- **Register (Phase 2 adds `asMentor?: boolean`):** the schema takes only these fields, so a client can never send `roles`. `asMentor` is the only way to the `mentor` role through this route.
- **Taken-email error:** `ConflictError` accepts optional `code` and `fieldErrors` while retaining existing defaults. Registration throws `code: "email_taken"` and `fieldErrors: { email: ["Ten adres e-mail jest już zajęty"] }`; `apiHandler` preserves them and `CrudForm` renders the email error without a second code-to-field mapping.
- **Validation (all messages Polish, F1):**
  - `email`: trimmed, lower-cased, a valid address, at most 320 characters.
  - Registration `password`: at least 10 Unicode code points (`Array.from(value).length`), and at most 72 UTF-8 bytes (`TextEncoder`, also in the browser). Do not trim, normalize or truncate passwords. No composition rules. Copy distinguishes the character minimum from the byte maximum; Polish letters may take two bytes, and other characters may take more.
  - `name`: trimmed, 1 to 80 characters. 80 matches the mentor page's display name (E01), which is pre-filled from it.
  - Login: `password` is a nonempty string with at most 72 UTF-8 bytes; there is no registration minimum. Overlong input gives `400 validation_error` with a Polish password field error, identically in the form and API. A bounded but incorrect password gives generic `401 invalid_credentials`. The password helper also refuses overlong input before bcrypt; it never truncates.
- **Rate limits** (`AUTH_RATE_LIMITS`, one constant in `services/auth/auth.limits.ts`; fixed windows; checked before any hashing; agent proposals with no research basis, cheap to change):

| Bucket | Key | Limit | Window | Counts |
|---|---|---|---|---|
| login by email | normalised email | 5 | 15 min | every admitted attempt, including success; no reset on success |
| login by client | `getClientKey(req)` | 20 | 15 min | every admitted attempt, including success |
| register by email | normalised email | 3 | 1 h | every admitted attempt |
| register by client | `getClientKey(req)` | 10 | 1 h | every admitted attempt |

  - After body validation and before database lookup or hashing, admission synchronously checks every applicable bucket and increments all of them only if all permit the attempt; no `await` occurs between checking and incrementing. At the stated limit, refuse the next attempt with `429 too_many_attempts` ("Zbyt wiele prób. Spróbuj ponownie za N minut.") and `Retry-After` (integer seconds). Refusals do not increment or extend windows. Count every admitted attempt to avoid failure-completion bookkeeping and concurrent-check bypasses. Success does not reset counters.
  - `getClientKey` reads the header named by the new optional env `TRUSTED_IP_HEADER` (unset by default; for `x-forwarded-for` it takes the last entry, the one added by our own proxy). Next route handlers expose no socket address and the headers are spoofable, so with the variable unset the two client buckets are skipped and only the per-email buckets apply. Document it in `.env.example`.
  - The client buckets stay even though they are inactive by default: Q6 = a lets sign-up reveal taken addresses, and only a per-client limit slows someone probing many addresses (the per-email buckets cannot). Deployments behind a proxy should set the variable.
  - Each bucket map is capped at 10,000 keys. Drop expired entries before admission, but never evict a live entry. If a full map would need a new key, refuse admission with the same `429` and a `Retry-After` until its earliest expiry. Existing keys continue under their own budgets. When several checks deny admission, use the longest applicable wait. The all-or-nothing admission check must include capacity, so a refusal never partially consumes another bucket. Test concurrent same-email admission and saturation while a target email remains locked.
  - Trade-off: the per-email login bucket lets someone lock a known address out for 15 minutes. That denies a login, never grants one, and is accepted.

## 📝 UI/UX

All copy is Polish (R15, F1). The sign-in and sign-up pages are in an `(auth)` route group and use `CrudForm` from `@mentio/ui` (reuse over a second form implementation); the layout header is plain Tailwind. This applies the E01 precedent (gate Q5 = a) to `(auth)`; `AGENTS.md` gets a line saying so.

- **`/logowanie`** (`LogowaniePage`): fields "Adres e-mail" (`autoComplete="username"`) and "Hasło" (`current-password`); submit "Zaloguj się"; a link "Nie masz konta? Zarejestruj się". The page reads `?returnTo=`, validates it with `isSafeReturnTo`, and after success goes to it (else `/`), then `router.refresh()`. A signed-in visitor is redirected immediately to the same target instead of seeing the form. Preserve validated `returnTo` when switching between login and registration.
- **`/rejestracja`** (`RejestracjaPage`): fields "Imię i nazwisko", "Adres e-mail", "Hasło" (`new-password`; help text "Co najmniej 10 znaków, maksymalnie 72 bajty UTF-8. Polskie litery mogą zajmować 2 bajty, inne znaki więcej."); submit "Załóż konto"; a link to sign-in. It honours `returnTo` the same way, and a signed-in visitor is redirected away. The field error for a taken address reads "Ten adres e-mail jest już zajęty". The server `fieldErrors` appear under their fields through `CrudForm`; a `429` shows its message in the form's `role="alert"` line.
- **Phase 2:** `/rejestracja?jako=mentor` shows "Załóż konto mentora" and posts `asMentor: true`. For a signed-in non-mentor it redirects to `/zostan-mentorem` (`loadPage({ role: "mentee", returnTo })`), which shows one button, "Zostań mentorem", and sends the user on to validated `returnTo` (else `/`) after success. A signed-in mentor skips the form and uses the same target. If the session expires during enrollment, send the user to sign-in with `returnTo`; a committed role addition is retained and is idempotent on retry.
- **Header (`AccountNav`):** inside `<Suspense>` in the `(marketing)` and `(auth)` layouts.
  - It only checks that the session cookie is present (an optimistic UI hint, never an authorization): signed out shows "Zaloguj się" and "Załóż konto"; signed in shows a "Wyloguj się" button.
  - No JWT is verified there, so a missing `JWT_SECRET` or a bad cookie cannot break the public pages.
  - It makes those routes dynamic, which is already the rule for pages that touch the session.
  - Logout calls `POST /api/auth/logout` through `apiCall`, then `router.refresh()`.
  - The header shows no name: the token carries an id, roles and session timestamps, and showing a name would cost a database read on public pages.
  - The header and the pages can disagree: a stale or old-format cookie makes the header show "Wyloguj się" while `/logowanie` shows the form. This is harmless; "Wyloguj się" clears the cookie, which is the recovery path, and a test covers it.
- **Admin pages:** `admin/page.tsx` and `admin/users/page.tsx` call `loadPage({ role: "admin", returnTo })` in their own loaders; `admin/layout.tsx` stays presentational (layouts do not re-run on client navigation, F2). A signed-out visitor is sent to `/logowanie?returnTo=…`; a signed-in non-admin gets the Polish 404.
- **Accessibility:** field errors are linked by `aria-describedby` (`CrudForm`), failures are announced with `role="alert"`, and the autocomplete attributes let password managers work.
- **Prototype:** none accepted.

## 📝 Edge Cases & Failure Scenarios

- **Two registrations with the same address at once:** the unique constraint decides; one gets `201`, the other `409 email_taken`. The violation is mapped outside any transaction (a violation aborts a Postgres transaction). Concurrency integration test.
- **Mixed-case or padded email** (`" Ada@Example.COM "`): normalised, so it matches the existing account and cannot create a duplicate.
- **Register with a password-less legacy address:** `409 email_taken`; no takeover.
- **Login to a password-less or unknown account:** the same `401 invalid_credentials` after a dummy compare. A unit test asserts the dummy compare runs in both cases.
- **Password boundaries:** fewer than 10 code points fails registration even when the value has 10 or more UTF-8 bytes; a password over 72 bytes gives `400 validation_error` at both registration and login. Validated passwords are never truncated. Test five Polish letters, ten Polish letters, emoji, and the exact byte boundary through form → API validation.
- **`JWT_SECRET` unset:** register, login and the mentor route fail with the unexposed `500` before writing anything; guarded pages give the 500 page (never "signed out", F2); public pages keep working (the header does not verify).
- **Old-format or forged token** (a `role` claim, a missing `roles`, a bad signature, expiry): `401`, and on pages a redirect to sign-in. A test signs a legacy-shaped token to prove it fails closed.
- **`returnTo` tricks** (`//evil.test`, `/\evil.test`, `%2F%2Fevil.test`, control characters, absolute URLs, a very long value): `isSafeReturnTo` is false, so the user lands on `/`. It is checked where produced (F2 redirect) and again where consumed (sign-in form).
- **Login CSRF** (an attacker's form signing the victim into the attacker's account): the custom header is required on login and register too, and a cross-site form cannot set it.
- **Double submit:** `CrudForm` disables the button while submitting; the server's unique constraint makes a duplicate register harmless.
- **Rate limit hit by a legitimate user:** a clear Polish message with the wait time; successful logins consume the same fixed-window budget and never reset it. Simultaneous requests cannot admit more than that budget. Map saturation rejects new keys without removing existing lockouts.
- **Several instances or a restart:** counters are per process and reset (Q5 = a). The `AGENTS.md` note says a shared store is required before real traffic.
- **A role change while signed in** (granted `mentor` by the script, `admin` revoked): an old token keeps its roles until its original expiry. Password sign-in or mentor enrollment obtains a new snapshot from committed roles; enrollment preserves the deadline. The script prints this limitation. Concurrent role mutations serialize on the user row; test mentor enrollment racing admin revocation in both orders, with no stale role restored.
- **Enrollment near expiry:** first-time enrollment and repeated no-ops preserve the original `exp`, and the replacement cookie expires no later. If the deadline passes during the transaction, do not issue another token; return `401` and require sign-in. The role may already be committed, which is safe to retry.
- **Database unreachable:** register and login give the generic Polish error through `apiHandler`; guarded pages give the error page; the app still builds and boots.
- **Logging a failed register:** the unexpected-error path logs `err`; the redaction list already covers `password` and `passwordHash`, and the test above covers the rest.
- **Signed-in user opens `/logowanie` or `/rejestracja`:** redirected, no form shown. Signing in as a different user means logging out first.
- **Cookie on `http://localhost` in the browser tests:** the `Secure` flag applies in production builds; Chrome accepts Secure cookies on localhost, and the Phase 1 Stage B browser test verifies it (see Risks).

## 📝 Risks & Impact Review

- **`risk-high` per `SDLC.md`** (authentication and sessions, a schema migration). Each PR carries its evidence: denied-path and wrong-scope integration tests, a migration up/down test with a rollback plan, a second reviewer, and `needs-qa` with no self-QA.
- **D23 blocks Phase 1** (below): sign-up revealing a taken address departs from the generic-auth-error baseline in `AGENTS.md` and the engineering standards. D23 also records the no-verification/operator-reset policy. Damian must enter this decision before Phase 1 implementation starts.
- **D22 blocks Phase 2.** The self-service mentor path goes further than E01's wording ("any account with the `mentor` role may publish"): it lets anyone give themselves the role. D22 must say so. If Damian declines, Phase 2 is archived and mentor access is granted by the operator script; core accounts (Phase 1) are unaffected. Acceptance of the technical review corrections does not approve D22 or D23.
- **Unverified addresses:**
  - Anyone can register with someone else's address, which only costs that person the ability to register it (squatting). Nothing is ever sent to the address (D19), so no one is harassed.
  - When real Stripe arrives (D14), receipts and payouts make verification necessary; the spec for that change must revisit this.
- **Impersonation by a mentor account:** anyone can register as a mentor under any display name. This spec cannot stop it; E01's required public-work links (N02) and the invited first batch are the only controls. Counting A02 must separate invited mentors from others.
- **No change-password screen:** the reset script sets a generated password that the user keeps. Acceptable for an invited, mock build; it is the first follow-up if mentors ask.
- **In-memory limiter:** ineffective across instances and resets on restart; without `TRUSTED_IP_HEADER` there is no per-client limit at all, so address probing through `email_taken` is only slowed per address. Accepted for the mock build; stated in `AGENTS.md`.
- **Stale roles for up to 24 hours,** including a revoked `admin`. Mitigation: rotate `JWT_SECRET`. A follow-up (DB sessions or re-reading admin from the database) is needed before more than one operator exists.
- **bcryptjs CPU:** about 0.25 s of event-loop time per hash or compare. The limits bound it per address and, when configured, per client; a distributed attack on `/api/auth/login` could still stall a single process. Revisit with the native `bcrypt` or argon2id if load tests show it.
- **One deployable core-accounts PR.** Phase 1 includes the backend, operator tools, sign-in/up pages, header and admin guards. Its backend and UI stages are internal work units, not separate PRs or deployments. Registration never ships ahead of the page/API guards or a working browser sign-in path. Phase 2 remains an independent mentor-enrollment PR after its decision gate.
- **Changes to the reference implementation:** `AGENTS.md` calls `User` (`api/users` via `makeCrudRoute`) the reference example; it now needs `access: { role: "admin" }`, and its description is updated.
- **Rollback:** revert each phase as one deployment unit. Phase 1's migration `down()` removes the canonical-email check and two new columns, losing credentials and roles but retaining normalized email spelling. The changed session claims force logout on deployment and rollback; the PR states this explicitly and requires a second review under `BACKWARD_COMPATIBILITY.md`.

## 📝 Decisions in play

- Relies on: D18 (sign in before paying), D19 (nothing emailed), D21 (`mentee`), D10 and R15 (Polish), D13 (mock build), D14 (real Stripe later), N02 (public work, for the impersonation note).
- **Gate answers recorded (2026-10-30):** Q1 = a (a `roles` list), Q2 = a (self-service mentor), Q3 = a (an `admin` role granted by script), Q4 = a (no verification, no reset by email), Q5 = a (in-memory limiter), Q6 = a (sign-up says "taken"), Q7 = a (keep self-service mentor in this spec as the last phase, although it is independently deployable; the spec moves to `implemented/` only once D22 is decided).
- **Technical review corrections accepted (2026-10-30):** preserve authentication deadlines on token replacement; count every admitted attempt synchronously and retain active limiter entries; migrate/enforce canonical email identity; serialize role writes; separate password code-point minimum and byte maximum, with overlong login input returning `400`; transport taken-email field errors explicitly. Merge backend and UI into one core-accounts PR and defer a role-dependent landing helper until another destination exists. These supersede the earlier technical proposals; D23/D22 remain owner gates.
- **Proposed new brief rows, owned by Damian:**
  - **D22 (Phase 2, ⛔ blocks that phase):** the E01 spec's proposed row, reworded to: "anyone may register as a mentor, or add the mentor role to their account, and publish a page on the mock build". It supersedes or clarifies D14's "invited mentors".
  - **D23 (Phase 1, ⛔ blocks implementation):** "Accounts use email and password with no email verification and no emailed reset; a forgotten password is reset by the operator; registration says when an address is taken, while login stays generic." This amends the AGENTS.md line on generic auth errors for sign-up only. Chosen at this spec's gate (Q4 = a, Q6 = a).
  - **Technical defaults resolved by the accepted corrections:** password minimum 10 Unicode code points and maximum 72 UTF-8 bytes; all-attempt fixed-window limits as tabled; an 80-character name limit. No password-policy change is applied to existing hashes silently.
- **Product choices recorded here, no brief row:** the `/logowanie`, `/rejestracja` and `/zostan-mentorem` paths; the header shows no name.

## 📝 Cross-spec alignment and implementation documentation

The platform and E01 spec ownership changes below are applied with these accepted corrections. Product decision rows and implementation documentation remain tasks for their stated gate or implementation PR; this document does not mark them shipped.

| Where | Change |
|---|---|
| Platform primitives, B12 | First consumer becomes accounts Phase 1: optional `code` and `fieldErrors` on `ConflictError` (`email_taken`), optional `code` on `UnauthorizedError` (`invalid_credentials`), plus `TooManyRequestsError`. E01 #14 step 2 adds `code` to the remaining classes it needs |
| Platform primitives, B13 | First consumer becomes accounts Phase 1 (`/api/users`, role `admin`); E01 #16 step 3 uses it instead of building it |
| Platform primitives, B7 | `db/src/errors.ts` `isUniqueViolation` and the `LockMode` re-export are built here for registration and role locks; E01 #14 adds `persistence/conflicts.ts` |
| E01 spec, Phase 1 step 1 | `tests/integration/migrations.test.ts` is created by accounts Phase 1 for its own migration; E01 extends it rather than creating it |
| E02 spec, account dependency and auth tests | Depends on core accounts Phase 1. Every valid session has `mentee`, including mentors; test mentors booking another mentor's slot, owner denials and self-booking refusal rather than an impossible authenticated mentor-only denial |
| Platform primitives, F2 | Session type becomes `{ userId, roles, expiresAt }`; `PageAccess` unchanged. Platform Phase 2 is delivered inside this spec's combined Phase 1; fallback stays `/` until another destination is implemented |
| Product brief | Enter D22 (reworded) and D23; the Next line about the accounts spec is done |
| `AGENTS.md` | `(student)/` → `(mentee)/`; roles and `admin`; the amended generic-error line (sign-up may say "taken"); the in-memory limiter and `TRUSTED_IP_HEADER`; `(auth)` uses `CrudForm`; pages read through `loadPage`; the users route's new `access`; the operator commands |
| `.env.example` | `TRUSTED_IP_HEADER` |

## 📋 Phasing

0. **Prerequisites:** platform Phase 1a (Polish copy, the `z` locale and `formatDay`) is merged. Phase 1 does not start until D23 is entered in the brief by Damian.
1. **Core accounts: backend, operator tools, pages, guards and header.** One deployable PR, with internal backend and UI stages. Includes platform Phase 2 page-loading primitives. No backend-only deployment or cross-PR release hold.
2. **Self-service mentor,** after D22 is approved. Independent of #14: E01 can start once core accounts are merged, with mentor roles granted by the operator script, subject to E01's publishing gate.

**Dependency order: platform Phase 1a + D23 → accounts Phase 1 → {E01 #14 (its own publishing gate), accounts Phase 2 (after D22)}.**

## 📋 Implementation Plan

Each step ends with its tests and leaves the build green; each phase is one deployable PR that passes the full validation gate. Stage A and Stage B below both belong to the same Phase 1 PR. No stage is published independently.

### Phase 1 — core accounts (one PR)

#### Stage A — backend and operator tools

0. **Prerequisite check.** Confirm the cross-spec ownership alignment above is current and D23 has been entered by Damian. D22 is only required for Phase 2 and E01's stated publishing gate.
1. **Roles and the session model.**
   - Add `core/src/lib/roles.ts` and move the role list there; `SESSION_ROLES`/`SessionRole` stay exported from `http/auth.ts`.
   - `Session` becomes `{ userId, roles, expiresAt }`, the JWT requires `{ sub, roles, exp }`, and `requireRole` becomes a membership check. `expiresAt` is the verified `exp`; it is not an account DTO field.
   - Rename `student` to `mentee` in code, `tests/integration/support/session.ts` and the `AGENTS.md` route-group lines (D21).
   - Tests: a legacy `role` token, an empty or unknown `roles`, a token without `mentee`, and missing/invalid/expired `exp` all fail closed; existing auth tests updated. Add an explicit expiry option to signing and reject past deadlines; sign-in/registration keep the 24-hour default.
2. **Errors, headers and cookies.**
   - B12, only what this spec uses: optional `code` and `fieldErrors` on `ConflictError`, optional `code` on `UnauthorizedError`, defaults unchanged. Add `TooManyRequestsError` (429).
   - `apiHandler`: handler args gain `headers` (response headers); `errorResponse` sets `Retry-After`.
   - `sessionCookieHeader` and `clearedSessionCookieHeader`, built from `sessionCookieOptions()`. Replacement cookies use a `maxAge` bounded by remaining token lifetime.
   - Tests: a custom code plus `fieldErrors.email` in the envelope and unchanged defaults, a 429 with `Retry-After`, exact cookie attributes, a replacement cookie preserving expiry, and a cleared cookie.
3. **B13 and the guarded users route.**
   - `makeCrudRoute` accepts `access: { role }`, running `requireRole` before query and body parsing.
   - `api/users/route.ts` uses `{ role: "admin" }`. Update `users-api` and `admin` integration tests to seed an admin session.
   - Tests: a mentee gets `403` even with an invalid query (never a `400`), and no session gets `401`.
4. **Entity, migration and harness.**
   - Add `passwordHash`, `roles` and the named canonical-email check to `User`; generate/review the migration and snapshot. Migration preflights collisions, normalizes legacy email, and rolls back atomically on collisions. `down()` drops the new columns/check and retains normalized email.
   - Add `db/src/errors.ts` `isUniqueViolation` and re-export `LockMode` for role mutations.
   - Create `tests/integration/migrations.test.ts` for this migration.
   - Tests: entity metadata; migration up → down → up with columns, defaults and check tested; padded/uppercase legacy normalization, collision refusal with no partial schema/data changes, and raw noncanonical inserts rejected; `isUniqueViolation` for the email constraint and not for other errors.
5. **Server libs.**
   - `lib/password.ts` (cost 12, 72-byte guard, lazy dummy hash), `lib/rate-limit.ts` (fixed windows, key cap, injectable clock), `services/auth/auth.limits.ts`, `lib/client-key.ts`, and `TRUSTED_IP_HEADER` in `config/env.ts` and `.env.example`.
   - Tests: hash and verify round trip, no overlong input reaches bcrypt, the dummy compare, fixed-window expiry, concurrent same-email admission, successes consuming budget without reset, all-or-nothing multi-bucket admission, and refusal at capacity preserving active keys; `getClientKey` for `x-forwarded-for` (last entry), a plain header, an invalid IP and an unset variable.
6. **Validators.** `email`, `password`, `register.schema.ts`, `login.schema.ts`. Tests: normalization; registration's 10-code-point minimum and separate 72-byte maximum with Polish letters and emoji; both schemas reject overlong input with `400`; no password normalization/truncation; Polish messages; `roles` is not accepted.
7. **`AuthService`, container and DTOs.**
   - `register`, `login`, and the operator methods; register `passwordHasher`, `authRateLimiter` and `authService`; extend the `Cradle`. Role changes read and write under the same user-row transaction lock and return committed roles.
   - Tests: every refusal; admission before lookup/hashing; the dummy compare for unknown and password-less accounts; `email_taken` with the actual field payload for a normalized legacy row; `AccountDto` key set; roles always contain `mentee`; concurrent operator grant/revoke preserving unrelated roles; the log-redaction test; a container resolve proves there is no cycle.
8. **Routes.**
   - `api/auth/register`, `login`, `logout` on `apiHandler`: `getJwtSecret()` first, then the service, then the cookie and `no-store`.
   - Integration tests: `201`/`200`/`401`/`409`/`400`/`429`, overlong login `400`, the CSRF `403`, concurrent registers, legacy-email refusal with `fieldErrors.email`, concurrent login admission, the cookie attributes, and the old-format token.
9. **Operator CLI.**
   - `core/src/cli/user-admin.ts`: `grant-role`, `revoke-role` (never `mentee`) and `reset-password`, run with `tsx` through npm scripts. It loads `.env` as `mikro-orm.config.ts` does, prints the effective database target (host:port/db, never credentials) and where it came from, and warns that old tokens keep their claims until expiry; new sign-in or enrollment takes a fresh snapshot. Email lookups normalize identically to login.
   - The generated password is printed once and never logged.
   - A thin entry file is excluded from coverage in `vitest.config.mts` with a comment (tool entry point).
   - Tests: argument handling, each command, the output, and the refusals.
10. **Backend checkpoint.** Run affected checks; continue in this same PR to Stage B. Record the migration rollback loss and forced-logout compatibility note for final review.

#### Stage B — pages, guards and header (same PR)

1. **F2 primitives.**
   - `verifySessionToken` split out of `requireSession`; `getPageSession` (never throws on a bad token, rethrows `ConfigError`); `isSafeReturnTo`. Fallback is `/`; defer role-aware landing selection until another destination exists.
   - `loadPage` with its access modes and error mapping; Polish `not-found.tsx` and `error.tsx`.
   - Tests as the platform spec lists them (return-to attacks, not-found/forbidden mapping, unexpected errors logged and rethrown).
2. **Header.** `AccountNav` in `<Suspense>` and `LogoutButton`, in the `(marketing)` layout and a new `(auth)` layout. Tests: signed out and signed in, logout calls the route and refreshes, a bad `JWT_SECRET` does not affect the header, and a stale or old-format cookie shows "Wyloguj się" yet still lets the visitor reach `/logowanie`.
3. **Auth pages.**
   - `/logowanie` and `/rejestracja`, with colocated client forms over `CrudForm` and `apiCall`.
   - Tests: the forms submit the shared schema's output; the actual service conflict survives API serialization and appears under the email field; password Unicode/byte boundaries agree with route validation; switching forms preserves `returnTo`; consumption validates it; signed-in visitors use the valid target or `/`; a signed-out `loadPage` redirect lands on `/logowanie`.
4. **Admin guard.** `loadPage({ role: "admin" })` in `admin/page.tsx` and `admin/users/page.tsx`. Tests: signed out redirects with `returnTo`, a non-admin gets 404, an admin sees the page.
5. **Browser integration tests** (`agent-browser`):
   - register → lands signed in; log out; log in with a `returnTo` to `/admin` as an admin;
   - a non-admin gets 404 on `/admin`;
   - a forged `returnTo` goes to the landing path;
   - the cookie works over the production build on localhost.
6. **Docs and full gate.** The core-accounts `AGENTS.md` lines, `.env.example`, run log and any lessons; note that platform Phase 2 shipped only when this PR is implemented. Run the complete gate and verify pages with the dev server. One PR/release contains both stages, the admin/API guards and browser sign-in, with the migration rollback/forced-logout notes and second reviewer.

### Phase 2 — self-service mentor (blocked on D22)

1. **Service and route.** `register` accepts `asMentor` and inserts initial roles with the account; `becomeMentor` is idempotent under the user-row lock. `POST /api/auth/mentor` signs committed roles with the incoming session's original `expiresAt`, including for a no-op, and bounds cookie lifetime accordingly. Tests: no body/token role array can replace database roles; a no-op preserves expiry; `401` without a valid session or when expiry crosses during the transaction; first enrollment near expiry cannot renew the session; concurrent admin revocation/enrollment in either order never restores admin, and a later token snapshot omits it. An already-issued token retains the documented stale-role window.
2. **Pages.** The `?jako=mentor` variant of `/rejestracja` and `/zostan-mentorem` (guarded with `loadPage({ role: "mentee" })`), including the redirects for signed-in visitors. Tests: copy, redirects, and a browser check of both paths landing signed in with `mentor`.
3. **Docs.** The `AGENTS.md` line for the mentor path; E01's Prerequisites note that mentors can now self-register.

## ✅ Done means

- [ ] A person can register with a name, email and password and is signed in at once; can log out and log in again; sign-up with a taken address is refused with the field named; login errors are generic and equal for unknown, wrong-password and password-less accounts.
- [ ] The session carries `roles` (always `mentee`) and verified `expiresAt`; `requireRole` and `loadPage` use membership; `student` is gone from code, tests and `AGENTS.md`; legacy-shaped tokens and missing/invalid `exp` fail closed.
- [ ] `/admin` and `GET /api/users` are admin-only: signed out → `401` or a redirect with `returnTo`; a mentee → `403` or the Polish 404. Both are covered by integration tests (denied path and wrong scope).
- [ ] Passwords are bcrypt (cost 12), registration requires 10 Unicode code points, both schemas enforce a 72-byte maximum with overlong input returning `400`, and passwords are never truncated or exposed in HTTP/DTO/logs. The nullable hash prevents legacy sign-in; legacy rows cannot be claimed. The taken-email conflict's real envelope renders under the email field.
- [ ] Login and registration count every admitted attempt synchronously before lookup/hashing, with no success reset, `429` and `Retry-After`. Concurrent admission cannot exceed limits; saturation cannot erase active lockouts or partly consume another bucket. The limitations (per process, no client key without `TRUSTED_IP_HEADER`) are in `AGENTS.md`.
- [ ] `returnTo` is validated where produced and where consumed; tricks fall back to the landing path, which is `/` for every role until E01 #14 ships `/mentor/strona`.
- [ ] The migration normalizes legacy emails, refuses canonical collisions atomically and enforces canonical storage plus uniqueness. Its tested `down()` removes the new columns/check but retains normalized spelling; the PR states credential/role loss and forced logout. The harness exists for later migrations.
- [ ] The operator script grants and revokes roles and resets a password, prints its database target, and is covered by tests.
- [ ] Every screen is Polish; the forms use `CrudForm`; the public pages still work when `JWT_SECRET` is unset.
- [ ] Role mutations serialize on the user row; concurrent grant/revoke/enrollment never overwrites a committed change from a stale read. Responses and replacement tokens use the committed role snapshot.
- [ ] Phase 2 (after D22): a visitor can register as a mentor or enroll from an account. First enrollment and no-op replacements preserve the original `exp`; expiry during the service call yields `401`, not a renewed session.
- [ ] Phase 1: D23 is entered in the brief by Damian before work starts and cross-spec alignment is confirmed. Phase 2: D22 is entered before it merges.
- [ ] Phase 1 ships backend, operator tools, pages, header and all admin/API guards in one deployable PR; no separate backend-only release.
- [ ] Each phase: 100% unit coverage, an integration test per new route and page, and `lint`, `typecheck`, `test:coverage`, `build`, `test:integration`, `audit` all pass.
- [ ] The spec is moved to `.ai/specs/implemented/` when Phase 2 merges (or when Phase 1 merges and Phase 2 is archived with D22 declined).
