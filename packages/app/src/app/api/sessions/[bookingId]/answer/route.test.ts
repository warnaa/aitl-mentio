import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ postAnswer: vi.fn(), session: Promise.resolve(null) as Promise<unknown> }));
vi.mock('../../../../../../../core/src/container/container', () => ({
  withRequestScope: async (_req: Request, fn: (value: unknown) => unknown) => fn({ textSessionService: state, session: state.session }),
}));
import { PUT, dynamic } from './route';

const id = '11111111-1111-4111-8111-111111111111';
const put = (body: unknown = { body: 'Use a union.' }, csrf = true, raw?: string) =>
  PUT(new Request(`http://test/api/sessions/${id}/answer`, { method: 'PUT', headers: csrf ? { 'x-devmentor-request': '1' } : {}, body: raw ?? JSON.stringify(body) }), { params: Promise.resolve({ bookingId: id }) });

beforeEach(() => {
  vi.clearAllMocks();
  state.session = Promise.resolve({ userId: 'mentor-id', roles: ['mentor'] });
  state.postAnswer.mockResolvedValue({ body: 'Use a union.', postedAt: '2026-11-12T14:30:00.000Z' });
});

it('saves the answer from the raw body and the addressed booking, answering 200', async () => {
  expect(dynamic).toBe('force-dynamic');
  const response = await put({ body: 'Use a union.', userId: 'someone-else' });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, data: { body: 'Use a union.', postedAt: '2026-11-12T14:30:00.000Z' } });
  expect(state.postAnswer).toHaveBeenCalledWith(id, { body: 'Use a union.', userId: 'someone-else' });
});

it('denies signed-out callers and cross-site writes before service work', async () => {
  state.session = Promise.resolve(null);
  expect((await put()).status).toBe(401);
  state.session = Promise.resolve({ userId: 'mentor-id', roles: ['mentor'] });
  expect((await put({ body: 'x' }, false)).status).toBe(403);
  expect(state.postAnswer).not.toHaveBeenCalled();
});

it('rejects a body that is not JSON', async () => {
  expect((await put(undefined, true, '{nope')).status).toBe(400);
  expect(state.postAnswer).not.toHaveBeenCalled();
});

it('maps the service refusals to the envelope', async () => {
  const { ConflictError, ForbiddenError, NotFoundError, TooManyRequestsError } = await import('@devmentor/core');
  const cases: [Error, number, string][] = [
    [new ForbiddenError('Only the mentor can post the written answer.'), 403, 'forbidden'],
    [new NotFoundError('Session not found'), 404, 'not_found'],
    [new ConflictError('You can post the written answer when the session starts.'), 409, 'conflict'],
    [new TooManyRequestsError(20), 429, 'rate_limited'],
  ];
  for (const [error, status, code] of cases) {
    state.postAnswer.mockRejectedValueOnce(error);
    const response = await put();
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ ok: false, error: { code, message: error.message } });
  }
});
