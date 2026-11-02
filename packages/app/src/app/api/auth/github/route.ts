import {
  apiHandler,
  githubLoginHint,
  OAUTH_STATE_PURPOSE,
  OAUTH_STATE_TTL_SECONDS,
  oauthStateCookie,
  safeReturnTo,
  withScope,
} from '@devmentor/core';
import { redirectResponse, signInErrorFor, signInErrorPath, authRouteLogger } from '../../../../lib/sign-in';

export const dynamic = 'force-dynamic';

/**
 * Start GitHub sign-in. Browser-navigated: every outcome is a redirect, never JSON.
 *
 * Signs an `oauth-state` purpose token whose subject is the sanitised `?returnTo` (or
 * `''`), stores it in the `devmentor_oauth_state` cookie and sends the browser to
 * GitHub's authorize URL with it as `state`. A `?login` hint is forwarded only when it
 * is a well-formed GitHub login. Missing `SESSION_SECRET` or GitHub credentials — or any
 * other failure — redirects to `/sign-in?error=unavailable`.
 */
export const GET = apiHandler(async (req) => {
  const query = new URL(req.url).searchParams;
  try {
    return await withScope(async ({ tokenService, identity, env }) => {
      const state = await tokenService.signPurposeToken({
        purpose: OAUTH_STATE_PURPOSE,
        subject: safeReturnTo(query.get('returnTo'), ''),
        ttlSeconds: OAUTH_STATE_TTL_SECONDS,
      });
      const location = identity.authorizeUrl({ state, login: githubLoginHint(query.get('login')) });
      return redirectResponse(location, [oauthStateCookie(state, env)]);
    });
  } catch (error) {
    return redirectResponse(signInErrorPath(signInErrorFor(error, authRouteLogger())));
  }
});
