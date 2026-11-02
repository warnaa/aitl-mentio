import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Drives the real start and callback routes through the real container, `TokenService`,
 * `SessionService`, `UserService` and the mock GitHub adapter; only the database is an
 * in-memory fake. Outbound GitHub calls are spied on through the adapter, so "no
 * outbound call" is asserted on `exchangeCode`.
 */
const db = vi.hoisted(() => {
  interface Row {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
    githubId: string | null;
    githubLogin: string | null;
    avatarUrl: string | null;
    emailVerifiedAt: Date | null;
    sessionVersion: number;
    createdAt: Date;
  }
  const rows: Row[] = [];
  let created = 0;
  const unescapeLike = (pattern: string) => pattern.replace(/\\(.)/g, '$1');
  const em = {
    findOne: async (_entity: unknown, where: Record<string, unknown>) => {
      const [key, value] = Object.entries(where)[0]!;
      return rows.find((row) => row[key as keyof Row] === value) ?? null;
    },
    find: async (_entity: unknown, where: { email: { $ilike: string } }) => {
      const email = unescapeLike(where.email.$ilike).toLowerCase();
      return rows.filter((row) => row.email.toLowerCase() === email);
    },
    create: (_entity: unknown, data: Partial<Row>) => {
      created += 1;
      return { id: `created-${created}`, createdAt: new Date(), ...data } as Row;
    },
    persist: (row: Row) => {
      rows.push(row);
    },
    flush: async () => undefined,
    nativeUpdate: async (_entity: unknown, where: { id: string; sessionVersion: number }, data: Partial<Row>) => {
      const target = rows.find((row) => row.id === where.id && row.sessionVersion === where.sessionVersion);
      if (!target) {
        return 0;
      }
      Object.assign(target, data);
      return 1;
    },
    transactional: async <T>(fn: (inner: unknown) => Promise<T>) => fn(em),
  };
  return {
    rows,
    seed(row: Partial<Row> & { email: string }): Row {
      const full: Row = {
        id: `seeded-${rows.length + 1}`,
        displayName: row.email,
        roles: ['mentee'],
        githubId: null,
        githubLogin: null,
        avatarUrl: null,
        emailVerifiedAt: new Date('2026-10-01T00:00:00.000Z'),
        sessionVersion: 0,
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        ...row,
      };
      rows.push(full);
      return full;
    },
    module: {
      User: class User {},
      UniqueConstraintViolationException: class UniqueConstraintViolationException extends Error {},
      getOrm: async () => ({ em: { fork: () => em } }),
    },
  };
});
vi.mock('@devmentor/db', () => db.module);

vi.stubEnv('SESSION_SECRET', 'callback-route-secret-callback-route-secret');
vi.stubEnv('AUTH_IDENTITY_ADAPTER', 'mock');
vi.stubEnv('INTEGRATION_TEST_RUN', '1');
vi.stubEnv('APP_URL', 'http://devmentor.test');
vi.stubEnv('OPERATOR_EMAILS', 'mock-operator@devmentor.test, mock-both@devmentor.test');
vi.stubEnv('LOG_LEVEL', 'silent');

const {
  getContainer,
  getEnv,
  GithubEmailUnverifiedError,
  ServiceUnavailableError,
  UserService,
} = await import('@devmentor/core');
const startRoute = await import('../route');
const route = await import('./route');
const { cradle } = await getContainer();

const CLEAR_STATE =
  'devmentor_oauth_state=; Path=/api/auth/github/callback; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax';

/** Run the start route; return the callback query GitHub would send back and the state cookie. */
async function begin(query = ''): Promise<{ params: URLSearchParams; cookie: string }> {
  const response = await startRoute.GET(new Request(`http://devmentor.test/api/auth/github${query}`), undefined as never);
  const params = new URL(response.headers.get('location')!).searchParams;
  return { params, cookie: response.headers.getSetCookie()[0]!.split(';')[0]! };
}

async function callback(params: URLSearchParams | string, cookie?: string): Promise<Response> {
  const headers = new Headers(cookie ? { cookie } : {});
  return route.GET(
    new Request(`http://devmentor.test/api/auth/github/callback?${params.toString()}`, { headers }),
    undefined as never,
  );
}

async function signInAs(login: string, returnTo?: string): Promise<Response> {
  const query = new URLSearchParams({ login, ...(returnTo === undefined ? {} : { returnTo }) });
  const { params, cookie } = await begin(`?${query.toString()}`);
  return callback(params, cookie);
}

let exchangeCode: ReturnType<typeof vi.spyOn>;
let findOrCreate: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  db.rows.length = 0;
  exchangeCode = vi.spyOn(cradle.identity, 'exchangeCode');
  findOrCreate = vi.spyOn(UserService.prototype, 'findOrCreateFromGithub');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function expectFailure(response: Response, location: string): void {
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe(location);
  expect(response.headers.get('content-type')).toBeNull();
  // Only the state cookie is cleared; no session is issued.
  expect(response.headers.getSetCookie()).toEqual([CLEAR_STATE]);
}

describe('GET /api/auth/github/callback', () => {
  it('is a dynamic route exposing GET only', () => {
    expect(route.dynamic).toBe('force-dynamic');
    expect(Object.keys(route).sort()).toEqual(['GET', 'dynamic']);
  });

  describe('happy path', () => {
    it('creates a mentee, sets the session cookie, clears the state cookie and lands on /home', async () => {
      const response = await signInAs('mock-mentee');

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/home');
      const [session, clear] = response.headers.getSetCookie();
      expect(session).toMatch(/^devmentor_session=[^;]+; Path=\/; Expires=.+; Max-Age=86400; HttpOnly; SameSite=Lax$/);
      expect(clear).toBe(CLEAR_STATE);
      expect(db.rows).toHaveLength(1);
      expect(db.rows[0]).toMatchObject({ email: 'mock-mentee@devmentor.test', roles: ['mentee'] });
      const claims = await cradle.sessionService.verify(session!.split(';')[0]!.slice('devmentor_session='.length));
      expect(claims).toMatchObject({ userId: db.rows[0]!.id, sessionVersion: 0 });
    });

    it('lands a mentor on /mentor, linking the verified row with the same email', async () => {
      const mentor = db.seed({ email: 'mock-mentor@devmentor.test', roles: ['mentor'] });

      const response = await signInAs('mock-mentor');

      expect(response.headers.get('location')).toBe('/mentor');
      expect(db.rows).toHaveLength(1);
      expect(mentor.githubLogin).toBe('mock-mentor');
    });

    it('lands an allowlisted operator on /admin', async () => {
      const response = await signInAs('mock-operator');
      expect(response.headers.get('location')).toBe('/admin');
    });

    it('lands a combined mentor/operator on /admin', async () => {
      db.seed({ email: 'mock-both@devmentor.test', roles: ['mentor'] });

      const response = await signInAs('mock-both');

      expect(response.headers.get('location')).toBe('/admin');
      expect(db.rows[0]!.roles).toEqual(['mentor', 'operator']);
    });

    it('honours a safe returnTo', async () => {
      const response = await signInAs('mock-mentee', '/mentors/42?tab=reviews');

      expect(response.headers.get('location')).toBe('/mentors/42?tab=reviews');
    });

    it.each(['//evil.example', 'https://evil.example', '/api/users', '/_next/static/x.js'])(
      'falls back to the role home for an unsafe returnTo %s',
      async (returnTo) => {
        const response = await signInAs('mock-mentee', returnTo);

        expect(response.headers.get('location')).toBe('/home');
      },
    );

    it('re-sanitises the state subject even when the token itself is genuine', async () => {
      const state = await cradle.tokenService.signPurposeToken({
        purpose: 'oauth-state',
        subject: '//evil.example',
        ttlSeconds: 600,
      });

      const response = await callback(
        new URLSearchParams({ code: 'mock-code.mock-mentee', state }),
        `devmentor_oauth_state=${state}`,
      );

      expect(response.headers.get('location')).toBe('/home');
    });

    it('marks the session and the cleared state cookie Secure in production', async () => {
      const env = getEnv();
      const previous = env.NODE_ENV;
      env.NODE_ENV = 'production';
      try {
        const cookies = (await signInAs('mock-mentee')).headers.getSetCookie();
        expect(cookies).toHaveLength(2);
        for (const cookie of cookies) {
          expect(cookie).toMatch(/; HttpOnly; SameSite=Lax; Secure$/);
        }
      } finally {
        env.NODE_ENV = previous;
      }
    });
  });

  describe('cancelled and GitHub errors', () => {
    it('redirects a cancelled authorisation to /sign-in?cancelled=1 and creates nothing', async () => {
      const { params, cookie } = await begin();

      const response = await callback(
        new URLSearchParams({ error: 'access_denied', state: params.get('state')! }),
        cookie,
      );

      expectFailure(response, '/sign-in?cancelled=1');
      expect(exchangeCode).not.toHaveBeenCalled();
      expect(findOrCreate).not.toHaveBeenCalled();
      expect(db.rows).toHaveLength(0);
    });

    it('treats any other GitHub error as unavailable', async () => {
      const response = await callback('error=redirect_uri_mismatch');

      expectFailure(response, '/sign-in?error=unavailable');
      expect(exchangeCode).not.toHaveBeenCalled();
    });
  });

  describe('state', () => {
    it('rejects a missing state cookie without an outbound call', async () => {
      const { params } = await begin();

      expectFailure(await callback(params), '/sign-in?error=state');
      expect(exchangeCode).not.toHaveBeenCalled();
    });

    it('rejects a missing state parameter without an outbound call', async () => {
      const { cookie } = await begin();

      expectFailure(await callback('code=mock-code.mock-mentee', cookie), '/sign-in?error=state');
      expect(exchangeCode).not.toHaveBeenCalled();
    });

    it('rejects a state that does not match this browser’s cookie (login CSRF)', async () => {
      const attacker = await begin();
      const victim = await begin();

      expectFailure(await callback(attacker.params, victim.cookie), '/sign-in?error=state');
      expect(exchangeCode).not.toHaveBeenCalled();
    });

    it('rejects a missing code', async () => {
      const { params, cookie } = await begin();
      params.delete('code');

      expectFailure(await callback(params, cookie), '/sign-in?error=state');
      expect(exchangeCode).not.toHaveBeenCalled();
    });

    it('rejects an expired state without an outbound call', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.now() - 11 * 60 * 1000);
      const { params, cookie } = await begin();
      vi.useRealTimers();

      expectFailure(await callback(params, cookie), '/sign-in?error=state');
      expect(exchangeCode).not.toHaveBeenCalled();
    });

    it('rejects a forged state even when cookie and parameter agree', async () => {
      const forged = 'forged.state.token';

      const response = await callback(
        new URLSearchParams({ code: 'mock-code.mock-mentee', state: forged }),
        `devmentor_oauth_state=${forged}`,
      );

      expectFailure(response, '/sign-in?error=state');
      expect(exchangeCode).not.toHaveBeenCalled();
    });
  });

  describe('failure reasons', () => {
    it('maps a GitHub outage or timeout to unavailable and creates nothing', async () => {
      exchangeCode.mockRejectedValue(new ServiceUnavailableError('GitHub timed out'));

      expectFailure(await signInAs('mock-mentee'), '/sign-in?error=unavailable');
      expect(db.rows).toHaveLength(0);
    });

    it('maps a missing secret at verification time to unavailable', async () => {
      vi.spyOn(cradle.tokenService, 'verifyPurposeToken').mockRejectedValue(new ServiceUnavailableError());

      expectFailure(await signInAs('mock-mentee'), '/sign-in?error=unavailable');
      expect(exchangeCode).not.toHaveBeenCalled();
    });

    it('maps an unverified GitHub email to email', async () => {
      vi.spyOn(cradle.identity, 'fetchIdentity').mockRejectedValue(new GithubEmailUnverifiedError());

      expectFailure(await signInAs('mock-mentee'), '/sign-in?error=email');
      expect(db.rows).toHaveLength(0);
    });

    it('maps an unverified matching account to unverified, linking nothing', async () => {
      const pending = db.seed({ email: 'mock-pending@devmentor.test', emailVerifiedAt: null });

      expectFailure(await signInAs('mock-pending'), '/sign-in?error=unverified');
      expect(pending.githubId).toBeNull();
      expect(db.rows).toHaveLength(1);
    });

    it('maps an account linked to another GitHub account to conflict', async () => {
      const linked = db.seed({ email: 'mock-linked@devmentor.test', githubId: '999' });

      expectFailure(await signInAs('mock-linked'), '/sign-in?error=conflict');
      expect(linked.githubId).toBe('999');
    });

    it('maps anything unexpected to unavailable, never a JSON envelope', async () => {
      findOrCreate.mockRejectedValue(new Error('database exploded'));

      expectFailure(await signInAs('mock-mentee'), '/sign-in?error=unavailable');
    });
  });
});
