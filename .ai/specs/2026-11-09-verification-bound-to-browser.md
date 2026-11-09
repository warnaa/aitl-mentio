# Email verification bound to the registering browser (T26)

## 📝 TLDR

Opening an emailed link currently activates whatever password was last written to an unverified account, even when someone without the mailbox wrote it. Activation will now require both the emailed link and the browser that registered, and a verified GitHub identity will replace an unconfirmed registration instead of being refused. This closes T26 in `docs/security/threat-model.md`, needs no migration, and adds friction for people who register on one device and open the mail on another.

Decisions by Damian, 2026-11-09: browser binding over asking for the password at verification; GitHub takes over unverified rows; password reset and change are a separate spec; no deployment has real users, so no data work.

## 📝 Problem Statement

`.ai/specs/implemented/2026-09-04-accounts-and-roles.md` (lines 547-549) says overwriting an unverified row's hash "grants nothing: only whoever receives the mail can verify". That is true of who verifies, not of whose password survives:

- `UserService.claimOrCreate` writes the latest registrant's hash to an unverified row.
- `UserService.verifyEmail` activates the row without knowing who wrote that hash.
- `authenticateWithPassword` accepts it afterwards, because it only checks `emailVerifiedAt`.
- `matchOrCreate` refuses GitHub on that row (edge case 4) and tells the owner to open the emailed link.
- No password reset or change exists to remove the password. This is the published "pre-hijacking" account pattern (Sudhodanan and Paverd, USENIX Security 2022).

**Non-goals:** password reset or change; T27 and T28 rate-limit work; changes to the mail-per-address limit; asking for the password at verification; data migration.

## 📝 Proposed Solution

At registration the server mints a random binding, stores its plain value in an HttpOnly cookie in the registering browser, and puts only its SHA-256 hash in the signed verification token. Verification activates the account only when the cookie's hash equals the token's. Someone who registers another person's address holds the cookie but never receives the link; the mailbox owner receives the link but has no cookie, so nothing activates.

Alternatives: asking for the password at verification works across devices but was not chosen. Keeping the pending credential in the token was already rejected by the accounts spec.

## 📝 Architecture

No new table, service or dependency. Changes are in `email-verification.service.ts`, `user.service.ts`, the `register` and `verify-email` routes, `lib/sign-in.ts` and copy.

**Cookie** `devmentor_email_binding`: value from `tokenService.mintOpaqueToken().token`; `Path=/api/auth/verify-email`, `Max-Age` equal to `EMAIL_VERIFY_TTL_SECONDS`, `HttpOnly`, `SameSite=Lax` (sent on the top-level navigation from a mail client), `Secure` in production. Helpers mirror `oauth-state.ts` and use `serializeCookie` and `readCookie`.

**Verification order** in `verifyEmail(claims, presentedBindingHash: string | null)`:

1. User missing: invalid link.
2. Already verified: `already-verified`, no session (edge case 16 unchanged).
3. Version differs: invalid link.
4. `presentedBindingHash !== claims.binding`: throw `VerificationBrowserMismatchError`, a direct `AppError` subclass that is not a `BadRequestError`, so the route's existing `BadRequestError` catch cannot absorb it. The route handles it first. No state changes.
5. Activate with the existing `updateUserAtVersion`, issue the session, clear the cookie.

**The link signs the version this request wrote.** `updateUserAtVersion` re-reads the row after its update, so with concurrent re-registrations `user.sessionVersion` may already belong to another request's write. A link built from it could pair this browser's binding with someone else's hash. `claimOrCreate` therefore returns the version it wrote (`pending.sessionVersion + 1`, captured before the update; 0 for a new row) and `link` signs that value.

**GitHub takeover** in `matchOrCreate`, replacing the `UnverifiedAccountLinkError` branch: inside the existing transaction, re-read the oldest unverified row with `PESSIMISTIC_WRITE` and `refresh`, then re-check it. If it is now verified, take the existing verified branch, including its conflict check, so a password proven by the mailbox is never erased and no `githubId` is re-pointed. Otherwise set `githubId`, `githubLogin`, `avatarUrl`, `displayName` from the identity, `emailVerifiedAt = now`, `passwordHash = null`, and `sessionVersion + 1`. The lock is required: a stale read of a null hash would produce no column update and let a concurrent claim's hash survive. The version bump makes concurrent guarded writes and pending links unable to activate the row. A pending link opened later reaches the already-verified outcome: no session, `/sign-in?verified=1`. `users.email` is not rewritten; other unverified rows differing only by case remain unverified and cannot sign in.

## 📝 Data Model

No schema change. `VerificationClaims` gains required `binding: string` (hex SHA-256). Only the hash travels in the mail; the plain value stays in the cookie and is not stored server-side. The token's existing `version` still voids older links.

## 📝 API Contracts

| Surface | Change | Compatibility |
| --- | --- | --- |
| `POST /api/auth/register` | On success also sets the cookie. Body unchanged. | Breaking against "sets no cookie" in `BACKWARD_COMPATIBILITY.md`; update that entry |
| `GET /api/auth/verify-email` | New outcome `/sign-in?error=verification-browser`; success clears the cookie | Additive |
| `verifyEmail`, `link`, `VerificationClaims`, `RequestOrigin` | New binding argument and field | Breaking export signatures; update in-repo consumers |
| 403 `account_link_unverified`, `UnverifiedAccountLinkError`, `/sign-in?error=unverified` | Removed: the case no longer occurs | Breaking; follow the documented path and list under "Breaking changes" in the PR |

## 📝 UI/UX

- Check-your-inbox screen (`AccountPanel`) adds: "Open the link in this browser."
- The verification mail says the same.
- `/sign-in?error=verification-browser` uses the existing recovery screen: `(auth)/sign-in/page.tsx:48,56` must include the new reason, with the `verification-invalid` state and its "Request a new verification link" action. Notice: "Open this link in the browser where you registered, or register again here to get a new link."

## 📝 Edge Cases & Failure Scenarios

| Case | Result |
| --- | --- |
| Someone registers another person's address; the owner opens the link | Mismatch, nothing activated, owner can register or use GitHub |
| Owner registers, someone else re-registers, owner opens the newest link | Mismatch: the link carries the other browser's binding. Owner registers again |
| Older link after any re-registration | Invalid (version) |
| Registers on laptop, opens mail on phone | Mismatch. Registers again from the phone, or opens the mail on the laptop |
| Mail app opens links in an embedded browser | Likely mismatch. GitHub sign-in remains available |
| Cookies blocked or cleared | Mismatch, same recovery |
| One browser registers two addresses | Second registration replaces the cookie; first link mismatches |
| Mail scanner opens the link | No cookie, no change. Stricter than today, when a scanner could activate the account |
| Forced navigation to someone else's link | Mismatch, so no forced sign-in as another account |
| Repeated re-registration by someone else | Consumes the owner's 3 mails per hour and keeps voiding links. No takeover, but an owner without a matching GitHub email can be blocked while it continues. Reduced by T27 |
| GitHub sign-in races a claim or a verification | Row lock and version guard: guarded writes fail; final row has no password |
| Old link opened after GitHub takeover | `/sign-in?verified=1`, no session, no password restored. `SIGN_IN_VERIFIED_NOTICE` changes to neutral copy: "Sign in to continue." |
| Two re-registrations race | Each link carries the version its own request wrote, so the loser's link is invalid and no link pairs one browser with another's hash |
| Tokens issued before release | `binding` missing, treated as invalid. Acceptable: no real users |

## 📝 Risks & Impact Review

- **Product cost, accepted by Damian's choice:** cross-device and embedded-browser activation fails first time. Log a structured `info` event on mismatch, with user ID only, so the rate is measurable.
- **Blast radius:** registration, verification, GitHub first sign-in. Rollback is a code revert; nothing persists beyond a short-lived cookie.
- **Risk-high:** auth logic needs a second reviewer and `needs-qa` per `SDLC.md`.
- **Owner's own pending password:** a real owner who registers and then uses GitHub loses that password and becomes GitHub-only, with no reset until the separate spec ships.
- **Does not address:** a person tricked into forwarding a link and using the attacker's browser state, a shared or kiosk browser still holding an attacker's cookie, or a compromised mailbox.

## 📋 Phasing

Ship both phases in one PR. Phase 1 closes the password path; Phase 2 provides the GitHub recovery that the edge cases rely on, so Phase 1 alone would leave affected owners refused.

## 📋 Implementation Plan

**Phase 1**

1. Add cookie helpers and required `binding` to claims and `link`. Unit: attributes, malformed or missing claim rejected.
2. `register` mints the binding, passes the hash, sets the cookie only on success. Unit: no cookie on 409, 422, 429, 503.
3. `verifyEmail` and route enforce the order above and clear the cookie. `claimOrCreate` returns the written version for `link`. Unit: each branch, null cookie, no write on mismatch, and a mocked refresh returning a higher version still signs the written one.
4. Sign-in reason, notice, recovery screen, inbox and mail copy, mismatch log.
5. Integration: registration followed by verification in one browser succeeds; a second browser with the same link is refused and the registrant's password does not sign in. Add: owner registers, a second browser re-registers, the owner opens the newest link, gets a mismatch, and neither password signs in. Update the link-following scenario near `tests/integration/auth.integration.test.ts:344`.

**Phase 2**

6. Replace the refusal with the locked takeover. Unit: fields set, hash cleared, version bumped.
7. Remove `UnverifiedAccountLinkError`, the `unverified` reason and their tests; update `core` exports. Replace `tests/integration/auth.integration.test.ts` TC-AUTH-008's first scenario: GitHub on an unverified row signs in, the registrant's password fails, and the old link lands on `/sign-in?verified=1` with no session. Update `callback/route.test.ts:337` and `user.service.test.ts:273`.
8. Concurrency integration on real PostgreSQL with forced interleaving (hold the row lock from a separate connection): claim first, then takeover, leaves no password; verification first, then takeover, keeps the verified password and links through the verified branch.
9. Update `BACKWARD_COMPATIBILITY.md`: the register cookie, the verify-email outcome, removal of `unverified` and `account_link_unverified`, and the stale claim about what bumps `session_version` (line 319). Then run `npm run test:unit:coverage`, lint, typecheck, build and integration.

## Acceptance criteria

- A password set by someone without the mailbox never becomes usable on that account, through either path.
- A link opened outside the registering browser changes nothing.
- A verified GitHub identity ends with a working account. An unverified row it takes over keeps no password; a row verified meanwhile keeps its own.
- Outside active abuse of the mail limit, the real owner has a route to a working account: register again from the browser that opens the mail, or use GitHub.
- 100% coverage of changed production files; no migration.
