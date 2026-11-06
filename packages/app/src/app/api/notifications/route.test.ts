import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ listMine: vi.fn(), markRead: vi.fn(), session: Promise.resolve(null) as Promise<unknown> }));
vi.mock('../../../../../core/src/container/container', () => ({
  withRequestScope: async (_req: Request, fn: (value: unknown) => unknown) => fn({ notificationService: state, session: state.session }),
}));
import { GET, POST, dynamic } from './route';

const id = '11111111-1111-4111-8111-111111111111';
const get = () => GET(new Request('http://test/api/notifications'), undefined as never);
const post = (body: unknown = { ids: [id] }, csrf = true) =>
  POST(new Request('http://test/api/notifications', { method: 'POST', headers: csrf ? { 'x-devmentor-request': '1' } : {}, body: JSON.stringify(body) }), undefined as never);

beforeEach(() => {
  vi.clearAllMocks();
  state.session = Promise.resolve({ userId: 'u1', roles: ['mentee'] });
  state.listMine.mockResolvedValue({ unreadCount: 1, items: [{ id }] });
  state.markRead.mockResolvedValue({ updated: 1 });
});

it('lists the live caller notifications in the envelope and is dynamic', async () => {
  expect(dynamic).toBe('force-dynamic');
  const response = await get();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, data: { unreadCount: 1, items: [{ id }] } });
  expect(state.listMine).toHaveBeenCalledOnce();
});

it('marks read from validated ids only, stripping client identity fields', async () => {
  const response = await post({ ids: [id], userId: 'someone-else' });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, data: { updated: 1 } });
  expect(state.markRead).toHaveBeenCalledWith({ ids: [id] });
});

it('denies signed-out callers and cross-site mutations before service work', async () => {
  state.session = Promise.resolve(null);
  expect((await get()).status).toBe(401);
  expect((await post()).status).toBe(401);
  state.session = Promise.resolve({ userId: 'u1', roles: ['mentee'] });
  expect((await post({ ids: [id] }, false)).status).toBe(403);
  expect(state.listMine).not.toHaveBeenCalled();
  expect(state.markRead).not.toHaveBeenCalled();
});

it('rejects empty, malformed and oversized id lists', async () => {
  for (const body of [{}, { ids: [] }, { ids: ['nope'] }, { ids: Array.from({ length: 51 }, () => id) }]) {
    expect((await post(body)).status).toBe(422);
  }
  expect(state.markRead).not.toHaveBeenCalled();
});
