import { apiHandler, clearSessionCookie, getEnv, jsonOk, withRequestScope } from '@devmentor/core';
import { authRouteLogger } from '../../../../lib/sign-in';

export const dynamic = 'force-dynamic';

/**
 * Sign out — the one operation that must never fail. Requires the CSRF header
 * (enforced by `apiHandler` for every POST, before this runs) but **not** a session:
 * every request that gets past it receives `{ ok: true, data: null }` and the expiring
 * cookie, whatever the cookie held.
 *
 * When the request carries a live session (verified, user present, `sessionVersion`
 * current), `sessionVersion` is bumped, so a copy of the cookie dies with it (E01 edge
 * case 11). Without one there is no row to bump. If resolving the session or bumping
 * fails — `SESSION_SECRET` unset with a cookie present, the database down — the failure
 * is logged and the bump skipped; the cookie is still expired, built without the
 * container so nothing here depends on it.
 */
export const POST = apiHandler(async (req) => {
  try {
    await withRequestScope(req, async ({ session, userService }) => {
      const live = await session;
      if (live) {
        await userService.endAllSessions(live.userId);
      }
    });
  } catch (error) {
    authRouteLogger().warn({ err: error }, 'sign-out could not end the session; expiring the cookie anyway');
  }
  const response = jsonOk(null);
  response.headers.append('set-cookie', clearSessionCookie(getEnv()));
  return response;
});
