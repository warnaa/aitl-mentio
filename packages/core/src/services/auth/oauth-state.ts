import type { AppEnv } from '../../config/env';
import { readCookie, serializeCookie } from '../../http/cookies';
import { GITHUB_CALLBACK_PATH } from './github-identity.port';

/**
 * The GitHub OAuth `state` round trip (E01, "GitHub OAuth flow"). The start route signs
 * a purpose token whose subject is the sanitised `returnTo`, sends it to GitHub as
 * `state` and also stores it in this cookie; the callback accepts the sign-in only when
 * the `?state` GitHub echoes equals the cookie (that comparison binds the attempt to this
 * browser and stops login CSRF) **and** the token verifies (that proves we issued it and
 * it has not expired).
 */
export const OAUTH_STATE_COOKIE_NAME = 'devmentor_oauth_state';

/** The purpose (`aud`) of the state token; never accepted for anything else. */
export const OAUTH_STATE_PURPOSE = 'oauth-state';

/** Ten minutes to finish the GitHub round trip, for both the token and the cookie. */
export const OAUTH_STATE_TTL_SECONDS = 600;

/**
 * The cookie is scoped to the callback, the only route that reads it, so it rides on no
 * other request. A browser may set a cookie for a path other than the one that set it.
 */
export const OAUTH_STATE_COOKIE_PATH = GITHUB_CALLBACK_PATH;

/**
 * The `Set-Cookie` value carrying `state`: `HttpOnly`, `SameSite=Lax` — never `Strict`,
 * because the callback is a cross-site top-level navigation from github.com and a
 * `Strict` cookie would not be sent — and `Secure` only in production.
 */
export function oauthStateCookie(state: string, env: Pick<AppEnv, 'NODE_ENV'>): string {
  return serializeCookie(OAUTH_STATE_COOKIE_NAME, state, {
    path: OAUTH_STATE_COOKIE_PATH,
    maxAgeSeconds: OAUTH_STATE_TTL_SECONDS,
    secure: env.NODE_ENV === 'production',
  });
}

/** The `Set-Cookie` value that removes the state cookie. The callback always sends it. */
export function clearOAuthStateCookie(env: Pick<AppEnv, 'NODE_ENV'>): string {
  return serializeCookie(OAUTH_STATE_COOKIE_NAME, '', {
    path: OAUTH_STATE_COOKIE_PATH,
    maxAgeSeconds: 0,
    expiresAt: new Date(0),
    secure: env.NODE_ENV === 'production',
  });
}

/** The raw state cookie from a `Cookie` request header, or `null`. Untrusted. */
export function readOAuthStateCookie(cookieHeader: string | null | undefined): string | null {
  return readCookie(cookieHeader, OAUTH_STATE_COOKIE_NAME);
}
