import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Drives the real logout route through the real container, session loader,
 * `SessionService` and `UserService`; only the database is an in-memory fake.
 */
const db = vi.hoisted(() => {
  const rows = new Map<string, { id: string; email: string; emailVerifiedAt: Date; roles: string[]; sessionVersion: number }>();
  const em = {
    findOne: vi.fn(async (_entity: unknown, where: { id: string }) => rows.get(where.id) ?? null),
    nativeUpdate: vi.fn(async (_entity: unknown, where: { id: string; sessionVersion: number }, data: { sessionVersion: number }) => {
      const row = rows.get(where.id);
      if (!row || row.sessionVersion !== where.sessionVersion) {
        return 0;
      }
      Object.assign(row, data);
      return 1;
    }),
    refresh: vi.fn(async <T>(entity: T) => entity),
  };
  return {
    rows,
    em,
    module: {
      User: class User {},
      UniqueConstraintViolationException: class UniqueConstraintViolationException extends Error {},
      getOrm: vi.fn(async () => ({ em: { fork: () => em } })),
    },
  };
});
vi.mock('@devmentor/db', () => db.module);

vi.stubEnv('SESSION_SECRET', 'logout-route-secret-logout-route-secret');
vi.stubEnv('LOG_LEVEL', 'silent');

const { getContainer, ServiceUnavailableError } = await import('@devmentor/core');
const route = await import('./route');
const { authRouteLogger } = await import('../../../../lib/sign-in');
const { cradle } = await getContainer();

const CLEARED =
  'devmentor_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax';

function seed(sessionVersion = 0) {
  const row = {
    id: 'user-1',
    email: 'mentee@devmentor.test',
    emailVerifiedAt: new Date('2026-10-01T00:00:00.000Z'),
    roles: ['mentee'],
    sessionVersion,
  };
  db.rows.set(row.id, row);
  return row;
}

async function cookieFor(sessionVersion: number): Promise<string> {
  const { cookie } = await cradle.sessionService.issue({ id: 'user-1', sessionVersion });
  return cookie.split(';')[0]!;
}

function logout({ cookie, csrf = true }: { cookie?: string; csrf?: boolean } = {}): Promise<Response> {
  const headers = new Headers();
  if (csrf) {
    headers.set('x-devmentor-request', '1');
  }
  if (cookie) {
    headers.set('cookie', cookie);
  }
  return route.POST(new Request('http://devmentor.test/api/auth/logout', { method: 'POST', headers }), undefined as never);
}

async function expectSignedOut(response: Response): Promise<void> {
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true, data: null });
  expect(response.headers.getSetCookie()).toEqual([CLEARED]);
}

beforeEach(() => {
  db.rows.clear();
  db.em.nativeUpdate.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('POST /api/auth/logout', () => {
  it('is a dynamic route exposing POST only', () => {
    expect(route.dynamic).toBe('force-dynamic');
    expect(Object.keys(route).sort()).toEqual(['POST', 'dynamic']);
  });

  it('clears the cookie and bumps sessionVersion for a live session, so a copy of the cookie dies', async () => {
    const row = seed(0);
    const cookie = await cookieFor(0);
    // The route swallows a failed bump, so only the absent warning proves it fully succeeded.
    const warn = vi.spyOn(authRouteLogger(), 'warn');

    await expectSignedOut(await logout({ cookie }));
    expect(row.sessionVersion).toBe(1);

    // The same (copied) cookie is no longer a live session: signing out again bumps nothing.
    await expectSignedOut(await logout({ cookie }));
    expect(row.sessionVersion).toBe(1);
    expect(db.em.nativeUpdate).toHaveBeenCalledTimes(1);
    expect(db.em.refresh).toHaveBeenCalledWith(row);
    expect(warn).not.toHaveBeenCalled();
  });

  it('succeeds without a cookie and bumps nothing', async () => {
    seed(0);

    await expectSignedOut(await logout());
    expect(db.em.nativeUpdate).not.toHaveBeenCalled();
  });

  it('succeeds with an expired cookie and bumps nothing', async () => {
    const row = seed(0);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() - 25 * 60 * 60 * 1000);
    const cookie = await cookieFor(0);
    vi.useRealTimers();

    await expectSignedOut(await logout({ cookie }));
    expect(row.sessionVersion).toBe(0);
    expect(db.em.nativeUpdate).not.toHaveBeenCalled();
  });

  it('succeeds with a tampered cookie and bumps nothing', async () => {
    seed(0);

    await expectSignedOut(await logout({ cookie: 'devmentor_session=not.a.token' }));
    expect(db.em.nativeUpdate).not.toHaveBeenCalled();
  });

  it('succeeds with a cookie from an already-ended session and bumps nothing', async () => {
    const row = seed(2);

    await expectSignedOut(await logout({ cookie: await cookieFor(1) }));
    expect(row.sessionVersion).toBe(2);
  });

  it('succeeds for a deleted user and bumps nothing', async () => {
    const cookie = await cookieFor(0);

    await expectSignedOut(await logout({ cookie }));
    expect(db.em.nativeUpdate).not.toHaveBeenCalled();
  });

  describe('never fails once past CSRF', () => {
    it('expires the cookie when the session cannot be verified (SESSION_SECRET unset)', async () => {
      const row = seed(0);
      const cookie = await cookieFor(0);
      const warn = vi.spyOn(authRouteLogger(), 'warn');
      const failure = new ServiceUnavailableError('SESSION_SECRET is not configured');
      vi.spyOn(cradle.sessionService, 'verify').mockRejectedValue(failure);

      await expectSignedOut(await logout({ cookie }));

      expect(row.sessionVersion).toBe(0);
      expect(db.em.nativeUpdate).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith({ err: failure }, 'sign-out could not end the session; expiring the cookie anyway');
    });

    it('expires the cookie when the database fails while loading the session', async () => {
      seed(0);
      const cookie = await cookieFor(0);
      const warn = vi.spyOn(authRouteLogger(), 'warn');
      db.em.findOne.mockRejectedValueOnce(new Error('connection refused'));

      await expectSignedOut(await logout({ cookie }));

      expect(db.em.nativeUpdate).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('expires the cookie when the database is down and the container cannot be built', async () => {
      seed(0);
      const cookie = await cookieFor(0);
      const warn = vi.spyOn(authRouteLogger(), 'warn');
      // Force a fresh container build, which fails like a database down at first request.
      delete (globalThis as { __devmentorContainer?: unknown }).__devmentorContainer;
      db.module.getOrm.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expectSignedOut(await logout({ cookie }));

      expect(db.em.nativeUpdate).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  it('answers 403 without the CSRF header, leaving the session alone', async () => {
    const row = seed(0);

    const response = await logout({ cookie: await cookieFor(0), csrf: false });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(row.sessionVersion).toBe(0);
  });
});
