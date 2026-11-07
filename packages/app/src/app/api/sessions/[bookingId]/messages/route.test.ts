import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ postMessage: vi.fn(), session: Promise.resolve(null) as Promise<unknown> }));
vi.mock('../../../../../../../core/src/container/container', () => ({
  withRequestScope: async (_req: Request, fn: (value: unknown) => unknown) => fn({ textSessionService: state, session: state.session }),
}));
import { POST, dynamic } from './route';

const id = '11111111-1111-4111-8111-111111111111';
const post = (body: unknown = { body: 'hello' }, csrf = true, raw?: string) =>
  POST(new Request(`http://test/api/sessions/${id}/messages`, { method: 'POST', headers: csrf ? { 'x-devmentor-request': '1' } : {}, body: raw ?? JSON.stringify(body) }), { params: Promise.resolve({ bookingId: id }) });

beforeEach(() => {
  vi.clearAllMocks();
  state.session = Promise.resolve({ userId: 'u1', roles: ['mentee'] });
  state.postMessage.mockResolvedValue({ id: 'm1', body: 'hello' });
});

it('creates a message from the raw body and the addressed booking, answering 201', async () => {
  expect(dynamic).toBe('force-dynamic');
  const response = await post({ body: 'hello', userId: 'someone-else' });
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ ok: true, data: { id: 'm1', body: 'hello' } });
  expect(state.postMessage).toHaveBeenCalledWith(id, { body: 'hello', userId: 'someone-else' });
});

it('denies signed-out callers and cross-site posts before service work', async () => {
  state.session = Promise.resolve(null);
  expect((await post()).status).toBe(401);
  state.session = Promise.resolve({ userId: 'u1', roles: ['mentee'] });
  expect((await post({ body: 'x' }, false)).status).toBe(403);
  expect(state.postMessage).not.toHaveBeenCalled();
});

it('rejects a body that is not JSON', async () => {
  expect((await post(undefined, true, '{nope')).status).toBe(400);
  expect(state.postMessage).not.toHaveBeenCalled();
});

it('maps conflicts and rate limits from the service to the envelope', async () => {
  const { ConflictError, TooManyRequestsError } = await import('@devmentor/core');
  state.postMessage.mockRejectedValueOnce(new ConflictError('This session has ended.'));
  const ended = await post();
  expect(ended.status).toBe(409);
  expect(await ended.json()).toMatchObject({ ok: false, error: { code: 'conflict', message: 'This session has ended.' } });
  state.postMessage.mockRejectedValueOnce(new TooManyRequestsError(20));
  expect((await post()).status).toBe(429);
});
