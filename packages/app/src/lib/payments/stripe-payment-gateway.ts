import Stripe from 'stripe';
import { BadRequestError, ServiceUnavailableError, type AppEnv } from '@devmentor/core';
import type { CheckoutSession, CreateCheckoutSession, PaymentEvent, PaymentGateway } from '@devmentor/core/services';
import { CheckoutNotCreatedError } from '@devmentor/core/services';

type StripeClient = Pick<Stripe, 'checkout' | 'webhooks' | 'refunds'>;

/** Only the app composition layer depends on the vendor SDK. */
export class StripePaymentGateway implements PaymentGateway {
  readonly livemode: boolean;
  private client?: StripeClient;

  constructor(private readonly env: Pick<AppEnv, 'STRIPE_SECRET_KEY' | 'STRIPE_WEBHOOK_SECRET'>, client?: StripeClient) {
    this.client = client;
    this.livemode = /^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY ?? '');
  }

  private sdk(): StripeClient {
    if (!this.env.STRIPE_SECRET_KEY) throw new ServiceUnavailableError('Payments are not configured');
    // The service durably accounts for every possible creation submission.
    // Hidden SDK retries could turn an earlier accepted request into a final401
    // and falsely classify the whole call as definitely never created.
    return this.client ??= new Stripe(this.env.STRIPE_SECRET_KEY, { timeout: 10_000, maxNetworkRetries: 0 });
  }

  assertReady(): void {
    if (!this.env.STRIPE_SECRET_KEY || !this.env.STRIPE_WEBHOOK_SECRET) throw new ServiceUnavailableError('Payments are not configured');
  }

  private normalize(session: Stripe.Checkout.Session): CheckoutSession {
    if (session.status !== 'open' && session.status !== 'complete' && session.status !== 'expired') throw new BadRequestError('Unsupported payment session state');
    const intent = session.payment_intent;
    const expanded = typeof intent === 'object' && intent !== null ? intent : null;
    const charge = expanded?.latest_charge;
    return {
      id: session.id, url: session.url,
      bookingId: session.metadata?.bookingId ?? '', attemptId: session.metadata?.attemptId ?? '',
      amountCents: session.amount_total ?? -1, currency: (session.currency ?? '').toUpperCase(),
      paymentIntentId: typeof intent === 'string' ? intent : expanded?.id ?? null,
      paid: session.mode === 'payment' && session.payment_status === 'paid',
      status: session.status === 'complete' ? 'complete' : session.status === 'expired' ? 'expired' : 'open', livemode: session.livemode,
      refundedCents: typeof charge === 'object' && charge !== null ? charge.amount_refunded : 0,
    };
  }

  async createCheckoutSession(input: CreateCheckoutSession): Promise<CheckoutSession> {
    const sdk = this.sdk();
    try {
      return this.normalize(await sdk.checkout.sessions.create({
        mode: 'payment', allowed_payment_method_types: ['card'],
        line_items: [{ quantity: 1, price_data: {
          currency: input.currency.toLowerCase(), unit_amount: input.amountCents,
          product_data: { name: 'DevMentor text mentoring session' },
        } }],
        metadata: { bookingId: input.bookingId, attemptId: input.attemptId },
        payment_intent_data: { metadata: { bookingId: input.bookingId, attemptId: input.attemptId } },
        success_url: input.successUrl, cancel_url: input.cancelUrl,
        expires_at: Math.floor(input.expiresAt.getTime() / 1000),
      }, { idempotencyKey: input.idempotencyKey }));
    } catch (error) {
      const rejection = error as { type?: string; statusCode?: number } | null;
      if (rejection && ['StripeAuthenticationError', 'StripePermissionError', 'StripeInvalidRequestError'].includes(rejection.type ?? '') && [400, 401, 403].includes(rejection.statusCode ?? 0)) {
        throw new CheckoutNotCreatedError('Checkout was rejected before creation. Choose the time again after payment configuration is corrected.');
      }
      throw new ServiceUnavailableError('The payment provider could not create Checkout. Retry this booking.');
    }
  }

  async retrieveCheckoutSession(id: string): Promise<CheckoutSession> {
    const sdk = this.sdk();
    try {
      const result = this.normalize(await sdk.checkout.sessions.retrieve(id, { expand: ['payment_intent.latest_charge'] }));
      if (result.paid && result.paymentIntentId) {
        const refunds = await sdk.refunds.list({ payment_intent: result.paymentIntentId, limit: 100 });
        result.refundedCents = refunds.has_more || (result.refundedCents > 0 && refunds.data.length === 0) || refunds.data.some(refund => refund.status !== 'succeeded')
          ? -1 : refunds.data.reduce((total, refund) => total + refund.amount, 0);
      }
      return result;
    } catch { throw new ServiceUnavailableError('Payment status is temporarily unavailable'); }
  }

  async expireCheckoutSession(id: string): Promise<CheckoutSession> {
    const sdk = this.sdk();
    try { return this.normalize(await sdk.checkout.sessions.expire(id)); }
    catch { throw new ServiceUnavailableError('Checkout expiry could not be verified'); }
  }

  verifyWebhook(rawBody: string, signature: string): PaymentEvent {
    if (!this.env.STRIPE_WEBHOOK_SECRET) throw new ServiceUnavailableError('Payment webhooks are not configured');
    const sdk = this.sdk();
    try {
      const event = sdk.webhooks.constructEvent(rawBody, signature, this.env.STRIPE_WEBHOOK_SECRET);
      const session = event.data.object;
      return { id: event.id, type: event.type, session: session.object === 'checkout.session' ? this.normalize(session) : null };
    } catch { throw new BadRequestError('Invalid payment webhook'); }
  }
}
