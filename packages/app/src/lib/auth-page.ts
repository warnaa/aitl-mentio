import { getPageSession } from './session';
import { authRouteLogger } from './sign-in';

/** A query value Next may hand over as an array (`?a=1&a=2`): only a single value counts. */
export function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * The session check for a visitor on `/sign-in` or `/register`. When it cannot be made
 * (database down, `SESSION_SECRET` unset) the visitor still gets the form instead of an
 * error page: sign-in will report the outage itself, and a stale cookie must never lock
 * anyone out of the page that replaces it.
 */
export async function currentSession() {
  try {
    return await getPageSession();
  } catch (error) {
    authRouteLogger().warn({ err: error }, 'could not check the session on an auth page');
    return null;
  }
}
