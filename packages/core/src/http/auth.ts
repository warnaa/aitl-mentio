import { User, type EntityManager } from '@devmentor/db';
import type { AppEnv } from '../config/env';
import { reconcileOperatorRole, type ReconcileDeps, type Role, type RoleSet } from '../services/auth/roles';
import type { SessionService } from '../services/auth/session.service';
import { ForbiddenError, UnauthorizedError } from './errors';

/**
 * Authorization (primitives spec B3). Every route that isn't explicitly public calls
 * `requireSession` first, inside a request scope, before touching a service.
 *
 * The session token only identifies a user and carries a session version; it holds no
 * roles. `loadSession` — the one live-session operation, registered per request scope
 * as the cradle's `session` — verifies the token, reloads the user (one primary-key
 * lookup), rejects a stale `sessionVersion`, and resolves the role set from the row:
 * stored `mentee`/`mentor`, `operator` derived live from `OPERATOR_EMAILS`. The role
 * vocabulary itself lives in `services/auth/roles.ts` and is re-exported here.
 */
export { ROLES, resolveRoles, type Role, type RoleSet, type RoleSource } from '../services/auth/roles';

export interface Session {
  userId: string;
  /** Never empty: a user always holds at least one role. */
  roles: RoleSet;
}

/** The custom header `apiCall` sends on every request; a plain HTML form cannot set it. */
export const CSRF_HEADER_NAME = 'x-devmentor-request';
/** The value `apiCall` sends in `CSRF_HEADER_NAME`. */
export const CSRF_HEADER_VALUE = '1';

/** What `loadSession` needs from the request scope. */
export interface SessionLoaderDeps extends ReconcileDeps {
  sessionService: Pick<SessionService, 'verify'>;
  em: Pick<EntityManager, 'findOne' | 'nativeUpdate'>;
  env: Pick<AppEnv, 'OPERATOR_EMAILS'>;
}

/**
 * The live session for a raw session-cookie value, or `null` when there is no cookie,
 * it does not verify (tampered, expired, wrong audience), the user no longer exists,
 * or its `sessionVersion` has been bumped since the token was issued.
 *
 * Internal: the request scope calls this once and caches the answer as `session`.
 * Route code uses `requireSession`; pages use the app's session helper.
 *
 * On the happy path this is one primary-key lookup. Only when the stored role set
 * disagrees with the live answer (the allowlist gained or lost the user's email) does
 * `reconcileOperatorRole` write the stored set to match — without bumping
 * `sessionVersion`, so the session stays valid. A de-listed operator whose only
 * stored role was `operator` resolves to `mentee`, never to an empty set.
 *
 * @throws Error when the stored role set holds no valid role at all — corrupt data
 *   surfaces as a logged 500, never as a 401 that would loop the user through sign-in.
 * @throws ServiceUnavailableError when a cookie is present but `SESSION_SECRET` is not
 *   configured (from `SessionService.verify`).
 */
export async function loadSession(
  token: string | null | undefined,
  deps: SessionLoaderDeps,
): Promise<Session | null> {
  const { sessionService, em } = deps;
  const claims = await sessionService.verify(token);
  if (!claims) {
    return null;
  }
  const user = await em.findOne(User, { id: claims.userId });
  if (!user || user.sessionVersion !== claims.sessionVersion) {
    return null;
  }
  return { userId: user.id, roles: await reconcileOperatorRole(user, deps) };
}

/**
 * Require an authenticated, live session or throw `UnauthorizedError` (401).
 *
 * `cradle` must come from `withRequestScope(req, …)` for this same `req`: the session
 * is the scope's `session`, resolved from the request's cookie once per scope and
 * shared with any service that also depends on it. `req` itself is not read; it keeps
 * the guard's call shape the same as `makeCrudRoute`'s `authorize(req, cradle)`.
 */
export async function requireSession(
  req: Request,
  cradle: { session: Promise<Session | null> },
): Promise<Session> {
  const session = await cradle.session;
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

/** Require the session to hold `role` or throw `ForbiddenError` (403). */
export function requireRole(session: Session, role: Role): Session {
  if (!session.roles.includes(role)) {
    throw new ForbiddenError();
  }
  return session;
}

/**
 * Require the CSRF header `apiCall` sends, or throw `ForbiddenError` (403). Called only
 * by `apiHandler`, for every method other than GET, HEAD and OPTIONS — no route calls
 * it itself. A cross-origin request carrying a custom header triggers a CORS preflight
 * the app never answers, and a plain HTML form cannot set one at all.
 */
export function requireCsrfHeader(req: Request): void {
  if (req.headers.get(CSRF_HEADER_NAME) !== CSRF_HEADER_VALUE) {
    throw new ForbiddenError('Missing or invalid request header');
  }
}

/**
 * Assert the session owns the resource identified by `ownerId`, else throw
 * `ForbiddenError` (403). Use for every mutation — a mentee may only act on their
 * own bookings, a mentor only on their own profile/availability.
 */
export function assertOwnership(session: Session, ownerId: string): void {
  if (session.userId !== ownerId) {
    throw new ForbiddenError();
  }
}
