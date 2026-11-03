import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Drives the real route through the real `makeCrudRoute`, container, session loader and
 * `UserService`; only the database is replaced. That is what proves the route-level
 * guard runs *before* the service: `UserService.list` is spied on and must never be
 * called for a caller the route denies.
 */
const db = vi.hoisted(() => {
  const rows = new Map<string, { id: string; email: string; emailVerifiedAt: Date; roles: string[]; sessionVersion: number }>();
  const em = {
    findOne: async (_entity: unknown, where: { id: string }) => rows.get(where.id) ?? null,
    find: async () => [],
    nativeUpdate: async () => 1,
    refresh: async <T>(entity: T) => entity,
  };
  return {
    rows,
    module: {
      User: class User {},
      UniqueConstraintViolationException: class UniqueConstraintViolationException extends Error {},
      getOrm: async () => ({ em: { fork: () => em } }),
    },
  };
});
vi.mock('@devmentor/db', () => db.module);

vi.stubEnv('SESSION_SECRET', 'route-test-secret-route-test-secret');
vi.stubEnv('OPERATOR_EMAILS', 'founder@devmentor.test');
vi.stubEnv('LOG_LEVEL', 'silent');

const { getContainer, UserService } = await import('@devmentor/core');
const route = await import('./route');

const VERIFIED = new Date('2026-10-01T00:00:00.000Z');

async function requestAs(user?: { id: string; email: string; roles: string[] }): Promise<Request> {
  const headers = new Headers();
  if (user) {
    db.rows.set(user.id, { ...user, emailVerifiedAt: VERIFIED, sessionVersion: 0 });
    const { sessionService } = (await getContainer()).cradle;
    const { cookie } = await sessionService.issue({ id: user.id, sessionVersion: 0 });
    headers.set('cookie', cookie.split(';')[0]!);
  }
  return new Request('http://devmentor.test/api/users', { headers });
}

const listSpy = vi.spyOn(UserService.prototype, 'list');

beforeEach(() => {
  listSpy.mockClear();
  db.rows.clear();
});

describe('GET /api/users', () => {
  it('is a dynamic collection route exposing GET only; POST is gone', () => {
    expect(route.dynamic).toBe('force-dynamic');
    expect(Object.keys(route).sort()).toEqual(['GET', 'dynamic']);
  });

  it('answers 401 to an anonymous caller without reaching the service', async () => {
    const response = await route.GET(await requestAs(), undefined as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: 'unauthorized' } });
    expect(listSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['mentee', ['mentee']],
    ['mentor', ['mentor']],
  ])('answers 403 to a %s without reaching the service', async (_label, roles) => {
    const response = await route.GET(
      await requestAs({ id: `u-${roles[0]}`, email: `${roles[0]}@devmentor.test`, roles }),
      undefined as never,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    expect(listSpy).not.toHaveBeenCalled();
  });

  it('lists users for an operator, whose authority comes from the allowlist', async () => {
    const response = await route.GET(
      await requestAs({ id: 'u-founder', email: 'founder@devmentor.test', roles: ['mentee'] }),
      undefined as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: [] });
    expect(listSpy).toHaveBeenCalledTimes(1);
  });
});
