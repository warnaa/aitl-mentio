import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ cancel: vi.fn(), consumeFor: vi.fn(), session: Promise.resolve(null) as Promise<unknown> }));
vi.mock('../../../../../lib/payments/scope', () => ({
  withPaymentRequestScope: async (_req: Request, fn: (value: unknown) => unknown) => fn({ bookingCancellationService: state, rateLimiter: state, session: state.session }),
}));
import { POST, dynamic } from './route';
import { AppError, TooManyRequestsError } from '@devmentor/core';

const id = '11111111-1111-4111-8111-111111111111';
const call = (body: unknown = { expectRefund: true }, csrf = true, bookingId = id) => POST(
  new Request(`http://test/api/bookings/${bookingId}/cancel`, { method: 'POST', headers: csrf ? { 'x-devmentor-request': '1' } : {}, body: JSON.stringify(body) }),
  { params: Promise.resolve({ id: bookingId }) } as never,
);
beforeEach(() => {
  vi.clearAllMocks();
  state.session = Promise.resolve({ userId: 'mentee', roles: ['mentee'] });
  state.cancel.mockResolvedValue({ booking: { id, status: 'cancelled', cancelledAt: '2026-11-10T10:00:00.000Z', refundStatus: 'refunded' } });
  state.consumeFor.mockResolvedValue(undefined);
});

it('cancels with the outcome the mentee confirmed and answers the refund state', async () => {
  expect(dynamic).toBe('force-dynamic');
  const response = await call();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, data: { booking: { id, status: 'cancelled', cancelledAt: '2026-11-10T10:00:00.000Z', refundStatus: 'refunded' } } });
  expect(state.cancel).toHaveBeenCalledWith(id, { expectRefund: true });
  expect(state.consumeFor).toHaveBeenCalledWith({ scope: 'cancel', kind: 'account', limit: 10, windowMs: 600000 }, 'mentee');
});

it('denies cross-site, anonymous and wrong-role requests before service work', async () => {
  expect((await call(undefined, false)).status).toBe(403);
  state.session = Promise.resolve(null); expect((await call()).status).toBe(401);
  state.session = Promise.resolve({ userId: 'mentor', roles: ['mentor'] }); expect((await call()).status).toBe(403);
  expect(state.cancel).not.toHaveBeenCalled();
});

it('validates the id and body strictly and preserves typed conflicts and throttling', async () => {
  expect((await call(undefined, true, 'not-a-uuid')).status).toBe(422);
  expect((await call({ expectRefund: true, refundCents: 1 })).status).toBe(422);
  expect((await call({})).status).toBe(422);
  state.cancel.mockRejectedValueOnce(new AppError('The free cancellation window has just closed.', 409, 'refund_window_changed'));
  const changed = await call();
  expect(changed.status).toBe(409);
  expect(await changed.json()).toMatchObject({ ok: false, error: { code: 'refund_window_changed' } });
  state.consumeFor.mockRejectedValueOnce(new TooManyRequestsError(30));
  expect((await call()).status).toBe(429);
});
