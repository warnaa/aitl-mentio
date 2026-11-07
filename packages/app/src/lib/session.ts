import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  homeFor,
  safeReturnTo,
  SESSION_COOKIE_NAME,
  withSessionCookieScope,
  type Cradle,
  type Role,
  type Session,
  type UserDto,
} from '@devmentor/core';
import { REQUEST_PATH_HEADER } from './request-path';
import { SIGN_IN_PATH } from './sign-in';

/**
 * Page-level session and guards (primitives spec F3). Lives in `app` because
 * `next/headers` and `redirect` are Next APIs `core` must not import; the session itself
 * comes from the same live operation route handlers use (`withSessionCookieScope` →
 * verify the token, check `sessionVersion`, load current roles and the operator
 * allowlist), never from token claims alone.
 *
 * Every page or layout calling these is dynamic (`export const dynamic = 'force-dynamic'`):
 * the answer depends on the request's cookie and the database.
 *
 * Next gives a server component no pathname, so `proxy.ts` forwards the requested
 * `pathname + search` as the `x-devmentor-path` request header and a signed-out visitor
 * returns to that (validated by `safeReturnTo`). Each guard still takes its own path as
 * the fallback `returnTo` — a literal like `'/admin/users'` — used when the header is
 * absent (proxy not matched) or unsafe. This matters for layouts: Next lets a layout's
 * redirect win over its page's, and a layout's literal is only its section root.
 *
 * Failure stays closed and never loops: a missing or dead session redirects to sign-in,
 * but an infrastructure failure while a cookie is present (database down,
 * `SESSION_SECRET` unset) **throws**, so Next renders its error page instead of sending a
 * signed-in user to a sign-in screen that cannot sign them in either.
 */
export { homeFor };

/**
 * The live session for this request, or `null` when there is none: no cookie, a
 * tampered/expired token, a deleted user, or a bumped `sessionVersion`.
 *
 * Without a cookie the container is never built, so a signed-out visitor costs no
 * database round trip and still gets an answer while the database is down.
 *
 * @throws when a cookie is present and the session cannot be checked (database
 *   unreachable, `SESSION_SECRET` not configured, corrupt role data).
 */
export async function getPageSession(): Promise<Session | null> {
  return inPageScope(({ session }) => session);
}

/** A live session together with its user's own account, for saying who is signed in. */
export interface PageAccount {
  session: Session;
  user: UserDto;
}

/**
 * `getPageSession` plus the signed-in user's own `UserDto`, read in the **same** scope,
 * so the cookie is verified once and the user row loaded by that check is reused.
 *
 * @throws as `getPageSession`.
 */
export async function getPageAccount(): Promise<PageAccount | null> {
  return inPageScope(async ({ session, userService }) => {
    const live = await session;
    return live ? { session: live, user: await userService.current() } : null;
  });
}

/** Run `fn` in a session-cookie scope, or answer `null` without one when there is no cookie. */
async function inPageScope<T>(fn: (cradle: Cradle) => Promise<T | null>): Promise<T | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return withSessionCookieScope(token, fn);
}

/** `/sign-in?returnTo=<returnTo>`; the sign-in page re-validates it with `safeReturnTo`. */
export function signInRedirectPath(returnTo: string): string {
  return `${SIGN_IN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * Where a signed-out visitor returns after sign-in: the path `proxy.ts` forwarded for
 * this request when `safeReturnTo` accepts it, else `fallback`.
 */
async function requestedPath(fallback: string): Promise<string> {
  return safeReturnTo((await headers()).get(REQUEST_PATH_HEADER), fallback);
}

/** Redirect to sign-in, returning to the requested path (see `requestedPath`). */
async function redirectToSignIn(fallback: string): Promise<never> {
  redirect(signInRedirectPath(await requestedPath(fallback)));
}

/**
 * The live session, or a redirect to `/sign-in?returnTo=<requested path>` when there is
 * none.
 *
 * @param returnTo the calling page's own path, e.g. `'/home'` — the fallback when the
 *   proxy forwarded no usable path.
 */
export async function requirePageSession(returnTo: string): Promise<Session> {
  const session = await getPageSession();
  if (!session) {
    return redirectToSignIn(returnTo);
  }
  return session;
}

/**
 * The live session when it holds `role`. Signed out → `/sign-in?returnTo=<requested path>`;
 * signed in without `role` → the caller's own home (`homeFor`). That cannot loop as long
 * as each home page requires the role `homeFor` picked it for: `/admin` → `operator`,
 * `/mentor` → `mentor`, `/home` → `mentee`.
 *
 * Call it in the layout **and** in every guarded `page.tsx`: a layout does not re-run on
 * client-side navigation.
 *
 * @param returnTo the calling page's own path, e.g. `'/admin/users'` (fallback, as above).
 */
export async function requirePageRole(role: Role, returnTo: string): Promise<Session> {
  const session = await requirePageSession(returnTo);
  requireHeldRole(session, role);
  return session;
}

/**
 * `requirePageRole` that also returns the user's own account (see `getPageAccount`),
 * for a layout or page that shows who is signed in. Same redirects, same failures.
 *
 * @param returnTo the calling page's own path, e.g. `'/home'` (fallback, as above).
 */
export async function requirePageAccount(role: Role, returnTo: string): Promise<PageAccount> {
  const account = await getPageAccount();
  if (!account) {
    return redirectToSignIn(returnTo);
  }
  requireHeldRole(account.session, role);
  return account;
}

/**
 * Run `fn` in the signed-in caller's own scope (their live session, like a route
 * handler's), for a page that reads through a service that needs the session. Call it
 * after a page guard; without a session cookie it still redirects to sign-in.
 *
 * @param returnTo the calling page's own path (fallback, as above).
 */
export async function withPageScope<T extends object>(returnTo: string, fn: (cradle: Cradle) => Promise<T>): Promise<T> {
  return (await inPageScope(fn)) ?? redirectToSignIn(returnTo);
}

/**
 * `requirePageAccount` for a page whose access is decided by the data, not by a role: any
 * signed-in user gets through, and the service answers 404 to anyone who is not a party
 * (the text session screen). Signed out → `/sign-in?returnTo=<requested path>`.
 *
 * @param returnTo the calling page's own path (fallback, as above).
 */
export async function requirePageSignedIn(returnTo: string): Promise<PageAccount> {
  const account = await getPageAccount();
  return account ?? redirectToSignIn(returnTo);
}

/** Signed in without `role` → the caller's own home. */
function requireHeldRole(session: Session, role: Role): void {
  if (!session.roles.includes(role)) {
    redirect(homeFor(session.roles));
  }
}
