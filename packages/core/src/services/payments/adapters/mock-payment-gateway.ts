import { z } from 'zod';
import { BadRequestError, NotFoundError } from '../../../http/errors';
import type { Clock } from '../../../time/clock';
import type { CheckoutSession, CreateCheckoutSession, PaymentEvent, PaymentGateway } from '../payment-gateway.port';

const sessionSchema = z.object({
  id: z.string().min(1), url: z.string().nullable(), bookingId: z.string().min(1), attemptId: z.string().min(1),
  amountCents: z.number().int().nonnegative(), currency: z.string().min(1), paymentIntentId: z.string().nullable(),
  paid: z.boolean(), status: z.enum(['open', 'complete', 'expired']), livemode: z.boolean(), refundedCents: z.number().int().nonnegative(),
});
const eventSchema = z.object({ id: z.string().min(1), type: z.string().min(1), session: sessionSchema.nullable() });

/** Never selected by missing credentials. The composition root gates this test-only protocol. */
export class MockPaymentGateway implements PaymentGateway {
  readonly livemode = false;
  private readonly sessions = new Map<string, CheckoutSession>();
  private readonly keys = new Map<string, string>();
  private readonly deadlines = new Map<string, Date>();
  constructor(private readonly deps: { clock: Clock }) {}

  assertReady(): void { /* The composition root has already required explicit integration mode. */ }

  async createCheckoutSession(input: CreateCheckoutSession): Promise<CheckoutSession> {
    const previous = this.keys.get(input.idempotencyKey);
    if (previous) return this.retrieveCheckoutSession(previous);
    if (input.expiresAt.getTime() < this.deps.clock.now().getTime() + 30 * 60_000) throw new BadRequestError('Checkout expiry is too soon.');
    const id = `cs_mock_${input.attemptId}`;
    const session: CheckoutSession = { id, url: `${input.successUrl}&mockCheckout=${id}`, bookingId: input.bookingId, attemptId: input.attemptId, amountCents: input.amountCents, currency: input.currency.toLowerCase(), paymentIntentId: null, paid: false, status: 'open', livemode: false, refundedCents: 0 };
    this.sessions.set(id, session); this.keys.set(input.idempotencyKey, id); this.deadlines.set(id, input.expiresAt);
    return { ...session };
  }

  async retrieveCheckoutSession(id: string): Promise<CheckoutSession> {
    const session = this.sessions.get(id);
    if (!session) throw new NotFoundError('Checkout session not found');
    if (session.status === 'open' && this.deadlines.get(id)!.getTime() <= this.deps.clock.now().getTime()) session.status = 'expired';
    return { ...session };
  }

  async expireCheckoutSession(id: string): Promise<CheckoutSession> {
    const session = await this.retrieveCheckoutSession(id);
    if (session.status === 'open') { session.status = 'expired'; this.sessions.set(id, session); }
    return session;
  }

  verifyWebhook(rawBody: string, signature: string): PaymentEvent {
    if (signature !== 'devmentor-mock-payment') throw new BadRequestError('Invalid payment signature');
    try {
      const event = eventSchema.parse(JSON.parse(rawBody));
      // The synthetic provider fixture advances an existing open session before the
      // service retrieves authoritative evidence. A delayed event never regresses
      // an already terminal provider session (especially a refunded payment).
      if (event.session && this.sessions.get(event.session.id)?.status === 'open') this.sessions.set(event.session.id, { ...event.session });
      return event;
    } catch { throw new BadRequestError('Invalid payment event'); }
  }

  async simulateCheckoutCompleted(id: string, amountCents?: number): Promise<PaymentEvent> {
    const session = await this.retrieveCheckoutSession(id);
    if (session.status !== 'open') throw new BadRequestError('Checkout is not open');
    const paid = { ...session, amountCents: amountCents ?? session.amountCents, status: 'complete' as const, paid: true, paymentIntentId: `pi_mock_${id}` };
    this.sessions.set(id, paid);
    return { id: crypto.randomUUID(), type: 'checkout.session.completed', session: paid };
  }

  async simulateCheckoutExpired(id: string): Promise<PaymentEvent> {
    return { id: crypto.randomUUID(), type: 'checkout.session.expired', session: await this.expireCheckoutSession(id) };
  }
}
