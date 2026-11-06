import { beforeEach, expect, it, vi } from 'vitest';
import { BadRequestError, ServiceUnavailableError } from '@devmentor/core';
const state = vi.hoisted(() => ({ handleEvent: vi.fn(), verifyWebhook: vi.fn(), startCheckout: vi.fn(), resolveReview: vi.fn(), reconcile: vi.fn(), listReview: vi.fn(), listMine: vi.fn(), consumeFor: vi.fn(), session: Promise.resolve(null) as Promise<unknown> }));
vi.mock('../../../../lib/payments/scope', () => ({
  withPaymentScope: async (fn: (cradle: unknown) => unknown) => fn({ paymentService: state, paymentGateway: state }),
  withPaymentRequestScope: async (_req: Request, fn: (cradle: unknown) => unknown) => fn({ paymentService: state, paymentGateway: state, rateLimiter: state, session: state.session }),
}));
import { POST as webhook, dynamic } from './route';
import { POST as checkout } from '../../bookings/[id]/checkout/route';
import { GET as review } from '../review/route';
import { POST as resolve } from '../review/[id]/route';
import { POST as reconcile } from '../reconcile/route';
import { GET as bookings } from '../../bookings/route';
const id = '11111111-1111-4111-8111-111111111111';
const ctx = { params: Promise.resolve({ id }) };
const request = (body: unknown = {}, csrf = true) => new Request('http://test/api', { method: 'POST', body: JSON.stringify(body), headers: csrf ? { 'x-devmentor-request': '1' } : {} });
beforeEach(() => {
  vi.clearAllMocks(); state.session = Promise.resolve({ userId: 'u', roles: ['mentee', 'operator'] });
  state.startCheckout.mockResolvedValue({ bookingId: id, url: 'https://checkout.stripe.com/test', expiresAt: 'time' });
  state.resolveReview.mockResolvedValue({ status: 'expired' }); state.reconcile.mockResolvedValue({ processed: 1, failed: 0 });
  state.listReview.mockResolvedValue([]); state.listMine.mockResolvedValue([]); state.verifyWebhook.mockReturnValue({ id: 'evt' });
  state.handleEvent.mockResolvedValue({ outcome: 'confirmed' }); state.consumeFor.mockResolvedValue(undefined);
});
it('verifies exact raw webhook content without CSRF and returns plain responses', async () => {
  expect(dynamic).toBe('force-dynamic');
  const req = new Request('http://test', { method: 'POST', body: ' raw signed bytes ', headers: { 'stripe-signature': 'sig' } });
  const result = await webhook(req, ctx);
  expect(result.status).toBe(200); expect(await result.text()).toBe('');
  expect(state.verifyWebhook).toHaveBeenCalledWith(' raw signed bytes ', 'sig'); expect(state.handleEvent).toHaveBeenCalledWith({ id: 'evt' });
  await webhook(request(), ctx); expect(state.verifyWebhook).toHaveBeenLastCalledWith('{}', '');
});
it('returns plain 400, 503 and 500 and never acknowledges transient processing failure', async () => {
  state.verifyWebhook.mockImplementationOnce(() => { throw new BadRequestError(); });
  expect((await webhook(request(), ctx)).status).toBe(400);
  state.verifyWebhook.mockImplementationOnce(() => { throw new ServiceUnavailableError(); });
  expect((await webhook(request(), ctx)).status).toBe(503);
  state.handleEvent.mockRejectedValueOnce(new Error('DB failed'));
  const failed = await webhook(request(), ctx); expect(failed.status).toBe(500); expect(await failed.text()).toBe('');
  expect((await webhook(new Request('http://test', { method: 'POST' }), ctx)).status).toBe(400);
});
it('guards checkout IDs, role, CSRF and operational rate limit before payment service', async () => {
  expect((await checkout(request(), ctx)).status).toBe(200);
  expect(state.startCheckout).toHaveBeenCalledWith(id);
  expect(state.consumeFor).toHaveBeenCalledWith(expect.objectContaining({ scope: 'checkout', limit: 20 }), 'u');
  expect((await checkout(request(), { params: Promise.resolve({ id: 'bad' }) })).status).toBe(422);
  expect((await checkout(request({}, false), ctx)).status).toBe(403);
  state.session = Promise.resolve(null); expect((await checkout(request(), ctx)).status).toBe(401);
  state.session = Promise.resolve({ userId: 'mentor', roles: ['mentor'] }); expect((await checkout(request(), ctx)).status).toBe(403);
});
it('guards operator reads, reconciliation and bounded explicit resolution inputs', async () => {
  expect((await review(new Request('http://test'), ctx)).status).toBe(200);
  expect((await reconcile(request(), ctx)).status).toBe(200);
  expect(state.reconcile).toHaveBeenCalledWith();
  expect((await resolve(request({ action: 'release', reason: ' checked ', sessionId: 'cs', ignored: true }), ctx)).status).toBe(200);
  expect(state.resolveReview).toHaveBeenCalledWith(id, { action: 'release', reason: 'checked', sessionId: 'cs' });
  expect((await resolve(request({ action: 'refund', reason: 'x' }), ctx)).status).toBe(422);
  state.session = Promise.resolve({ userId: 'mentee', roles: ['mentee'] });
  expect((await review(new Request('http://test'), ctx)).status).toBe(403);
  expect((await reconcile(request(), ctx)).status).toBe(403);
  expect((await resolve(request({ action: 'confirm', reason: 'x' }), ctx)).status).toBe(403);
});
it('validates participant persona and forwards only its explicit scope', async () => {
  expect((await bookings(new Request('http://test/api/bookings'), ctx)).status).toBe(200);
  expect(state.listMine).toHaveBeenCalledWith('mentee');
  await bookings(new Request('http://test/api/bookings?role=mentor'), ctx);
  expect(state.listMine).toHaveBeenLastCalledWith('mentor');
  expect((await bookings(new Request('http://test/api/bookings?role=operator'), ctx)).status).toBe(422);
});
