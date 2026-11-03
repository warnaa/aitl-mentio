import {
  apiHandler,
  BadRequestError,
  clearOAuthStateCookie,
  getEnv,
  homeFor,
  OAUTH_STATE_PURPOSE,
  readOAuthStateCookie,
  safeReturnTo,
  withRequestScope,
} from '@devmentor/core';
import {
  redirectResponse,
  SIGN_IN_CANCELLED_PATH,
  signInErrorFor,
  signInErrorPath,
  authRouteLogger,
  type SignInError,
} from '../../../../../lib/sign-in';

export const dynamic = 'force-dynamic';

type Outcome = { location: string; sessionCookie: string } | { reason: SignInError };

/**
 * Verify the state token, then trade the code for a GitHub identity, resolve it to a
 * user and issue a session. Expected refusals propagate as errors for `signInErrorFor`.
 */
function signIn(req: Request, state: string, code: string): Promise<Outcome> {
  return withRequestScope(req, async ({ tokenService, identity, userService, sessionService }) => {
    let returnTo: string;
    try {
      ({ subject: returnTo } = await tokenService.verifyPurposeToken(state, OAUTH_STATE_PURPOSE));
    } catch (error) {
      if (error instanceof BadRequestError) {
        return { reason: 'state' };
      }
      throw error;
    }
    const accessToken = await identity.exchangeCode(code);
    const user = await userService.findOrCreateFromGithub(await identity.fetchIdentity(accessToken));
    const { cookie } = await sessionService.issue({ id: user.userId, sessionVersion: user.sessionVersion });
    return { location: safeReturnTo(returnTo, homeFor(user.roles)), sessionCookie: cookie };
  });
}

/**
 * GitHub's redirect back after authorization. Browser-navigated: every outcome is a
 * redirect, and every one clears the state cookie.
 *
 * - `?error=access_denied` (the user cancelled) → `/sign-in?cancelled=1`; any other
 *   GitHub error → `/sign-in?error=unavailable`. Nothing is created.
 * - `?state` must **equal** the state cookie before anything else happens — a purpose
 *   token proves we issued it, not that this browser started the attempt, so the
 *   comparison is what stops login CSRF. Missing or mismatched state, or a missing
 *   `code`, → `/sign-in?error=state` with no outbound request. An expired or tampered
 *   token is the same `state` reason.
 * - Success → `Set-Cookie` for the session, and a redirect to the `returnTo` the state
 *   carried (re-sanitised) or the user's role home.
 * - Refusals → `/sign-in?error=` `email` | `unverified` | `conflict`; GitHub down, slow
 *   or unconfigured, and anything unexpected, → `unavailable` (see `signInErrorFor`).
 */
export const GET = apiHandler(async (req) => {
  const clearState = clearOAuthStateCookie(getEnv());
  const leave = (location: string) => redirectResponse(location, [clearState]);
  const query = new URL(req.url).searchParams;

  const githubError = query.get('error');
  if (githubError !== null) {
    if (githubError === 'access_denied') {
      return leave(SIGN_IN_CANCELLED_PATH);
    }
    authRouteLogger().warn({ githubError }, 'GitHub refused the authorization request');
    return leave(signInErrorPath('unavailable'));
  }

  const state = query.get('state');
  const code = query.get('code');
  const expected = readOAuthStateCookie(req.headers.get('cookie'));
  if (!state || !expected || state !== expected || !code) {
    return leave(signInErrorPath('state'));
  }

  let outcome: Outcome;
  try {
    outcome = await signIn(req, state, code);
  } catch (error) {
    outcome = { reason: signInErrorFor(error, authRouteLogger()) };
  }
  if ('reason' in outcome) {
    return leave(signInErrorPath(outcome.reason));
  }
  return redirectResponse(outcome.location, [outcome.sessionCookie, clearState]);
});
