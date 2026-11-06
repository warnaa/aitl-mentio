import { beforeEach, expect, it, vi } from 'vitest';
import { MockPaymentGateway } from './mock-payment-gateway';

const now = new Date('2026-11-06T12:00:00Z');
let current: Date;
let gateway: MockPaymentGateway;
const input = { idempotencyKey: 'key', bookingId: 'booking', attemptId: 'attempt', amountCents: 8000, currency: 'PLN', successUrl: 'http://localhost/home?booked=booking', cancelUrl: 'http://localhost/m/mentor', expiresAt: new Date(now.getTime() + 31 * 60_000) };
beforeEach(() => { current = now; gateway = new MockPaymentGateway({ clock: { now: () => current } }); vi.restoreAllMocks(); });

it('creates and idempotently recovers one unpaid session at the authoritative amount', async () => {
  const session = await gateway.createCheckoutSession(input);
  expect(session).toMatchObject({ id: 'cs_mock_attempt', amountCents: 8000, currency: 'pln', paid: false, status: 'open', livemode: false });
  expect(await gateway.createCheckoutSession({ ...input, amountCents: 1 })).toEqual(session);
  await expect(gateway.createCheckoutSession({ ...input, idempotencyKey: 'late', expiresAt: now })).rejects.toMatchObject({ status: 400 });
  await expect(gateway.retrieveCheckoutSession('missing')).rejects.toMatchObject({ status: 404 });
});

it('expires on the exact provider deadline and preserves already terminal sessions', async () => {
  const session = await gateway.createCheckoutSession(input); current = input.expiresAt;
  expect(await gateway.retrieveCheckoutSession(session.id)).toMatchObject({ status: 'expired' });
  expect(await gateway.expireCheckoutSession(session.id)).toMatchObject({ status: 'expired' });
  await expect(gateway.simulateCheckoutCompleted(session.id)).rejects.toMatchObject({ status: 400 });
});

it('supplies explicit completed/expired event helpers for synthetic integration scenarios', async () => {
  const session = await gateway.createCheckoutSession(input);
  const completed = await gateway.simulateCheckoutCompleted(session.id);
  expect(completed).toMatchObject({ type: 'checkout.session.completed', session: { paid: true, amountCents: 8000, paymentIntentId: expect.stringContaining('pi_mock_') } });
  expect(await gateway.retrieveCheckoutSession(session.id)).toEqual(completed.session);
  const another = await gateway.createCheckoutSession({ ...input, idempotencyKey: 'two', attemptId: 'two' });
  expect(await gateway.simulateCheckoutCompleted(another.id, 5)).toMatchObject({ session: { amountCents: 5 } });
  const third = await gateway.createCheckoutSession({ ...input, idempotencyKey: 'three', attemptId: 'three' });
  expect(await gateway.simulateCheckoutExpired(third.id)).toMatchObject({ type: 'checkout.session.expired', session: { status: 'expired', paid: false } });
});

it('accepts only the explicitly gated mock signature and normalized event shape', () => {
  expect(gateway.verifyWebhook(JSON.stringify({ id: 'unknown', type: 'unknown', session: null }), 'devmentor-mock-payment')).toEqual({ id: 'unknown', type: 'unknown', session: null });
  expect(() => gateway.verifyWebhook('{}', 'bad')).toThrow('Invalid payment signature');
  for (const body of ['{', '{}', JSON.stringify({ id: 'x', type: 'checkout.session.completed', session: { paid: true } })]) expect(() => gateway.verifyWebhook(body, 'devmentor-mock-payment')).toThrow('Invalid payment event');
});

it('lets a signed synthetic event advance open provider truth without regressing a terminal refund', async () => {
  const session = await gateway.createCheckoutSession(input);
  const event = { id: 'evt_mock', type: 'checkout.session.completed', session: { ...session, status: 'complete' as const, paid: true, paymentIntentId: 'pi_mock', refundedCents: 8000 } };
  expect(gateway.verifyWebhook(JSON.stringify(event), 'devmentor-mock-payment')).toEqual(event);
  expect(await gateway.retrieveCheckoutSession(session.id)).toMatchObject({ refundedCents: 8000, paid: true });
  gateway.verifyWebhook(JSON.stringify({ ...event, session: { ...event.session, refundedCents: 0 } }), 'devmentor-mock-payment');
  expect(await gateway.retrieveCheckoutSession(session.id)).toMatchObject({ refundedCents: 8000 });
  gateway.verifyWebhook(JSON.stringify({ ...event, session: { ...event.session, id: 'unknown' } }), 'devmentor-mock-payment');
  await expect(gateway.retrieveCheckoutSession('unknown')).rejects.toMatchObject({ status: 404 });
});
