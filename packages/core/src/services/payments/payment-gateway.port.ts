import { ServiceUnavailableError } from '../../http/errors';

const NOT_CREATED = Symbol.for('devmentor.checkout-not-created');
/** A verified provider rejection, unlike a timeout with an unknown remote outcome. */
export class CheckoutNotCreatedError extends ServiceUnavailableError {
  readonly [NOT_CREATED] = true;
  static override [Symbol.hasInstance](value: unknown): boolean {
    return typeof value === 'object' && value !== null && NOT_CREATED in value;
  }
}

const REFUND_DECLINED = Symbol.for('devmentor.refund-declined');
/**
 * A definitive provider refusal to refund (an allowlisted decline). Every other refund
 * error means the outcome is unknown and must be reconciled from provider evidence.
 */
export class RefundDeclinedError extends Error {
  readonly [REFUND_DECLINED] = true;
  constructor(readonly code: string) { super(`Refund declined: ${code}`); }
  static override [Symbol.hasInstance](value: unknown): boolean {
    return typeof value === 'object' && value !== null && REFUND_DECLINED in value;
  }
}

export interface RefundRequest {
  /** Stable per booking (`refund-<bookingId>`); providers prune keys, so it is not the only guard. */
  idempotencyKey: string;
  paymentIntentId: string;
  amountCents: number;
  bookingId: string;
}

/** Normalized refund evidence. `bookingId` is null for a refund made outside DevMentor. */
export interface RefundResult {
  id: string;
  status: 'succeeded' | 'pending' | 'failed';
  amountCents: number;
  bookingId: string | null;
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
  refund(input: RefundRequest): Promise<RefundResult>;
  retrieveRefund(id: string): Promise<RefundResult>;
  /** Every refund recorded against the payment, including ones made by hand in the provider dashboard. */
  listRefunds(paymentIntentId: string): Promise<RefundResult[]>;
}
