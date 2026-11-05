import { AppError } from '../../http/errors';

/** Where GitHub (or the mock) sends the browser back; registered on the OAuth app. */
export const GITHUB_CALLBACK_PATH = '/api/auth/github/callback';

/** The callback URL for an app served at `appUrl` (no trailing slash, per `APP_URL`). */
export function githubCallbackUrl(appUrl: string): string {
  return `${appUrl}${GITHUB_CALLBACK_PATH}`;
}

/**
 * GitHub's login alphabet: 1 to 39 letters, digits or hyphens. The start route forwards
 * a `?login` hint only when it matches, and the mock adapter derives personas under the
 * same rule.
 */
export const GITHUB_LOGIN_PATTERN = /^[A-Za-z0-9-]{1,39}$/;

/** `value` when it is a well-formed GitHub login, else `undefined` (the hint is dropped). */
export function githubLoginHint(value: string | null | undefined): string | undefined {
  return value != null && GITHUB_LOGIN_PATTERN.test(value) ? value : undefined;
}

/** What the sign-in flow learns about a GitHub account. */
export interface GithubIdentity {
  /** GitHub's numeric account id, as a decimal string. The stable identity. */
  githubId: string;
  /** The current login. Display only: a login can be renamed. */
  login: string;
  /** The account's name, or its login when no name is set. */
  displayName: string;
  avatarUrl: string | null;
  /** The account's primary email address, which GitHub reports as verified. */
  email: string;
}

export interface AuthorizeUrlInput {
  /** The signed OAuth `state`, echoed back to the callback. */
  state: string;
  /** GitHub's own `login` hint, which pre-selects an account. Validated by the caller. */
  login?: string;
}

/**
 * The GitHub sign-in seam (primitives spec B14). The real adapter talks to GitHub; the
 * mock, selected only by `AUTH_IDENTITY_ADAPTER=mock` plus `INTEGRATION_TEST_RUN=1`,
 * derives a persona from the `login` hint so the integration harness can sign in
 * without the network. Routes depend on this shape only, never on an adapter.
 */
export interface GithubIdentityPort {
  /**
   * The URL the start route redirects the browser to.
   *
   * @throws ServiceUnavailableError when GitHub sign-in is not configured.
   */
  authorizeUrl(input: AuthorizeUrlInput): string;
  /**
   * Trade the callback's `code` for an access token.
   *
   * @throws ServiceUnavailableError when not configured, or when GitHub fails, times
   * out, or refuses the code.
   */
  exchangeCode(code: string): Promise<string>;
  /**
   * Read the account behind `accessToken`.
   *
   * @throws GithubEmailUnverifiedError when the account has no verified primary email.
   * @throws ServiceUnavailableError when GitHub fails, times out, or answers malformed.
   */
  fetchIdentity(accessToken: string): Promise<GithubIdentity>;
}

/**
 * The GitHub account has no primary email that GitHub reports as verified, so it
 * cannot be linked to or create an account (E01 edge case 3). Nothing is created; the
 * callback route recognises this error and tells the user why.
 */
export class GithubEmailUnverifiedError extends AppError {
  static override readonly code = 'github_email_unverified';

  constructor(
    message = 'Your GitHub account has no verified primary email address. Verify it on GitHub, then sign in again.',
  ) {
    super(message, 403, GithubEmailUnverifiedError.code);
  }
}
