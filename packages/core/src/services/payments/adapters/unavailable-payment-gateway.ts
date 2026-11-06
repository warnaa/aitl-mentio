import { ServiceUnavailableError } from '../../../http/errors';
import type { PaymentGateway } from '../payment-gateway.port';

/** Fail closed when a non-Next consumer has not supplied a real provider adapter. */
export class UnavailablePaymentGateway implements PaymentGateway {
  readonly livemode = false;
  assertReady(): never { return this.unavailable(); }
  private unavailable(): never { throw new ServiceUnavailableError('Payments are not configured'); }
  createCheckoutSession(): never { return this.unavailable(); }
  retrieveCheckoutSession(): never { return this.unavailable(); }
  expireCheckoutSession(): never { return this.unavailable(); }
  verifyWebhook(): never { return this.unavailable(); }
}
