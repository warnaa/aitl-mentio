import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ approve: vi.fn(), session: Promise.resolve(null) as Promise<unknown> }));
vi.mock('../../../../../../../core/src/container/container', () => ({
  withRequestScope: async (_req: Request, fn: (value: unknown) => unknown) => fn({ sessionNoteService: state, session: state.session }),
}));
import { POST, dynamic } from './route';
import { ConflictError, ForbiddenError, ValidationError } from '@devmentor/core';
const id = '11111111-1111-4111-8111-111111111111';
const input = { version: 1 };
const post = (body = JSON.stringify(input), csrf = true) => POST(new Request(`http://test/api/notes/${id}/approve`, { method: 'POST', headers: csrf ? { 'x-devmentor-request': '1' } : {}, body }), { params: Promise.resolve({ bookingId: id }) });
beforeEach(() => {
  vi.clearAllMocks(); state.session = Promise.resolve({ userId: 'mentee', roles: ['mentee'] });
  state.approve.mockResolvedValue({ status: 'approved', version: 1 });
});
it('records the decision for the session caller and applies no-store', async () => {
  expect(dynamic).toBe('force-dynamic');
  const response = await post();
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(await response.json()).toMatchObject({ ok: true, data: { status: 'approved', version: 1 } });
  expect(state.approve).toHaveBeenCalledWith(id, input);
});
it('protects auth, CSRF and malformed JSON and maps refusals', async () => {
  state.session = Promise.resolve(null);
  expect((await post()).status).toBe(401);
  state.session = Promise.resolve({ userId: 'mentee', roles: [] });
  expect((await post('{}', false)).status).toBe(403);
  expect((await post('{bad')).status).toBe(400);
  state.approve.mockRejectedValueOnce(new ConflictError());
  expect((await post()).status).toBe(409);
  state.approve.mockRejectedValueOnce(new ForbiddenError());
  expect((await post()).status).toBe(403);
  state.approve.mockRejectedValueOnce(new ValidationError('Validation failed', { comment: ['Tell the mentor what to change.'] }));
  const refused = await post();
  expect(refused.status).toBe(422);
  expect(await refused.json()).toMatchObject({ error: { fieldErrors: { comment: ['Tell the mentor what to change.'] } } });
});
