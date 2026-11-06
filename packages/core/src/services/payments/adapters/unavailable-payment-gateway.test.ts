import { expect, it } from 'vitest';
import { UnavailablePaymentGateway } from './unavailable-payment-gateway';
it('fails every operation closed without host configuration', () => {
  const gateway = new UnavailablePaymentGateway(); expect(gateway.livemode).toBe(false);
  for (const operation of [() => gateway.assertReady(), () => gateway.createCheckoutSession(), () => gateway.retrieveCheckoutSession(), () => gateway.expireCheckoutSession(), () => gateway.verifyWebhook()]) expect(operation).toThrow('Payments are not configured');
});
