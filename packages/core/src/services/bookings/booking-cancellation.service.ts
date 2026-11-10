import { z } from 'zod';
import { Booking, type EntityManager, type IBooking } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import { requireRole, type Session } from '../../http/auth';
import { parseWith } from '../../http/body';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '../../http/errors';
import type { Logger } from '../../logger';
import type { Clock } from '../../time/clock';
import { bookingCancelSchema, type BookingCancel } from '../../validators/bookings/booking-cancel.schema';
import { RefundDeclinedError, type PaymentGateway, type RefundResult } from '../payments/payment-gateway.port';
import { withBookingLock } from './booking-lock';
import { MINUTE_MS } from './occupancy';

/** D10/R09: a cancellation at least this far ahead of the start is refunded in full. */
export const FREE_CANCELLATION_HOURS = 24;
const FREE_CANCELLATION_MS = FREE_CANCELLATION_HOURS * 60 * MINUTE_MS;
export const REFUND_RETRY_MINUTES = 5;
/** Failed refunds are re-checked this often, so a refund the founders made by hand clears them. */
export const FAILED_REFUND_RECHECK_MINUTES = 60;

export class SessionStartedError extends AppError {
  static override readonly code = 'session_started';
  constructor() {
    super('This session has already started. To report a problem with it, contact DevMentor support about a quality dispute.', 409, SessionStartedError.code);
  }
}

export class RefundWindowChangedError extends AppError {
  static override readonly code = 'refund_window_changed';
  constructor(refund: boolean) {
    super(refund
      ? 'You can still cancel with a full refund. Review the outcome and confirm again.'
      : 'The free cancellation window has just closed. Nothing was cancelled; review the outcome and confirm again.', 409, RefundWindowChangedError.code);
  }
}

export type RefundStatus = 'none' | 'pending' | 'refunded' | 'failed';

export interface CancelledBookingDto {
  id: string;
  status: 'cancelled';
  cancelledAt: string;
  refundStatus: RefundStatus;
}

export interface BookingCancellationServiceDeps {
  em: EntityManager;
  session: Promise<Session | null>;
  clock: Clock;
  paymentGateway: PaymentGateway;
  eventBus: Pick<EventBus, 'emit'>;
  logger: Pick<Logger, 'warn' | 'error'>;
}

export const refundIdempotencyKey = (bookingId: string) => `refund-${bookingId}`;

/** True when the cancellation, judged at `now`, is free (inclusive 24-hour boundary). */
export function isFreeCancellation(startsAt: Date, now: Date) {
  return startsAt.getTime() - now.getTime() >= FREE_CANCELLATION_MS;
}

function toDto(booking: IBooking): CancelledBookingDto {
  return { id: booking.id, status: 'cancelled', cancelledAt: booking.cancelledAt!.toISOString(), refundStatus: booking.refundStatus as RefundStatus };
}

type RefundOutcome =
  | { kind: 'refunded'; refundId: string }
  | { kind: 'pending'; refundId: string | null }
  | { kind: 'failed'; reason: string };

/**
 * A mentee cancels their own confirmed session (E03-S05). The status change alone frees
 * the time: occupancy is derived from booking status. Money moves only after the
 * cancellation commits, outside row locks, and only after provider evidence shows that
 * no refund exists yet — idempotency keys expire, and the founders may have refunded by hand.
 */
export class BookingCancellationService {
  constructor(private readonly deps: BookingCancellationServiceDeps) {}

  async cancel(bookingId: string, input: BookingCancel) {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    const { userId } = requireRole(session, 'mentee');
    parseWith(z.uuid(), bookingId);
    const data = parseWith(bookingCancelSchema, input);
    // Scope before discovering lock owners; a foreign booking is indistinguishable from missing.
    if (!await this.deps.em.fork().findOne(Booking, { id: bookingId, mentee: userId })) throw new NotFoundError('Booking not found');
    const outcome = await withBookingLock(this.deps.em, bookingId, async (em, booking) => {
      if (booking.mentee.id !== userId) throw new NotFoundError('Booking not found');
      // A repeated request (double submit, retry after a lost response) answers the stored state.
      if (booking.status === 'cancelled') return { booking: toDto(booking), changed: false };
      if (booking.status !== 'confirmed') throw new ConflictError('Only a confirmed session can be cancelled.');
      const now = this.deps.clock.now();
      if (booking.startsAt.getTime() <= now.getTime()) throw new SessionStartedError();
      const free = isFreeCancellation(booking.startsAt, now);
      if (free !== data.expectRefund) throw new RefundWindowChangedError(free);
      // Never strand a refund: an unconfigured provider refuses the free cancellation itself.
      if (free) this.deps.paymentGateway.assertReady();
      booking.status = 'cancelled';
      booking.cancelledAt = now;
      booking.updatedAt = now;
      booking.refundStatus = free ? 'pending' : 'none';
      // The runner waits while this request is still talking to the provider.
      booking.refundNextAttemptAt = free ? new Date(now.getTime() + REFUND_RETRY_MINUTES * MINUTE_MS) : null;
      await em.flush();
      return { booking: toDto(booking), changed: true };
    });
    if (!outcome.changed) return { booking: outcome.booking };
    let refundStatus = outcome.booking.refundStatus;
    if (refundStatus === 'pending') {
      // The cancellation is committed; a failure here leaves the refund pending for the runner.
      refundStatus = await this.settleRefund(bookingId).catch(error => {
        this.deps.logger.warn({ bookingId, err: error instanceof Error ? error.message : 'unknown' }, 'bookings.refund.record_failed');
        return 'pending' as const;
      });
    }
    await this.deps.eventBus.emit('bookings.booking.cancelled', { bookingId });
    return { booking: { ...outcome.booking, refundStatus } };
  }

  /**
   * Advances one pending refund. Returns the stored refund status afterwards. Never
   * throws for provider trouble: an unknown outcome stays pending for the runner.
   */
  private async settleRefund(bookingId: string): Promise<RefundStatus> {
    const booking = await this.deps.em.fork().findOneOrFail(Booking, { id: bookingId });
    let outcome: RefundOutcome;
    try {
      outcome = await this.refundOnce(booking);
    } catch (error) {
      this.deps.logger.warn({ bookingId, err: error instanceof Error ? error.message : 'unknown' }, 'bookings.refund.unknown_outcome');
      outcome = { kind: 'pending', refundId: booking.stripeRefundId ?? null };
    }
    return this.record(bookingId, outcome);
  }

  /** Evidence first: adopt an existing refund, never top up a partial one, then refund. */
  private async refundOnce(booking: IBooking): Promise<RefundOutcome> {
    const intent = booking.stripePaymentIntentId;
    const amount = booking.amountPaidCents;
    if (!intent || !amount) return { kind: 'failed', reason: 'refund_no_payment' };
    if (booking.stripeRefundId) {
      const known = await this.deps.paymentGateway.retrieveRefund(booking.stripeRefundId);
      if (known.status !== 'failed') return this.fromResult(known);
    }
    const existing = (await this.deps.paymentGateway.listRefunds(intent)).filter(refund => refund.status !== 'failed');
    const covered = existing.reduce((total, refund) => total + refund.amountCents, 0);
    if (covered >= amount) {
      const pending = existing.find(refund => refund.status === 'pending');
      return pending ? { kind: 'pending', refundId: pending.id } : { kind: 'refunded', refundId: existing[0]!.id };
    }
    if (covered > 0) return { kind: 'failed', reason: 'refund_partial' };
    try {
      return this.fromResult(await this.deps.paymentGateway.refund({ idempotencyKey: refundIdempotencyKey(booking.id), paymentIntentId: intent, amountCents: amount, bookingId: booking.id }));
    } catch (error) {
      if (!(error instanceof RefundDeclinedError)) throw error;
      // Re-read evidence before recording a failure: a decline must not hide a refund that exists.
      const after = (await this.deps.paymentGateway.listRefunds(intent)).filter(refund => refund.status !== 'failed');
      if (after.reduce((total, refund) => total + refund.amountCents, 0) >= amount) return this.fromResult(after[0]!);
      return { kind: 'failed', reason: `refund_declined:${error.code}` };
    }
  }

  private fromResult(result: RefundResult): RefundOutcome {
    if (result.status === 'succeeded') return { kind: 'refunded', refundId: result.id };
    if (result.status === 'pending') return { kind: 'pending', refundId: result.id };
    return { kind: 'failed', reason: 'refund_failed' };
  }

  /** Compare-and-set: only a pending (or re-checked failed) refund changes; refunded never regresses. */
  private async record(bookingId: string, outcome: RefundOutcome, from: RefundStatus[] = ['pending']): Promise<RefundStatus> {
    return withBookingLock(this.deps.em, bookingId, async (em, booking) => {
      if (booking.status !== 'cancelled' || !from.includes(booking.refundStatus as RefundStatus)) return booking.refundStatus as RefundStatus;
      const now = this.deps.clock.now();
      if (outcome.kind === 'refunded') {
        booking.refundStatus = 'refunded'; booking.stripeRefundId = outcome.refundId; booking.refundNextAttemptAt = null;
      } else if (outcome.kind === 'pending') {
        booking.refundStatus = 'pending';
        if (outcome.refundId) booking.stripeRefundId = outcome.refundId;
        booking.refundNextAttemptAt = new Date(now.getTime() + REFUND_RETRY_MINUTES * MINUTE_MS);
      } else {
        if (booking.refundStatus !== 'failed') this.deps.logger.error({ bookingId, reason: outcome.reason }, 'bookings.refund.failed');
        booking.refundStatus = 'failed';
        booking.refundNextAttemptAt = new Date(now.getTime() + FAILED_REFUND_RECHECK_MINUTES * MINUTE_MS);
      }
      booking.updatedAt = now;
      await em.flush();
      return booking.refundStatus as RefundStatus;
    });
  }

  /**
   * The runner pass: advances due pending refunds and re-checks failed ones, so a refund
   * the founders made by hand turns into `refunded`. A failed refund is never re-requested.
   */
  async reconcileRefunds(limit = 25) {
    parseWith(z.number().int().min(1).max(100), limit);
    const now = this.deps.clock.now();
    const due = await this.deps.em.fork().find(Booking, { status: 'cancelled', refundStatus: { $in: ['pending', 'failed'] }, refundNextAttemptAt: { $lte: now } }, { orderBy: { refundNextAttemptAt: 'asc' }, limit });
    let processed = 0; let failed = 0;
    for (const booking of due) {
      try {
        if (booking.refundStatus === 'pending') await this.settleRefund(booking.id);
        else await this.recheckFailed(booking);
        processed++;
      } catch (error) {
        failed++;
        this.deps.logger.warn({ bookingId: booking.id, err: error instanceof Error ? error.message : 'unknown' }, 'bookings.refund.reconcile_failed');
        // Persist backoff even when the provider or database is unavailable.
        await this.deps.em.fork().nativeUpdate(Booking, { id: booking.id, refundStatus: booking.refundStatus }, { refundNextAttemptAt: new Date(now.getTime() + REFUND_RETRY_MINUTES * MINUTE_MS) });
      }
    }
    return { processed, failed };
  }

  private async recheckFailed(booking: IBooking) {
    const intent = booking.stripePaymentIntentId; const amount = booking.amountPaidCents;
    let outcome: RefundOutcome = { kind: 'failed', reason: 'refund_failed' };
    if (intent && amount) {
      const succeeded = (await this.deps.paymentGateway.listRefunds(intent)).filter(refund => refund.status === 'succeeded');
      if (succeeded.reduce((total, refund) => total + refund.amountCents, 0) >= amount) outcome = { kind: 'refunded', refundId: succeeded[0]!.id };
    }
    await this.record(booking.id, outcome, ['failed']);
  }
}
