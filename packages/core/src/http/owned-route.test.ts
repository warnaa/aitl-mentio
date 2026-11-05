import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { makeOwnedResourceRoute, ownedAction } from './owned-route';
import type { Cradle } from '../container/cradle';
import type { Session } from './auth';

const scope = vi.hoisted(() => ({ cradle: {} as Cradle }));
vi.mock('../container/container', () => ({
  withRequestScope: vi.fn(async (_req, fn) => fn(scope.cradle)),
}));
const req = (method = 'GET', body?: string, csrf = true) =>
  new Request('http://localhost/api/owned', {
    method,
    ...(body === undefined ? {} : { body }),
    headers: csrf ? { 'x-devmentor-request': '1' } : {},
  });
const context = { params: Promise.resolve({ token: 'token' }) };

describe('owned routes', () => {
  beforeEach(() => {
    scope.cradle = { session: Promise.resolve({ userId: 'owner', roles: ['mentor'] } as Session) } as Cradle;
  });

  it('passes live cradle, params and request, retaining cookie-bearing Responses', async () => {
    const run = vi.fn(async () => new Response('accepted', { headers: { 'set-cookie': 'fresh' } }));
    const request = req('POST');
    const response = await ownedAction({ run })(request, context);
    expect(await response.text()).toBe('accepted');
    expect(response.headers.get('set-cookie')).toBe('fresh');
    expect(run).toHaveBeenCalledWith(scope.cradle, { token: 'token' }, request);
  });
  it('requires a session, optionally enforces role, and delegates CSRF exactly once', async () => {
    const run = vi.fn(async () => 'ok');
    scope.cradle.session = Promise.resolve(null);
    expect((await ownedAction({ run })(req(), context)).status).toBe(401);
    scope.cradle.session = Promise.resolve({ userId: 'owner', roles: ['mentee'] });
    expect((await ownedAction({ role: 'mentor', run })(req(), context)).status).toBe(403);
    expect((await ownedAction({ run })(req('POST', undefined, false), context)).status).toBe(403);
    expect(run).not.toHaveBeenCalled();
    expect((await ownedAction({ run })(req(), context)).status).toBe(200);
  });
  it('accepts routes with no params', async () => {
    const run = vi.fn(async () => null);
    await ownedAction({ run })(req(), undefined!);
    expect(run).toHaveBeenCalledWith(scope.cradle, {}, expect.any(Request));
    await ownedAction({ run })(req(), {} as typeof context);
    expect(run).toHaveBeenLastCalledWith(scope.cradle, {}, expect.any(Request));
  });
  it('reads an owned singleton and validates a mutation before calling it', async () => {
    const read = vi.fn(async () => ({ bio: 'draft' }));
    const update = vi.fn(async (_cradle, input) => input);
    const handlers = makeOwnedResourceRoute({
      role: 'mentor',
      read,
      update,
      updateSchema: z.object({ bio: z.string() }),
    });
    expect(await (await handlers.GET(req(), context)).json()).toEqual({ ok: true, data: { bio: 'draft' } });
    expect(read).toHaveBeenCalledWith(scope.cradle, { token: 'token' });
    expect(await (await handlers.PUT(req('PUT', '{"bio":"saved"}'), context)).json()).toEqual({
      ok: true,
      data: { bio: 'saved' },
    });
    expect(update).toHaveBeenCalledWith(scope.cradle, { bio: 'saved' }, { token: 'token' });
    expect((await handlers.PUT(req('PUT', '{}'), context)).status).toBe(422);
    expect((await handlers.PUT(req('PUT', '{'), context)).status).toBe(400);
    expect(update).toHaveBeenCalledOnce();
  });
  it('refuses missing operations or missing mutation schemas', async () => {
    const read = vi.fn(async () => null);
    const withoutUpdate = makeOwnedResourceRoute({ role: 'mentor', read });
    expect((await withoutUpdate.PUT(req('PUT', '{}'), context)).status).toBe(400);
    const withoutSchema = makeOwnedResourceRoute({ role: 'mentor', read, update: vi.fn() });
    expect((await withoutSchema.PUT(req('PUT', '{}'), context)).status).toBe(400);
  });
});
