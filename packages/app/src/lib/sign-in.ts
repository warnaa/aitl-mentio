import {
  createLogger,
  GithubAccountConflictError,
  GithubEmailUnverifiedError,
  safeReturnTo,
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

export function signInErrorPath(reason: SignInNoticeReason): string {
  return `${SIGN_IN_PATH}?error=${reason}`;
}

/** Where an already-verified link lands: confirmed, but no session (edge case 16). */
export const SIGN_IN_VERIFIED_PATH = `${SIGN_IN_PATH}?verified=1`;

/**
 * Every `?error=` reason `/sign-in` explains: the GitHub routes' reasons plus the two
 * the email-verification route sends — `verification` (an expired, invalid or
 * superseded link) and `verification-unavailable` (the link could not be checked).
 */
export type SignInNoticeReason = SignInError | 'verification' | 'verification-unavailable';

export const SIGN_IN_CANCELLED_NOTICE = 'Sign-in was cancelled. No account was created.';

/**
 * What `/sign-in` says for each reason. A `Record` over the union, so a reason added to
 * `SIGN_IN_ERRORS` without copy fails to typecheck. Email sign-in is not available
 * until Slice 4, so no message sends anyone to the email form.
 */
export const SIGN_IN_NOTICES: Readonly<Record<SignInNoticeReason, string>> = {
  unavailable:
    'GitHub sign-in is unavailable right now. It may not be configured yet, or GitHub did not respond. Try again in a few minutes.',
  state: 'This sign-in attempt expired or was started in another browser. Sign in with GitHub again.',
  email:
    'Your GitHub account has no verified primary email address. Verify one in your GitHub email settings, then sign in again. No account was created.',
  unverified:
    'A DevMentor account with this email address is waiting for email verification, so GitHub was not connected to it. Open the verification link sent to that address first, then sign in with GitHub.',
  conflict:
    'This email address belongs to a DevMentor account connected to a different GitHub account. Sign in with that GitHub account instead.',
  verification:
    'This verification link has expired or is not valid. Register again with the same email address to get a new link, or sign in if you already confirmed it.',
  'verification-unavailable':
    'We could not confirm your email address right now. Open the link from your email again in a few minutes.',
};

/** What `/sign-in?verified=1` says. */
export const SIGN_IN_VERIFIED_NOTICE = 'Your email address is confirmed. Sign in to continue.';

const isNoticeReason = (value: string): value is SignInNoticeReason => Object.hasOwn(SIGN_IN_NOTICES, value);

/**
 * The notice for `/sign-in`'s query, or `null` when there is nothing to say. A known
 * `?error=` wins over `?cancelled=1` (the routes never send both); an unknown error or
 * any other `cancelled` value is ignored rather than echoed.
 */
export function signInNotice(query: { cancelled?: string; error?: string; verified?: string }): string | null {
  if (query.error !== undefined && isNoticeReason(query.error)) {
    return SIGN_IN_NOTICES[query.error];
  }
  if (query.verified === '1') {
    return SIGN_IN_VERIFIED_NOTICE;
  }
  return query.cancelled === '1' ? SIGN_IN_CANCELLED_NOTICE : null;
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

/** The GitHub start route. Reached by navigation, never by fetch: it answers with redirects. */
export const GITHUB_SIGN_IN_PATH = '/api/auth/github';

/**
 * The "Sign in with GitHub" link: `/api/auth/github`, carrying `returnTo` only when
 * `safeReturnTo` accepts it as a page path. The start route sanitises it again.
 */
export function githubSignInHref(returnTo: string | undefined): string {
  const safe = safeReturnTo(returnTo, '');
  return safe ? `${GITHUB_SIGN_IN_PATH}?returnTo=${encodeURIComponent(safe)}` : GITHUB_SIGN_IN_PATH;
}
