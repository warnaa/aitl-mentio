import { z } from 'zod';
import type { AppEnv } from '../../../config/env';
import { ServiceUnavailableError } from '../../../http/errors';
import { fetchJson } from '../../../http/outbound';
import type { Logger } from '../../../logger';
import {
  githubCallbackUrl,
  GithubEmailUnverifiedError,
  type AuthorizeUrlInput,
  type GithubIdentity,
  type GithubIdentityPort,
} from '../github-identity.port';

export const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const GITHUB_USER_URL = 'https://api.github.com/user';
export const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

/** `read:user` for the profile, `user:email` for the verified primary address. */
export const GITHUB_SCOPE = 'read:user user:email';

/**
 * GitHub answers the token exchange with 200 even when it refuses the code; the
 * refusal is an `error` field (`bad_verification_code`, `incorrect_client_credentials`,
 * `redirect_uri_mismatch`, ...).
 */
const tokenResponseSchema = z.union([
  z.object({ error: z.string(), error_description: z.string().optional() }),
  z.object({ access_token: z.string().min(1), token_type: z.string() }),
]);

const userSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().min(1),
  name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

const emailsSchema = z.array(
  z.object({ email: z.string().min(1), primary: z.boolean(), verified: z.boolean() }),
);

type GithubEnv = Pick<AppEnv, 'APP_NAME' | 'APP_URL' | 'GITHUB_CLIENT_ID' | 'GITHUB_CLIENT_SECRET'>;

interface Credentials {
  clientId: string;
  clientSecret: string;
}

/**
 * The real GitHub OAuth adapter: three calls under the outbound policy (`fetchJson`'s
 * 10 s timeout and log redaction), no SDK. Missing credentials never stop the app from
 * booting; each call checks them and fails closed with a 503 (primitives spec B6).
 */
export class GithubIdentityAdapter implements GithubIdentityPort {
  private readonly env: GithubEnv;
  private readonly logger: Logger;

  constructor({ env, logger }: { env: GithubEnv; logger: Logger }) {
    this.env = env;
    this.logger = logger;
  }

  authorizeUrl({ state, login }: AuthorizeUrlInput): string {
    const { clientId } = this.credentials();
    const url = new URL(GITHUB_AUTHORIZE_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', githubCallbackUrl(this.env.APP_URL));
    url.searchParams.set('scope', GITHUB_SCOPE);
    url.searchParams.set('state', state);
    if (login) {
      url.searchParams.set('login', login);
    }
    return url.toString();
  }

  async exchangeCode(code: string): Promise<string> {
    const { clientId, clientSecret } = this.credentials();
    const body = await fetchJson<unknown>(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'user-agent': this.env.APP_NAME,
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: githubCallbackUrl(this.env.APP_URL),
      }),
    });

    const parsed = tokenResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw this.malformed('token exchange');
    }
    if ('error' in parsed.data) {
      // The code and description are GitHub's own words; neither carries a secret.
      const { error, error_description: description } = parsed.data;
      this.logger.warn({ upstream: { error, description } }, 'github token exchange refused');
      throw new ServiceUnavailableError('GitHub refused the sign-in. Please try again.', {
        cause: { reason: 'oauth_error', error },
      });
    }
    return parsed.data.access_token;
  }

  async fetchIdentity(accessToken: string): Promise<GithubIdentity> {
    const init = {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${accessToken}`,
        'user-agent': this.env.APP_NAME,
        'x-github-api-version': '2022-11-28',
      },
    };
    const [userBody, emailsBody] = await Promise.all([
      fetchJson<unknown>(GITHUB_USER_URL, init),
      fetchJson<unknown>(GITHUB_EMAILS_URL, init),
    ]);

    const user = userSchema.safeParse(userBody);
    if (!user.success) {
      throw this.malformed('user');
    }
    const emails = emailsSchema.safeParse(emailsBody);
    if (!emails.success) {
      throw this.malformed('user emails');
    }

    // Only the primary address counts, and only when verified: a verified secondary
    // address is not the one the user chose to be reached at.
    const primary = emails.data.find((entry) => entry.primary);
    if (!primary?.verified) {
      throw new GithubEmailUnverifiedError();
    }

    const name = user.data.name?.trim();
    return {
      githubId: String(user.data.id),
      login: user.data.login,
      displayName: name ? name : user.data.login,
      avatarUrl: user.data.avatar_url ?? null,
      email: primary.email,
    };
  }

  private credentials(): Credentials {
    const { GITHUB_CLIENT_ID: clientId, GITHUB_CLIENT_SECRET: clientSecret } = this.env;
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableError('GitHub sign-in is not configured.');
    }
    return { clientId, clientSecret };
  }

  private malformed(what: string): ServiceUnavailableError {
    this.logger.warn({ upstream: { what } }, 'github answered an unexpected shape');
    return new ServiceUnavailableError(undefined, { cause: { reason: 'invalid_shape', what } });
  }
}
