import { ServiceUnavailableError } from '../../http/errors';

const NOT_CREATED = Symbol.for('devmentor.checkout-not-created');
/** A verified provider rejection, unlike a timeout with an unknown remote outcome. */
export class CheckoutNotCreatedError extends ServiceUnavailableError {
  readonly [NOT_CREATED] = true;
  static override [Symbol.hasInstance](value: unknown): boolean {
    return typeof value === 'object' && value !== null && NOT_CREATED in value;
  }
}

/** Vendor-neutral, deliberately minimal evidence accepted by the payment lifecycle. */
export interface CheckoutSession {
  id: string;
  url: string | null;
  bookingId: string;
  attemptId: string;
  amountCents: number;
  currency: string;
  paymentIntentId: string | null;
  paid: boolean;
  status: 'open' | 'complete' | 'expired';
  livemode: boolean;
  /** Succeeded refund total; -1 means incomplete/pending refund evidence. */
  refundedCents: number;
}

export interface CreateCheckoutSession {
  idempotencyKey: string;
  bookingId: string;
  attemptId: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
}

export interface PaymentEvent {
  id: string;
  type: string;
  session: CheckoutSession | null;
}

export interface PaymentGateway {
  readonly livemode: boolean;
  assertReady(): void;
  createCheckoutSession(input: CreateCheckoutSession): Promise<CheckoutSession>;
  retrieveCheckoutSession(id: string): Promise<CheckoutSession>;
  expireCheckoutSession(id: string): Promise<CheckoutSession>;
  verifyWebhook(rawBody: string, signature: string): PaymentEvent;
}
