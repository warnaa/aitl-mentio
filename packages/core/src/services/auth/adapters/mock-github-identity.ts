import type { AppEnv } from '../../../config/env';
import { ServiceUnavailableError } from '../../../http/errors';
import {
  GITHUB_LOGIN_PATTERN,
  githubCallbackUrl,
  type AuthorizeUrlInput,
  type GithubIdentity,
  type GithubIdentityPort,
} from '../github-identity.port';

/** The persona used when the start route forwards no `login` hint. */
export const MOCK_DEFAULT_LOGIN = 'mock-mentee';

/** Every mock persona's verified primary email is `<login>@` this domain. */
export const MOCK_EMAIL_DOMAIN = 'devmentor.test';

export const MOCK_CODE_PREFIX = 'mock-code.';
export const MOCK_TOKEN_PREFIX = 'mock-token.';

/** FNV-1a (32-bit): a small, dependency-free, deterministic hash for a stable id. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function loginFrom(value: string, prefix: string): string {
  const login = value.startsWith(prefix) ? value.slice(prefix.length) : '';
  if (!GITHUB_LOGIN_PATTERN.test(login)) {
    throw new ServiceUnavailableError('The mock GitHub sign-in did not recognise this request.');
  }
  return login.toLowerCase();
}

/**
 * The integration harness's GitHub (primitives spec B14). It never touches the
 * network: `authorizeUrl` sends the browser straight to our own callback with a code
 * that encodes the persona, and the persona is derived from the `login` hint alone —
 * a stable numeric id, that login, and `<login>@devmentor.test` as the verified primary
 * email. Logins are case-insensitive, as on GitHub.
 *
 * Selected only when `AUTH_IDENTITY_ADAPTER=mock` and `INTEGRATION_TEST_RUN=1`; the env
 * schema refuses the first without the second, and as defence in depth this adapter
 * refuses to exist outside an integration run.
 */
export class MockGithubIdentityAdapter implements GithubIdentityPort {
  private readonly appUrl: string;

  constructor({ env }: { env: Pick<AppEnv, 'APP_URL' | 'INTEGRATION_TEST_RUN'> }) {
    if (!env.INTEGRATION_TEST_RUN) {
      throw new Error(
        'The mock GitHub identity adapter lets anyone sign in as anyone; it is refused unless INTEGRATION_TEST_RUN=1',
      );
    }
    this.appUrl = env.APP_URL;
  }

  authorizeUrl({ state, login }: AuthorizeUrlInput): string {
    const url = new URL(githubCallbackUrl(this.appUrl));
    url.searchParams.set('code', `${MOCK_CODE_PREFIX}${login || MOCK_DEFAULT_LOGIN}`);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCode(code: string): Promise<string> {
    return `${MOCK_TOKEN_PREFIX}${loginFrom(code, MOCK_CODE_PREFIX)}`;
  }

  async fetchIdentity(accessToken: string): Promise<GithubIdentity> {
    const login = loginFrom(accessToken, MOCK_TOKEN_PREFIX);
    return {
      githubId: String(fnv1a(login)),
      login,
      displayName: login,
      avatarUrl: null,
      email: `${login}@${MOCK_EMAIL_DOMAIN}`,
    };
  }
}
