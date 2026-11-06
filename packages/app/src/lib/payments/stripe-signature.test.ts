import Stripe from 'stripe';
import { expect, it } from 'vitest';
import { StripePaymentGateway } from './stripe-payment-gateway';

it('verifies the actual Stripe SDK signature on exact raw bytes and denies tampering, missing or expired signatures', () => {
  const secret = 'synthetic-webhook-secret';
  const gateway = new StripePaymentGateway({ STRIPE_SECRET_KEY: 'sk_test_synthetic', STRIPE_WEBHOOK_SECRET: secret });
  const payload = ` ${JSON.stringify({ id: 'evt_synthetic', object: 'event', type: 'checkout.session.completed', data: { object: {
    id: 'cs_synthetic', object: 'checkout.session', metadata: { bookingId: 'booking', attemptId: 'attempt' },
    amount_total: 8000, currency: 'pln', payment_intent: 'pi_synthetic', mode: 'payment', payment_status: 'paid', status: 'complete', livemode: false, url: null,
  } } })}\n`;
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  expect(gateway.verifyWebhook(payload, signature)).toMatchObject({ id: 'evt_synthetic', session: { amountCents: 8000, paid: true, currency: 'PLN' } });
  expect(() => gateway.verifyWebhook(payload.replace('8000', '8001'), signature)).toThrow('Invalid payment webhook');
  expect(() => gateway.verifyWebhook(payload, '')).toThrow('Invalid payment webhook');
  const expired = Stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp: Math.floor(Date.now() / 1000) - 3600 });
  expect(() => gateway.verifyWebhook(payload, expired)).toThrow('Invalid payment webhook');
});
