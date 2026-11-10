import { z } from 'zod';
import { Booking, MentorProfile, PaymentAttempt, PaymentResolution, ProcessedWebhookEvent, User, UniqueConstraintViolationException, type EntityManager, type IBooking, type IPaymentAttempt } from '@devmentor/db';
import type { AppEnv } from '../../config/env';
import type { EventBus } from '../../events/event-bus';
import { requireRole, type Session } from '../../http/auth';
import { parseWith } from '../../http/body';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../http/errors';
import type { Clock } from '../../time/clock';
import type { CheckoutSession, CreateCheckoutSession, PaymentEvent, PaymentGateway } from './payment-gateway.port';
import { CheckoutNotCreatedError } from './payment-gateway.port';
import { withBookingLock } from '../bookings/booking-lock';
import { FREE_CANCELLATION_HOURS } from '../bookings/booking-cancellation.service';

const MINUTE = 60_000;
const unresolved = ['creating', 'open', 'review'];
const resolutionSchema = z.object({ action: z.enum(['confirm', 'release']), reason: z.string().trim().min(1).max(500), sessionId: z.string().min(1).max(255).optional() });

export interface PaymentServiceDeps {
  em: EntityManager;
  session: Promise<Session | null>;
  clock: Clock;
  env: Pick<AppEnv, 'APP_URL'>;
  paymentGateway: PaymentGateway;
  eventBus: Pick<EventBus, 'emit'>;
}

/** The database owns transitions; external calls never run while row locks are held. */
export class PaymentService {
  constructor(private readonly deps: PaymentServiceDeps) {}

  private async caller(role?: 'mentee' | 'operator') {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    return role ? requireRole(session, role) : session;
  }

  private async locked<T>(bookingId: string, fn: (em: EntityManager, booking: IBooking) => Promise<T>) {
    return withBookingLock(this.deps.em, bookingId, fn);
  }

  private input(attempt: IPaymentAttempt): CreateCheckoutSession {
    const booking = attempt.booking;
    return { idempotencyKey: attempt.idempotencyKey, attemptId: attempt.id, bookingId: booking.id, amountCents: booking.priceCents, currency: booking.currency, successUrl: attempt.successUrl, cancelUrl: attempt.cancelUrl, expiresAt: attempt.expiresAt };
  }

  async startCheckout(bookingId: string) {
    const { userId } = await this.caller('mentee');
    parseWith(z.uuid(), bookingId);
    // Scope before discovering lock owners; a foreign booking is indistinguishable from missing.
    if (!await this.deps.em.findOne(Booking, { id: bookingId, mentee: userId })) throw new NotFoundError('Booking not found');
    this.deps.paymentGateway.assertReady();
    const attempt = await this.locked(bookingId, async (em, booking) => {
      if (booking.mentee.id !== userId) throw new NotFoundError('Booking not found');
      const existing = await em.findOne(PaymentAttempt, { booking: booking.id }, { populate: ['booking'], refresh: true });
      if (booking.status !== 'pending') throw new ConflictError('This booking cannot be paid.');
      if (existing) {
        if (existing.state === 'review' || !unresolved.includes(existing.state)) throw new ConflictError('This payment needs review.');
        return existing;
      }
      const now = this.deps.clock.now();
      const expiresAt = new Date(Math.ceil(now.getTime() / 1000) * 1000 + 31 * MINUTE);
      if (!booking.expiresAt || booking.expiresAt <= now || expiresAt.getTime() > booking.startsAt.getTime() - 30 * MINUTE) throw new ConflictError('The payment window has ended. Choose another time.');
      const profile = await em.findOneOrFail(MentorProfile, { id: booking.mentorProfile.id });
      const id = crypto.randomUUID();
      const row = em.create(PaymentAttempt, { id, booking, idempotencyKey: `booking-payment-${id}`, sessionId: null, state: 'creating', expiresAt,
        successUrl: new URL(`/home?booked=${booking.id}`, this.deps.env.APP_URL).toString(),
        cancelUrl: new URL(`/m/${encodeURIComponent(profile.slug!)}`, this.deps.env.APP_URL).toString(),
        nextReconciliationAt: new Date(now.getTime() + MINUTE), diagnosticCode: null, submissionCount: 0, rejectedSubmissionCount: 0, createdAt: now, updatedAt: now });
      booking.paymentPending = true; booking.expiresAt = expiresAt; booking.updatedAt = now;
      em.persist(row); await em.flush();
      return row;
    });
    const session = await this.recover(attempt);
    if (!session || session.status !== 'open' || !session.url) throw new ConflictError('Payment is no longer open. Check your session status.');
    return { bookingId, url: session.url, expiresAt: attempt.expiresAt.toISOString() };
  }

  private matches(attempt: IPaymentAttempt, session: CheckoutSession) {
    return session.bookingId === attempt.booking.id && session.attemptId === attempt.id &&
      (attempt.sessionId === null || session.id === attempt.sessionId) && session.livemode === this.deps.paymentGateway.livemode;
  }

  private exact(attempt: IPaymentAttempt, session: CheckoutSession) {
    return this.matches(attempt, session) && session.amountCents === attempt.booking.priceCents &&
      session.currency.toUpperCase() === attempt.booking.currency && session.paid && session.status === 'complete' &&
      !!session.paymentIntentId && session.refundedCents === 0;
  }

  private async apply(em: EntityManager, attempt: IPaymentAttempt, session: CheckoutSession, operator = false) {
    const booking = attempt.booking;
    const now = this.deps.clock.now();
    if (booking.status === 'confirmed') return 'already_confirmed';
    if (booking.status !== 'pending' || !booking.paymentPending) return 'terminal';
    attempt.updatedAt = now;
    if (!this.matches(attempt, session)) { attempt.state = 'review'; attempt.diagnosticCode = 'identity_mismatch'; return 'review'; }
    attempt.sessionId = session.id; booking.stripeCheckoutSessionId = session.id;
    if (session.amountCents !== booking.priceCents || session.currency.toUpperCase() !== booking.currency) { attempt.state = 'review'; attempt.diagnosticCode = 'amount_mismatch'; return 'review'; }
    if (attempt.state === 'review' && !operator) return 'review';
    if (this.exact(attempt, session) && now < booking.startsAt) {
      const reused = await em.findOne(Booking, { stripePaymentIntentId: session.paymentIntentId, id: { $ne: booking.id } });
      if (!reused) {
        booking.status = 'confirmed'; booking.bookedAt = now; booking.paidAt = now;
        booking.stripePaymentIntentId = session.paymentIntentId; booking.amountPaidCents = session.amountCents;
        booking.paymentPending = false; booking.updatedAt = now; attempt.state = 'confirmed'; attempt.diagnosticCode = null;
        return 'confirmed';
      }
    }
    if (session.status === 'expired' && !session.paid && session.refundedCents === 0) {
      booking.status = 'expired'; booking.paymentPending = false; booking.updatedAt = now; attempt.state = 'expired'; attempt.diagnosticCode = null;
      return 'expired';
    }
    if (session.paid || session.status === 'complete') { attempt.state = 'review'; attempt.diagnosticCode = 'payment_needs_review'; return 'review'; }
    attempt.state = 'open'; attempt.nextReconciliationAt = new Date(now.getTime() + MINUTE);
    return 'open';
  }

  private async applyRetrieved(attempt: IPaymentAttempt, session: CheckoutSession) {
    const result = await this.locked(attempt.booking.id, async (em, booking) => {
      const current = await em.findOneOrFail(PaymentAttempt, { id: attempt.id }, { refresh: true });
      current.booking = booking;
      const outcome = await this.apply(em, current, session); await em.flush(); return outcome;
    });
    if (result === 'confirmed') await this.emitConfirmed(attempt.booking.id);
    return result;
  }

  private async recover(attempt: IPaymentAttempt): Promise<CheckoutSession | null> {
    if (attempt.sessionId) {
      const session = await this.deps.paymentGateway.retrieveCheckoutSession(attempt.sessionId);
      const outcome = await this.applyRetrieved(attempt, session); return outcome === 'open' ? session : null;
    }
    // An ambiguous create must never be retried with newly extended parameters. Once
    // Stripe's 30-minute minimum cannot be met, retain occupancy for operator review.
    if (attempt.expiresAt.getTime() < this.deps.clock.now().getTime() + 30 * MINUTE) {
      await this.locked(attempt.booking.id, async (em, booking) => {
        const current = await em.findOneOrFail(PaymentAttempt, { id: attempt.id }, { refresh: true });
        if (current.sessionId === null && current.state === 'creating' && booking.status === 'pending') {
          current.state = 'review'; current.diagnosticCode = 'ambiguous_creation'; current.nextReconciliationAt = new Date(this.deps.clock.now().getTime() + 5 * MINUTE);
          await em.flush();
        }
      });
      return null;
    }
    // Count submissions durably before network I/O. Only rejection evidence for
    // every submitted request can prove that an unattached attempt never existed.
    const submit = await this.locked(attempt.booking.id, async (em, booking) => {
      const current = await em.findOneOrFail(PaymentAttempt, { id: attempt.id }, { refresh: true });
      if (current.sessionId) return { sessionId: current.sessionId, submitted: false };
      if (current.state !== 'creating' || booking.status !== 'pending') return { sessionId: null, submitted: false };
      current.submissionCount++; await em.flush(); return { sessionId: null, submitted: true };
    });
    if (submit.sessionId) {
      const session = await this.deps.paymentGateway.retrieveCheckoutSession(submit.sessionId);
      const outcome = await this.applyRetrieved(attempt, session);
      return outcome === 'open' ? session : null;
    }
    if (!submit.submitted) return null;
    let session: CheckoutSession;
    try { session = await this.deps.paymentGateway.createCheckoutSession(this.input(attempt)); }
    catch (error) {
      if (error instanceof CheckoutNotCreatedError) {
        await this.locked(attempt.booking.id, async (em, booking) => {
          const current = await em.findOneOrFail(PaymentAttempt, { id: attempt.id }, { refresh: true });
          current.rejectedSubmissionCount++;
          if (!current.sessionId && booking.status === 'pending' && current.submissionCount === current.rejectedSubmissionCount) {
            current.state = 'expired'; current.diagnosticCode = 'checkout_rejected'; current.updatedAt = this.deps.clock.now();
            booking.status = 'expired'; booking.paymentPending = false; booking.updatedAt = this.deps.clock.now();
          }
          await em.flush();
        });
      }
      throw error;
    }
    // An idempotent replay may return a completed/refunded session; creation
    // snapshots do not prove current refund status, so retrieve before applying.
    if (session.status !== 'open') session = await this.deps.paymentGateway.retrieveCheckoutSession(session.id);
    const outcome = await this.applyRetrieved(attempt, session); return outcome === 'open' ? session : null;
  }

  async handleEvent(event: PaymentEvent) {
    if (!['checkout.session.completed', 'checkout.session.expired', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'].includes(event.type) || !event.session) return { outcome: 'ignored' };
    const session = event.session;
    const lookup = z.uuid().safeParse(session.attemptId).success ? { $or: [{ sessionId: session.id }, { id: session.attemptId }] } : { sessionId: session.id };
    const discovered = await this.deps.em.fork().findOne(PaymentAttempt, lookup, { populate: ['booking'] });
    // Re-read current provider truth outside locks: an old paid webhook must not
    // reconfirm a charge that was refunded before this delivery was processed.
    const snapshotMatches = discovered && this.matches(discovered, session) && session.amountCents === discovered.booking.priceCents && session.currency.toUpperCase() === discovered.booking.currency;
    const currentEvidence = snapshotMatches ? await this.deps.paymentGateway.retrieveCheckoutSession(session.id) : session;
    let outcome: string;
    try {
      const process = async (em: EntityManager, booking?: IBooking) => {
        if (await em.findOne(ProcessedWebhookEvent, { eventId: event.id })) return 'duplicate';
        let result = 'unknown_session';
        if (discovered && booking) {
          const attempt = await em.findOneOrFail(PaymentAttempt, { id: discovered.id }, { refresh: true });
          attempt.booking = booking;
          result = await this.apply(em, attempt, currentEvidence);
        }
        const now = this.deps.clock.now();
        em.persist(em.create(ProcessedWebhookEvent, { eventId: event.id, type: event.type, receivedAt: now, booking: booking ?? null, sessionId: session.id, outcome: result, createdAt: now, updatedAt: now }));
        await em.flush(); return result;
      };
      outcome = discovered ? await this.locked(discovered.booking.id, (em, booking) => process(em, booking)) : await this.deps.em.fork().transactional(em => process(em));
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException && (error as { constraint?: string }).constraint === 'processed_webhook_events_event_id_unique') outcome = 'duplicate';
      else throw error;
    }
    if (outcome === 'confirmed') await this.emitConfirmed(discovered!.booking.id);
    return { outcome };
  }

  private async emitConfirmed(bookingId: string) {
    await this.deps.eventBus.emit('bookings.booking.confirmed', { bookingId });
  }

  async reconcile(limit = 25) {
    parseWith(z.number().int().min(1).max(100), limit);
    const now = this.deps.clock.now();
    const attempts = await this.deps.em.fork().find(PaymentAttempt, { state: { $in: unresolved }, nextReconciliationAt: { $lte: now } }, { populate: ['booking'], orderBy: { nextReconciliationAt: 'asc' }, limit });
    let processed = 0; let failed = 0;
    for (const attempt of attempts) {
      try { await this.recover(attempt); processed++; } catch { failed++; }
      // Persist bounded backoff even on provider outages and review states.
      await this.deps.em.fork().nativeUpdate(PaymentAttempt, { id: attempt.id, state: { $in: unresolved } }, { nextReconciliationAt: new Date(now.getTime() + 5 * MINUTE) });
    }
    return { processed, failed };
  }

  async resolveReview(attemptId: string, input: { action: 'confirm' | 'release'; reason: string; sessionId?: string }) {
    const { userId } = await this.caller('operator'); parseWith(z.uuid(), attemptId);
    const data = parseWith(resolutionSchema, input);
    const attempt = await this.deps.em.fork().findOne(PaymentAttempt, { id: attemptId }, { populate: ['booking'] });
    if (!attempt) throw new NotFoundError('Payment attempt not found');
    const sessionId = attempt.sessionId ?? data.sessionId;
    if (!sessionId) throw new ConflictError('Provide a provider session identity to reconcile this ambiguous creation.');
    const evidence = await this.deps.paymentGateway.retrieveCheckoutSession(sessionId);
    const outcome = await this.locked(attempt.booking.id, async (em, booking) => {
      const current = await em.findOneOrFail(PaymentAttempt, { id: attemptId }, { refresh: true }); current.booking = booking;
      if (current.state !== 'review' || booking.status !== 'pending' || !this.matches(current, evidence)) throw new ConflictError('Payment state changed or evidence does not match.');
      current.sessionId = evidence.id; booking.stripeCheckoutSessionId = evidence.id;
      let result: string;
      if (data.action === 'confirm') {
        if (!this.exact(current, evidence) || this.deps.clock.now() >= booking.startsAt) throw new ConflictError('The provider does not prove an eligible full payment.');
        result = await this.apply(em, current, evidence, true);
        if (result !== 'confirmed') throw new ConflictError('The payment cannot be confirmed.');
      } else {
        const unpaidExpired = evidence.status === 'expired' && !evidence.paid && evidence.refundedCents === 0;
        const fullyRefunded = evidence.paid && !!evidence.paymentIntentId && evidence.amountCents > 0 && evidence.refundedCents === evidence.amountCents;
        if (!unpaidExpired && !fullyRefunded) throw new ConflictError('The provider does not prove terminal unpaid expiry or a completed full refund.');
        booking.status = 'expired'; booking.paymentPending = false; booking.updatedAt = this.deps.clock.now(); current.state = 'expired'; current.diagnosticCode = null; result = 'expired';
      }
      const now = this.deps.clock.now();
      em.persist(em.create(PaymentResolution, { attempt: current, actor: em.getReference(User, userId), action: data.action, reason: data.reason, sessionId: evidence.id, paymentIntentId: evidence.paymentIntentId, createdAt: now, updatedAt: now }));
      await em.flush(); return result;
    });
    if (outcome === 'confirmed') await this.emitConfirmed(attempt.booking.id);
    return { status: outcome };
  }

  async listMine(role: 'mentee' | 'mentor' = 'mentee') {
    const session = await this.caller();
    parseWith(z.enum(['mentee', 'mentor']), role);
    requireRole(session, role);
    const rows = await this.deps.em.find(Booking, role === 'mentee' ? { mentee: session.userId } : { mentorProfile: { user: session.userId } }, { populate: ['mentee', 'mentorProfile.user'], orderBy: { startsAt: 'desc' }, limit: 50 });
    const attempts = rows.length ? await this.deps.em.find(PaymentAttempt, { booking: { $in: rows.map(row => row.id) } }) : [];
    return rows.map(row => ({ id: row.id, mentorName: row.mentorProfile.user.displayName, menteeName: row.mentee.displayName, lengthMinutes: row.lengthMinutes, priceCents: row.priceCents, currency: row.currency, status: row.status, startsAt: row.startsAt.toISOString(), expiresAt: row.expiresAt?.toISOString() ?? null, paidAt: row.paidAt?.toISOString() ?? null, paymentStatus: attempts.find(attempt => attempt.booking.id === row.id)?.state ?? 'unpaid',
      // E03-S05: the dialog phrases the outcome from this line; the server decides again on cancel.
      cancelledAt: row.cancelledAt?.toISOString() ?? null, refundStatus: row.refundStatus, freeCancellationUntil: new Date(row.startsAt.getTime() - FREE_CANCELLATION_HOURS * 3_600_000).toISOString() }));
  }

  async listReview() {
    await this.caller('operator');
    const attempts = await this.deps.em.find(PaymentAttempt, { state: { $in: unresolved } }, { orderBy: { nextReconciliationAt: 'asc' }, limit: 50 });
    const unknown = await this.deps.em.find(ProcessedWebhookEvent, { booking: null, outcome: 'unknown_session' }, { orderBy: { receivedAt: 'desc' }, limit: 25 });
    return [
      ...attempts.map(row => ({ attemptId: row.id as string | null, bookingId: row.booking.id as string | null, sessionId: row.sessionId, status: row.state, reason: row.diagnosticCode, createdAt: row.createdAt.toISOString(), nextReconciliationAt: row.nextReconciliationAt.toISOString() })),
      ...unknown.map(row => ({ attemptId: null, bookingId: null, sessionId: row.sessionId, status: 'review', reason: 'unknown_provider_session', createdAt: row.receivedAt.toISOString(), nextReconciliationAt: row.receivedAt.toISOString() })),
    ];
  }
}
