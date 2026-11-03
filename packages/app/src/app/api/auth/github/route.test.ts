import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Drives the real start route through the real container, `TokenService` and the mock
 * GitHub adapter (selected by the two-flag rule); only the database is replaced, and
 * this route never touches it.
 */
vi.mock('@devmentor/db', () => ({
  User: class User {},
  UniqueConstraintViolationException: class UniqueConstraintViolationException extends Error {},
  getOrm: async () => ({ em: { fork: () => ({}) } }),
}));

vi.stubEnv('SESSION_SECRET', 'start-route-secret-start-route-secret');
vi.stubEnv('AUTH_IDENTITY_ADAPTER', 'mock');
vi.stubEnv('INTEGRATION_TEST_RUN', '1');
vi.stubEnv('APP_URL', 'http://devmentor.test');
vi.stubEnv('LOG_LEVEL', 'silent');

const { getContainer, getEnv, ServiceUnavailableError } = await import('@devmentor/core');
const route = await import('./route');
const { cradle } = await getContainer();

async function start(query = ''): Promise<Response> {
  return route.GET(new Request(`http://internal:3000/api/auth/github${query}`), undefined as never);
}

/** The `state` sent to GitHub, the state cookie, and the subject the token vouches for. */
async function stateOf(response: Response) {
  const location = new URL(response.headers.get('location')!);
  const state = location.searchParams.get('state')!;
  const { subject } = await cradle.tokenService.verifyPurposeToken(state, 'oauth-state');
  return { location, state, subject, cookie: response.headers.getSetCookie()[0]! };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/auth/github', () => {
  it('is a dynamic route exposing GET only', () => {
    expect(route.dynamic).toBe('force-dynamic');
    expect(Object.keys(route).sort()).toEqual(['GET', 'dynamic']);
  });

  it('redirects to the authorize URL with a signed state that matches the state cookie', async () => {
    const response = await start();

    expect(response.status).toBe(302);
    const { location, state, subject, cookie } = await stateOf(response);
    expect(`${location.origin}${location.pathname}`).toBe('http://devmentor.test/api/auth/github/callback');
    expect(location.searchParams.get('code')).toBe('mock-code.mock-mentee');
    expect(subject).toBe('');
    expect(response.headers.getSetCookie()).toHaveLength(1);
    expect(cookie).toBe(
      `devmentor_oauth_state=${state}; Path=/api/auth/github/callback; Max-Age=600; HttpOnly; SameSite=Lax`,
    );
  });

  it('marks the state cookie Secure in production, and never Strict', async () => {
    const env = getEnv();
    const previous = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      const { cookie } = await stateOf(await start());
      expect(cookie).toMatch(/; HttpOnly; SameSite=Lax; Secure$/);
      expect(cookie).not.toMatch(/Strict/);
    } finally {
      env.NODE_ENV = previous;
    }
  });

  it('carries a sanitised returnTo as the state subject', async () => {
    await expect(stateOf(await start('?returnTo=%2Fmentor%2Fslots%3Fweek%3D2'))).resolves.toMatchObject({
      subject: '/mentor/slots?week=2',
    });
  });

  it.each(['//evil.example', 'https://evil.example/home', '/api/users', '/_next/static/x.js'])(
    'drops an unsafe returnTo %s',
    async (returnTo) => {
      const { subject } = await stateOf(await start(`?returnTo=${encodeURIComponent(returnTo)}`));
      expect(subject).toBe('');
    },
  );

  it('forwards a well-formed login hint', async () => {
    const authorizeUrl = vi.spyOn(cradle.identity, 'authorizeUrl');

    const { location } = await stateOf(await start('?login=mock-operator'));

    expect(authorizeUrl).toHaveBeenCalledWith(expect.objectContaining({ login: 'mock-operator' }));
    expect(location.searchParams.get('code')).toBe('mock-code.mock-operator');
  });

  it.each(['mock operator', '../admin', 'x'.repeat(40), 'evil.example', ''])(
    'drops a malformed login hint %j',
    async (login) => {
      const authorizeUrl = vi.spyOn(cradle.identity, 'authorizeUrl');

      const { location } = await stateOf(await start(`?login=${encodeURIComponent(login)}`));

      expect(authorizeUrl).toHaveBeenCalledWith({ state: expect.any(String), login: undefined });
      expect(location.searchParams.get('code')).toBe('mock-code.mock-mentee');
    },
  );

  it('redirects to /sign-in?error=unavailable, not JSON, when GitHub sign-in is not configured', async () => {
    vi.spyOn(cradle.identity, 'authorizeUrl').mockImplementation(() => {
      throw new ServiceUnavailableError('GitHub sign-in is not configured');
    });

    const response = await start();

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/sign-in?error=unavailable');
    expect(response.headers.get('content-type')).toBeNull();
    expect(response.headers.getSetCookie()).toEqual([]);
    await expect(response.text()).resolves.toBe('');
  });

  it('redirects to unavailable when SESSION_SECRET is missing', async () => {
    vi.spyOn(cradle.tokenService, 'signPurposeToken').mockRejectedValue(new ServiceUnavailableError());

    const response = await start();

    expect(response.headers.get('location')).toBe('/sign-in?error=unavailable');
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it('redirects to unavailable on anything unexpected', async () => {
    vi.spyOn(cradle.tokenService, 'signPurposeToken').mockRejectedValue(new Error('boom'));

    const response = await start();

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/sign-in?error=unavailable');
  });
});
