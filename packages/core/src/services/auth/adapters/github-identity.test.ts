import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableError } from '../../../http/errors';
import type { Logger } from '../../../logger';
import { GithubEmailUnverifiedError } from '../github-identity.port';

const state = vi.hoisted(() => ({
  outboundLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// `fetchJson` logs through its own module-level logger; keep pino out of the test.
vi.mock('../../../logger', () => ({ createLogger: () => state.outboundLogger }));

const {
  GITHUB_EMAILS_URL,
  GITHUB_SCOPE,
  GITHUB_TOKEN_URL,
  GITHUB_USER_URL,
  GithubIdentityAdapter,
} = await import('./github-identity');

const fetchMock = vi.fn<typeof fetch>();
const logger = { warn: vi.fn() };

const configured = {
  APP_NAME: 'DevMentor',
  APP_URL: 'https://devmentor.example',
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
};

function adapter(env: Partial<typeof configured> = configured) {
  return new GithubIdentityAdapter({
    env: { ...configured, ...env },
    logger: logger as unknown as Logger,
  });
}

const githubUser = {
  id: 1234567,
  login: 'ada',
  name: 'Ada Lovelace',
  avatar_url: 'https://avatars.githubusercontent.com/u/1234567',
};

const githubEmails = [
  { email: 'ada@work.example', primary: false, verified: true, visibility: null },
  { email: 'ada@example.com', primary: true, verified: true, visibility: 'public' },
];

/** Answer `/user` and `/user/emails` with the given bodies (or responses). */
function routeApi(user: unknown = githubUser, emails: unknown = githubEmails) {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    const body = url === GITHUB_EMAILS_URL ? emails : user;
    return body instanceof Response ? body : Response.json(body);
  });
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (caught: unknown) => caught,
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  fetchMock.mockReset();
});

describe('GithubIdentityAdapter.authorizeUrl', () => {
  it('builds the GitHub authorize URL with client id, callback, scope and state', () => {
    const url = new URL(adapter().authorizeUrl({ state: 'signed-state' }));

    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://devmentor.example/api/auth/github/callback',
    );
    expect(url.searchParams.get('scope')).toBe(GITHUB_SCOPE);
    expect(GITHUB_SCOPE).toBe('read:user user:email');
    expect(url.searchParams.get('state')).toBe('signed-state');
  });

  it('forwards the login hint to GitHub when one is given', () => {
    const url = new URL(adapter().authorizeUrl({ state: 's', login: 'mock-mentor' }));

    expect(url.searchParams.get('login')).toBe('mock-mentor');
  });

  it.each([undefined, ''])('omits the login parameter for a %j hint', (login) => {
    const url = new URL(adapter().authorizeUrl({ state: 's', login }));

    expect(url.searchParams.has('login')).toBe(false);
  });

  it('never puts the client secret in the URL', () => {
    expect(adapter().authorizeUrl({ state: 's' })).not.toContain('client-secret');
  });

  it.each([
    ['client id', { GITHUB_CLIENT_ID: undefined }],
    ['client secret', { GITHUB_CLIENT_SECRET: undefined }],
  ])('throws a 503 when the %s is missing', (_name, env) => {
    expect(() => adapter(env).authorizeUrl({ state: 's' })).toThrow(ServiceUnavailableError);
    expect(() => adapter(env).authorizeUrl({ state: 's' })).toThrow(
      'GitHub sign-in is not configured.',
    );
  });
});

describe('GithubIdentityAdapter.exchangeCode', () => {
  it('posts the code as JSON and returns the access token', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ access_token: 'gho_token', token_type: 'bearer', scope: GITHUB_SCOPE }),
    );

    await expect(adapter().exchangeCode('the-code')).resolves.toBe('gho_token');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(GITHUB_TOKEN_URL);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': 'DevMentor',
    });
    expect(JSON.parse(init?.body as string)).toEqual({
      client_id: 'client-id',
      client_secret: 'client-secret',
      code: 'the-code',
      redirect_uri: 'https://devmentor.example/api/auth/github/callback',
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws a 503 without calling GitHub when credentials are missing', async () => {
    await expect(adapter({ GITHUB_CLIENT_SECRET: undefined }).exchangeCode('c')).rejects.toThrow(
      ServiceUnavailableError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws a 503 when GitHub answers 200 with an error field', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        error: 'bad_verification_code',
        error_description: 'The code passed is incorrect or expired.',
      }),
    );

    const error = await rejection(adapter().exchangeCode('stale'));

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error).toMatchObject({
      status: 503,
      message: 'GitHub refused the sign-in. Please try again.',
      cause: { reason: 'oauth_error', error: 'bad_verification_code' },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      {
        upstream: {
          error: 'bad_verification_code',
          description: 'The code passed is incorrect or expired.',
        },
      },
      'github token exchange refused',
    );
  });

  it('treats an error alongside a token as a refusal', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: 'incorrect_client_credentials', access_token: 'x', token_type: 'bearer' }),
    );

    await expect(adapter().exchangeCode('c')).rejects.toMatchObject({
      cause: { reason: 'oauth_error', error: 'incorrect_client_credentials' },
    });
  });

  it('throws a 503 when the token exchange answers non-2xx', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 401 }));

    const error = await rejection(adapter().exchangeCode('c'));

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error).toMatchObject({ cause: { reason: 'http_status', status: 401 } });
  });

  it.each([
    ['an empty body', ''],
    ['no access token', JSON.stringify({ token_type: 'bearer' })],
    ['an empty access token', JSON.stringify({ access_token: '', token_type: 'bearer' })],
  ])('throws a 503 for a token response with %s', async (_name, body) => {
    fetchMock.mockResolvedValue(new Response(body, { status: 200 }));

    const error = await rejection(adapter().exchangeCode('c'));

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error).toMatchObject({ cause: { reason: 'invalid_shape', what: 'token exchange' } });
    expect(logger.warn).toHaveBeenCalledWith(
      { upstream: { what: 'token exchange' } },
      'github answered an unexpected shape',
    );
  });

  it('times out instead of hanging when GitHub does not answer', async () => {
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => timeout(5));
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal as AbortSignal;
          signal.addEventListener('abort', () => reject(signal.reason));
        }),
    );

    const error = await rejection(adapter().exchangeCode('c'));

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error).toMatchObject({ cause: { reason: 'timeout' } });
  });
});

describe('GithubIdentityAdapter.fetchIdentity', () => {
  it('reads the profile and the verified primary email', async () => {
    routeApi();

    await expect(adapter().fetchIdentity('gho_token')).resolves.toEqual({
      githubId: '1234567',
      login: 'ada',
      displayName: 'Ada Lovelace',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1234567',
      email: 'ada@example.com',
    });
  });

  it('calls /user and /user/emails with the bearer token and GitHub headers', async () => {
    routeApi();

    await adapter().fetchIdentity('gho_token');

    expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual(
      [GITHUB_EMAILS_URL, GITHUB_USER_URL].sort(),
    );
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.method).toBeUndefined();
      expect(init?.headers).toEqual({
        accept: 'application/vnd.github+json',
        authorization: 'Bearer gho_token',
        'user-agent': 'DevMentor',
        'x-github-api-version': '2022-11-28',
      });
    }
  });

  it.each([
    ['no name', { name: null }],
    ['an absent name', { name: undefined }],
    ['a blank name', { name: '   ' }],
  ])('falls back to the login as the display name for %s', async (_name, patch) => {
    routeApi({ ...githubUser, ...patch });

    await expect(adapter().fetchIdentity('t')).resolves.toMatchObject({ displayName: 'ada' });
  });

  it('trims the display name', async () => {
    routeApi({ ...githubUser, name: '  Ada  ' });

    await expect(adapter().fetchIdentity('t')).resolves.toMatchObject({ displayName: 'Ada' });
  });

  it.each([null, undefined])('reports a %j avatar as null', async (avatar) => {
    routeApi({ ...githubUser, avatar_url: avatar });

    await expect(adapter().fetchIdentity('t')).resolves.toMatchObject({ avatarUrl: null });
  });

  it.each([
    ['the primary email is unverified', [
      { email: 'ada@work.example', primary: false, verified: true },
      { email: 'ada@example.com', primary: true, verified: false },
    ]],
    ['there is no primary email', [{ email: 'ada@work.example', primary: false, verified: true }]],
    ['there are no emails at all', []],
  ])('refuses with GithubEmailUnverifiedError when %s', async (_name, emails) => {
    routeApi(githubUser, emails);

    const error = await rejection(adapter().fetchIdentity('t'));

    expect(error).toBeInstanceOf(GithubEmailUnverifiedError);
    expect(error).toMatchObject({ status: 403, code: 'github_email_unverified' });
  });

  it.each([
    ['/user', GITHUB_USER_URL],
    ['/user/emails', GITHUB_EMAILS_URL],
  ])('throws a 503 when %s answers 5xx', async (_name, failing) => {
    fetchMock.mockImplementation(async (input) =>
      String(input) === failing
        ? new Response('down', { status: 502 })
        : Response.json(String(input) === GITHUB_EMAILS_URL ? githubEmails : githubUser),
    );

    const error = await rejection(adapter().fetchIdentity('t'));

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error).toMatchObject({ cause: { reason: 'http_status', status: 502 } });
  });

  it.each([
    ['user', { login: 'ada' }, githubEmails],
    ['user', { ...githubUser, id: '1234567' }, githubEmails],
    ['user emails', githubUser, { email: 'ada@example.com' }],
    ['user emails', githubUser, [{ email: 'ada@example.com', primary: 'yes', verified: true }]],
  ])('throws a 503 for a malformed %s response', async (what, user, emails) => {
    routeApi(user, emails);

    const error = await rejection(adapter().fetchIdentity('t'));

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error).toMatchObject({ cause: { reason: 'invalid_shape', what } });
  });
});
