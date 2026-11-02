import {
  createLogger,
  GithubAccountConflictError,
  GithubEmailUnverifiedError,
  ServiceUnavailableError,
  UnverifiedAccountLinkError,
  type Logger,
} from '@devmentor/core';

/**
 * Shared pieces of the browser-navigated sign-in routes (`/api/auth/github` and its
 * callback). Those routes never answer with a JSON envelope: a user who clicked "Sign in
 * with GitHub" is always sent somewhere a page renders, with the failure reason in the
 * query for `/sign-in` to explain.
 */
export const SIGN_IN_PATH = '/sign-in';

/** Where a user who cancelled on GitHub's consent screen lands. Nothing was created. */
export const SIGN_IN_CANCELLED_PATH = `${SIGN_IN_PATH}?cancelled=1`;

/**
 * The `?error=` reasons the GitHub sign-in routes send to `/sign-in`:
 * - `unavailable` — sign-in is not configured, GitHub failed or timed out, or something
 *   unexpected went wrong (logged);
 * - `state` — the OAuth state was missing, did not match this browser, or expired;
 * - `email` — the GitHub account has no verified primary email;
 * - `unverified` — the email belongs to an account whose address is not verified yet;
 * - `conflict` — the email's account is linked to a different GitHub account.
 */
export const SIGN_IN_ERRORS = ['unavailable', 'state', 'email', 'unverified', 'conflict'] as const;

export type SignInError = (typeof SIGN_IN_ERRORS)[number];

export function signInErrorPath(reason: SignInError): string {
  return `${SIGN_IN_PATH}?error=${reason}`;
}

/**
 * A 302 to `location`, carrying each of `setCookies` as its own `Set-Cookie` header.
 * `Response.redirect()` cannot carry `Set-Cookie`, hence a plain `Response`.
 *
 * Our own pages are addressed with a **relative** `Location` (RFC 9110 allows it): the
 * browser resolves it against the URL it actually requested, so the redirect is right
 * behind a reverse proxy, where `req.url` may name an internal host, and does not depend
 * on `APP_URL` matching the address the user typed. Only GitHub's authorize URL is
 * absolute.
 */
export function redirectResponse(location: string, setCookies: readonly string[] = []): Response {
  const headers = new Headers({ location });
  for (const cookie of setCookies) {
    headers.append('set-cookie', cookie);
  }
  return new Response(null, { status: 302, headers });
}

/**
 * The `/sign-in` reason for an error thrown during GitHub sign-in. The expected refusals
 * map to their own reasons; a `ServiceUnavailableError` (missing configuration, GitHub
 * down or slow) is logged as a warning; anything else is logged as an error and still
 * becomes `unavailable`, never a JSON envelope or a stack trace in the browser.
 */
export function signInErrorFor(error: unknown, logger: Pick<Logger, 'warn' | 'error'>): SignInError {
  if (error instanceof GithubEmailUnverifiedError) {
    return 'email';
  }
  if (error instanceof UnverifiedAccountLinkError) {
    return 'unverified';
  }
  if (error instanceof GithubAccountConflictError) {
    return 'conflict';
  }
  if (error instanceof ServiceUnavailableError) {
    logger.warn({ err: error }, 'GitHub sign-in unavailable');
    return 'unavailable';
  }
  logger.error({ err: error }, 'unexpected GitHub sign-in failure');
  return 'unavailable';
}

let cachedLogger: Logger | undefined;

/** The auth routes' logger, created on first use (it must work without a container). */
export function authRouteLogger(): Logger {
  return (cachedLogger ??= createLogger());
}
