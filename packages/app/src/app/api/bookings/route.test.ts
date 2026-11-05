import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ start: vi.fn(), consumeFor: vi.fn(), session: Promise.resolve(null) as Promise<unknown> }));
vi.mock('../../../../../core/src/container/container', () => ({
  withRequestScope: async (_req: Request, fn: (value: unknown) => unknown) => fn({ bookingService: state, rateLimiter: state, session: state.session }),
}));
import { POST, dynamic } from './route';
import { ConflictError, TooManyRequestsError } from '@devmentor/core';
const slotId = '11111111-1111-4111-8111-111111111111';
const input = { slotId, lengthMinutes: 25 };
const call = (body: unknown = input, csrf = true) => POST(new Request('http://test/api/bookings', { method: 'POST', headers: csrf ? { 'x-devmentor-request': '1' } : {}, body: JSON.stringify(body) }), undefined as never);
beforeEach(() => {
  vi.clearAllMocks();
  state.session = Promise.resolve({ userId: 'mentee', roles: ['mentee'] });
  state.start.mockResolvedValue({ booking: { id: 'booking', status: 'pending' }, created: true });
  state.consumeFor.mockResolvedValue(undefined);
});
it('returns 201 for new reservations and 200 for matching retry recovery', async () => {
  expect(dynamic).toBe('force-dynamic');
  const result = await call({ ...input, priceCents: 1, menteeId: 'other' });
  expect(result.status).toBe(201);
  expect(await result.json()).toEqual({ ok: true, data: { id: 'booking', status: 'pending' } });
  expect(state.start).toHaveBeenCalledWith(input);
  expect(state.consumeFor).toHaveBeenCalledWith({ scope: 'bookings', kind: 'account', limit: 20, windowMs: 600000 }, 'mentee');
  state.start.mockResolvedValueOnce({ booking: { id: 'booking' }, created: false });
  expect((await call()).status).toBe(200);
});
it('denies anonymous, wrong-role and cross-site mutations before service work', async () => {
  expect((await call(input, false)).status).toBe(403);
  state.session = Promise.resolve(null); expect((await call()).status).toBe(401);
  state.session = Promise.resolve({ userId: 'mentor', roles: ['mentor'] }); expect((await call()).status).toBe(403);
  expect(state.start).not.toHaveBeenCalled();
});
it('validates input and preserves conflict and throttle envelopes', async () => {
  expect((await call({ slotId: 'bad', lengthMinutes: 30 })).status).toBe(422);
  state.start.mockRejectedValueOnce(new ConflictError('Time taken'));
  const conflict = await call(); expect(conflict.status).toBe(409);
  expect(await conflict.json()).toMatchObject({ ok: false, error: { code: 'conflict', message: 'Time taken' } });
  state.consumeFor.mockRejectedValueOnce(new TooManyRequestsError(25));
  const limited = await call(); expect(limited.status).toBe(429); expect(limited.headers.get('retry-after')).toBe('25');
});
