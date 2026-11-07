import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ getForParticipant: vi.fn(), session: Promise.resolve(null) as Promise<unknown> }));
vi.mock('../../../../../../core/src/container/container', () => ({
  withRequestScope: async (_req: Request, fn: (value: unknown) => unknown) => fn({ textSessionService: state, session: state.session }),
}));
import { GET, dynamic } from './route';

const id = '11111111-1111-4111-8111-111111111111';
const get = (bookingId = id) => GET(new Request(`http://test/api/sessions/${bookingId}`), { params: Promise.resolve({ bookingId }) });

beforeEach(() => {
  vi.clearAllMocks();
  state.session = Promise.resolve({ userId: 'u1', roles: ['mentee'] });
  state.getForParticipant.mockResolvedValue({ window: 'open', messages: [] });
});

it('returns the caller view in the envelope for the addressed booking and is dynamic', async () => {
  expect(dynamic).toBe('force-dynamic');
  const response = await get();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, data: { window: 'open', messages: [] } });
  expect(state.getForParticipant).toHaveBeenCalledWith(id);
});

it('answers 401 to a signed-out caller before any service work', async () => {
  state.session = Promise.resolve(null);
  expect((await get()).status).toBe(401);
  expect(state.getForParticipant).not.toHaveBeenCalled();
});

it('maps the service refusals to the envelope', async () => {
  const { NotFoundError, ValidationError } = await import('@devmentor/core');
  state.getForParticipant.mockRejectedValueOnce(new NotFoundError('Session not found'));
  const missing = await get();
  expect(missing.status).toBe(404);
  expect(await missing.json()).toMatchObject({ ok: false, error: { code: 'not_found' } });
  state.getForParticipant.mockRejectedValueOnce(new ValidationError('Validation failed'));
  expect((await get('nope')).status).toBe(422);
});
