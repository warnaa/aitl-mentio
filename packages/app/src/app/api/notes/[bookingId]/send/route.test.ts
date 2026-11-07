import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ send: vi.fn(), session: Promise.resolve(null) as Promise<unknown> }));
vi.mock('../../../../../../../core/src/container/container', () => ({
  withRequestScope: async (_req: Request, fn: (value: unknown) => unknown) => fn({ sessionNoteService: state, session: state.session }),
}));
import { POST, dynamic } from './route';
import { ConflictError } from '@devmentor/core';
const id = '11111111-1111-4111-8111-111111111111';
const post = (body = '{"version":1,"revision":2}', csrf = true) => POST(new Request(`http://test/api/notes/${id}/send`, { method: 'POST', headers: csrf ? { 'x-devmentor-request': '1' } : {}, body }), { params: Promise.resolve({ bookingId: id }) });
beforeEach(() => {
  vi.clearAllMocks(); state.session = Promise.resolve({ userId: 'mentor', roles: ['mentor'] });
  state.send.mockResolvedValue({ status: 'awaiting_approval', revision: 2 });
});
it('submits an exact saved revision and applies no-store', async () => {
  expect(dynamic).toBe('force-dynamic');
  const response = await post();
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(await response.json()).toMatchObject({ ok: true, data: { status: 'awaiting_approval', revision: 2 } });
  expect(state.send).toHaveBeenCalledWith(id, { version: 1, revision: 2 });
});
it('protects auth, CSRF and malformed JSON and maps send conflicts', async () => {
  state.session = Promise.resolve(null);
  expect((await post()).status).toBe(401);
  state.session = Promise.resolve({ userId: 'mentor', roles: [] });
  expect((await post('{}', false)).status).toBe(403);
  expect((await post('{bad')).status).toBe(400);
  state.send.mockRejectedValueOnce(new ConflictError());
  expect((await post()).status).toBe(409);
});
