import { beforeEach, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import { StripePaymentGateway } from './stripe-payment-gateway';
const state = vi.hoisted(() => ({ create: vi.fn(), retrieve: vi.fn(), expire: vi.fn(), constructEvent: vi.fn(), list: vi.fn() }));
vi.mock('stripe', () => ({ default: vi.fn(class { checkout = { sessions: state }; webhooks = state; refunds = state; }) }));
const env = { STRIPE_SECRET_KEY: 'sk_test_synthetic', STRIPE_WEBHOOK_SECRET: 'synthetic-signing-secret' };
const input = { idempotencyKey: 'stable', bookingId: 'booking', attemptId: 'attempt', amountCents: 8000, currency: 'PLN', successUrl: 'https://app.test/home', cancelUrl: 'https://app.test/m/mentor', expiresAt: new Date('2026-11-06T12:31:00Z') };
const session = (overrides = {}) => ({ id: 'cs_synthetic', url: 'https://checkout.stripe.com/synthetic', metadata: { bookingId: 'booking', attemptId: 'attempt' }, amount_total: 8000, currency: 'pln', payment_intent: 'pi_synthetic', mode: 'payment', payment_status: 'paid', status: 'complete', livemode: false, ...overrides });
beforeEach(() => { vi.clearAllMocks(); state.create.mockResolvedValue(session()); state.retrieve.mockResolvedValue(session()); state.expire.mockResolvedValue(session({ status: 'expired', payment_status: 'unpaid' })); state.list.mockResolvedValue({ data: [], has_more: false }); });
it('creates card-only exact-price Checkout with the stable idempotency key and fixed expiry', async () => {
  const gateway = new StripePaymentGateway(env);
  gateway.assertReady();
  expect(gateway.livemode).toBe(false);
  expect(await gateway.createCheckoutSession(input)).toMatchObject({ id: 'cs_synthetic', bookingId: 'booking', amountCents: 8000, currency: 'PLN', paid: true, paymentIntentId: 'pi_synthetic', refundedCents: 0 });
  expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ mode: 'payment', allowed_payment_method_types: ['card'], expires_at: input.expiresAt.getTime() / 1000, metadata: { bookingId: 'booking', attemptId: 'attempt' }, line_items: [{ quantity: 1, price_data: { currency: 'pln', unit_amount: 8000, product_data: { name: 'DevMentor text mentoring session' } } }] }), { idempotencyKey: 'stable' });
  await gateway.retrieveCheckoutSession('cs_synthetic');
  expect(Stripe).toHaveBeenCalledTimes(1);
  expect(Stripe).toHaveBeenCalledWith(env.STRIPE_SECRET_KEY, { timeout: 10_000, maxNetworkRetries: 0 });
  expect(state.retrieve).toHaveBeenCalledWith('cs_synthetic', { expand: ['payment_intent.latest_charge'] });
  expect((await gateway.expireCheckoutSession('cs_synthetic')).paid).toBe(false);
});
it('normalizes expanded refund evidence and missing fields without pretending it was paid', async () => {
  const gateway = new StripePaymentGateway({ ...env, STRIPE_SECRET_KEY: 'rk_live_synthetic' });
  expect(gateway.livemode).toBe(true);
  state.retrieve.mockResolvedValueOnce(session({ payment_intent: { id: 'pi_expanded', latest_charge: { amount_refunded: 8000 } }, livemode: true }));
  state.list.mockResolvedValueOnce({ data: [{ status: 'succeeded', amount: 8000 }], has_more: false });
  expect(await gateway.retrieveCheckoutSession('id')).toMatchObject({ refundedCents: 8000, paymentIntentId: 'pi_expanded', livemode: true });
  state.retrieve.mockResolvedValueOnce(session({ metadata: null, currency: null, amount_total: null, payment_intent: null, mode: 'setup', status: 'open' }));
  expect(await gateway.retrieveCheckoutSession('id')).toMatchObject({ bookingId: '', attemptId: '', amountCents: -1, currency: '', paymentIntentId: null, paid: false });
  state.retrieve.mockResolvedValueOnce(session({ payment_intent: { id: 'pi', latest_charge: 'ch' } }));
  expect((await gateway.retrieveCheckoutSession('id')).refundedCents).toBe(0);
});
it('fails closed on missing config, provider failure and unsupported provider status', async () => {
  const missing = new StripePaymentGateway({});
  expect(() => missing.assertReady()).toThrow('not configured');
  expect(() => new StripePaymentGateway({ STRIPE_SECRET_KEY: 'synthetic' }).assertReady()).toThrow('not configured');
  await expect(missing.createCheckoutSession(input)).rejects.toMatchObject({ status: 503 });
  await expect(missing.retrieveCheckoutSession('x')).rejects.toMatchObject({ status: 503 });
  await expect(missing.expireCheckoutSession('x')).rejects.toMatchObject({ status: 503 });
  expect(() => missing.verifyWebhook('{}', '')).toThrow('not configured');
  expect(() => new StripePaymentGateway({ STRIPE_WEBHOOK_SECRET: 'present' }).verifyWebhook('{}', '')).toThrow('not configured');
  const gateway = new StripePaymentGateway(env);
  state.create.mockRejectedValueOnce(new Error('private provider error'));
  await expect(gateway.createCheckoutSession(input)).rejects.toMatchObject({ status: 503 });
  state.retrieve.mockRejectedValueOnce(new Error('private provider error'));
  await expect(gateway.retrieveCheckoutSession('x')).rejects.toMatchObject({ status: 503 });
  state.expire.mockRejectedValueOnce(new Error('private provider error'));
  await expect(gateway.expireCheckoutSession('x')).rejects.toMatchObject({ status: 503 });
  state.retrieve.mockResolvedValueOnce(session({ status: 'future-unsupported-state' }));
  await expect(gateway.retrieveCheckoutSession('x')).rejects.toMatchObject({ status: 503 });
});
it('uses official raw-body signature verification and ignores unrelated event objects', () => {
  const gateway = new StripePaymentGateway(env);
  state.constructEvent.mockReturnValueOnce({ id: 'evt', type: 'checkout.session.completed', data: { object: { ...session(), object: 'checkout.session' } } });
  expect(gateway.verifyWebhook(' raw bytes ', 'signature')).toMatchObject({ id: 'evt', session: { paid: true } });
  expect(state.constructEvent).toHaveBeenCalledWith(' raw bytes ', 'signature', env.STRIPE_WEBHOOK_SECRET);
  state.constructEvent.mockReturnValueOnce({ id: 'other', type: 'customer.created', data: { object: { object: 'customer' } } });
  expect(gateway.verifyWebhook('{}', 'sig').session).toBeNull();
  state.constructEvent.mockImplementationOnce(() => { throw new Error('invalid signature'); });
  expect(() => gateway.verifyWebhook('{}', 'bad')).toThrow('Invalid payment webhook');
});
it('accepts an injected SDK client without constructing another vendor client', async () => {
  const gateway = new StripePaymentGateway(env, { checkout: { sessions: state }, webhooks: state, refunds: state } as unknown as Pick<Stripe, 'checkout' | 'webhooks' | 'refunds'>);
  await gateway.retrieveCheckoutSession('id'); expect(Stripe).not.toHaveBeenCalled();
});

it('distinguishes verified request rejection from an ambiguous remote creation', async () => {
  const gateway = new StripePaymentGateway(env);
  for (const [type, statusCode] of [['StripeAuthenticationError', 401], ['StripePermissionError', 403], ['StripeInvalidRequestError', 400]]) {
    state.create.mockRejectedValueOnce(Object.assign(new Error('rejected'), { type, statusCode }));
    await expect(gateway.createCheckoutSession(input)).rejects.toMatchObject({ status: 503, message: expect.stringContaining('rejected before creation') });
  }
  for (const error of [null, {}, { type: 'StripeAuthenticationError' }, Object.assign(new Error('unknown'), { type: 'StripeAPIError', statusCode: 500 }), Object.assign(new Error('in progress'), { type: 'StripeInvalidRequestError', statusCode: 409 })]) {
    state.create.mockRejectedValueOnce(error);
    await expect(gateway.createCheckoutSession(input)).rejects.toMatchObject({ status: 503, message: expect.stringContaining('Retry this booking') });
  }
});

it('requires bounded succeeded-refund evidence and fails closed on pending, failed or unavailable evidence', async () => {
  const gateway = new StripePaymentGateway(env);
  for (const refunds of [
    { data: [{ status: 'pending', amount: 8000 }], has_more: false },
    { data: [{ status: 'failed', amount: 8000 }], has_more: false },
    { data: [{ status: 'canceled', amount: 8000 }], has_more: false },
    { data: [{ status: 'succeeded', amount: 8000 }], has_more: true },
  ]) {
    state.list.mockResolvedValueOnce(refunds);
    expect((await gateway.retrieveCheckoutSession('cs')).refundedCents).toBe(-1);
  }
  state.retrieve.mockResolvedValueOnce(session({ payment_intent: { id: 'pi', latest_charge: { amount_refunded: 8000 } } }));
  expect((await gateway.retrieveCheckoutSession('cs')).refundedCents).toBe(-1);
  state.list.mockRejectedValueOnce(new Error('refund API unavailable'));
  await expect(gateway.retrieveCheckoutSession('cs')).rejects.toMatchObject({ status: 503 });
});
