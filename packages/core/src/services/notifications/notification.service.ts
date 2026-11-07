import { Booking, Notification, UniqueConstraintViolationException, User, type EntityManager, type IBooking, type INotification } from '@devmentor/db';
import type { AppEnv } from '../../config/env';
import type { Session } from '../../http/auth';
import { parseWith } from '../../http/body';
import { UnauthorizedError } from '../../http/errors';
import type { Logger } from '../../logger';
import type { Clock } from '../../time/clock';
import { notificationReadSchema } from '../../validators/notifications/notification-read.schema';
import { answerPostedMail } from './answer-posted-mail';
import { bookingConfirmedMail, type Audience } from './booking-confirmed-mail';
import type { Mailer } from './mailer.port';

export type NotificationKind = 'booking_confirmed' | 'answer_posted';
const PAGE = 50;

export interface NotificationServiceDeps {
  em: EntityManager;
  session: Promise<Session | null>;
  clock: Clock;
  env: Pick<AppEnv, 'APP_URL'>;
  mailer: Mailer;
  logger: Pick<Logger, 'warn'>;
}

function toDto(row: INotification, userId: string) {
  const booking = row.booking as IBooking;
  const audience: Audience = booking.mentee.id === userId ? 'mentee' : 'mentor';
  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    audience,
    counterpartName: audience === 'mentee' ? booking.mentorProfile.user.displayName : booking.mentee.displayName,
    startsAt: booking.startsAt.toISOString(),
    lengthMinutes: booking.lengthMinutes,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    sessionPath: `/sessions/${booking.id}`,
  };
}
export type NotificationDto = ReturnType<typeof toDto>;

/**
 * Tells each participant about a confirmed booking and lets a signed-in user read their
 * own notifications. The consumer runs from an in-process event, so the class keeps the
 * whole dependency bag and reads from it lazily: it never touches `session`, which a
 * system scope does not have.
 */
export class NotificationService {
  constructor(private readonly deps: NotificationServiceDeps) {}

  /**
   * Event consumer for `bookings.booking.confirmed`. Writes nothing for a booking that
   * is missing or not confirmed. Each participant gets one row (a replay finds it) and one
   * email (`emailSentAt` guards it); one party's failed email never blocks the other.
   */
  async onBookingConfirmed(bookingId: string): Promise<void> {
    const booking = await this.deps.em.fork().findOne(Booking, { id: bookingId }, { populate: ['mentee', 'mentorProfile.user'] });
    if (!booking || booking.status !== 'confirmed') {
      this.deps.logger.warn({ bookingId }, 'notifications.booking_not_confirmed');
      return;
    }
    const mentor = booking.mentorProfile.user;
    const parties = [
      { user: booking.mentee, counterpart: mentor, audience: 'mentee' as const, path: '/home' },
      { user: mentor, counterpart: booking.mentee, audience: 'mentor' as const, path: '/mentor' },
    ];
    for (const party of parties) {
      const row = await this.record(party.user.id, booking.id, 'booking_confirmed');
      if (!row || row.emailSentAt) continue;
      try {
        await this.deps.mailer.send(bookingConfirmedMail({
          to: party.user.email,
          audience: party.audience,
          counterpartName: party.counterpart.displayName,
          startsAt: booking.startsAt,
          lengthMinutes: booking.lengthMinutes,
          sessionsUrl: new URL(party.path, this.deps.env.APP_URL).toString(),
        }));
        await this.deps.em.fork().nativeUpdate(Notification, { id: row.id }, { emailSentAt: this.deps.clock.now() });
      } catch (error) {
        // Neither address nor body is logged; the row stays unsent so a later replay can retry.
        this.deps.logger.warn({ err: error, notificationId: row.id }, 'notifications.email_failed');
      }
    }
  }

  /**
   * Event consumer for `sessions.answer.posted`, which fires on every save of the answer. Only
   * the mentee is told, once: the unique row makes a repeat find the existing notification, and
   * the email is claimed atomically (`emailSentAt` set before sending) so concurrent events send
   * it at most once. A failed send releases the claim, so the mentor's next save retries it.
   * Nothing is written for a booking that is not confirmed or has no answer.
   */
  async onAnswerPosted(bookingId: string): Promise<void> {
    const booking = await this.deps.em.fork().findOne(Booking, { id: bookingId }, { populate: ['mentee', 'mentorProfile.user'] });
    if (!booking || booking.status !== 'confirmed' || booking.writtenAnswer === null) {
      this.deps.logger.warn({ bookingId }, 'notifications.answer_not_posted');
      return;
    }
    const row = await this.record(booking.mentee.id, booking.id, 'answer_posted');
    if (!row || row.emailSentAt) return;
    const claimedAt = this.deps.clock.now();
    const claimed = await this.deps.em.fork().nativeUpdate(Notification, { id: row.id, emailSentAt: null }, { emailSentAt: claimedAt });
    if (claimed !== 1) return;
    try {
      await this.deps.mailer.send(answerPostedMail({
        to: booking.mentee.email,
        mentorName: booking.mentorProfile.user.displayName,
        sessionUrl: new URL(`/sessions/${booking.id}`, this.deps.env.APP_URL).toString(),
      }));
    } catch (error) {
      // Neither address nor body is logged; releasing the claim lets a later save retry. A send the
      // provider accepted but reported as failed (a response timeout) can therefore be sent twice.
      // A process that dies between the claim and the send leaves the email unsent: at most once.
      await this.deps.em.fork().nativeUpdate(Notification, { id: row.id, emailSentAt: claimedAt }, { emailSentAt: null });
      this.deps.logger.warn({ err: error, notificationId: row.id }, 'notifications.email_failed');
    }
  }

  /** The existing row, a new one, or null when a concurrent consumer inserted it first. */
  private async record(userId: string, bookingId: string, kind: NotificationKind): Promise<INotification | null> {
    const em = this.deps.em.fork();
    const existing = await em.findOne(Notification, { user: userId, kind, booking: bookingId });
    if (existing) return existing;
    try {
      const now = this.deps.clock.now();
      const row = em.create(Notification, {
        user: em.getReference(User, userId), booking: em.getReference(Booking, bookingId),
        kind, readAt: null, emailSentAt: null, createdAt: now, updatedAt: now,
      });
      em.persist(row);
      await em.flush();
      return row;
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) return null;
      throw error;
    }
  }

  private async caller() {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    return session;
  }

  /** The caller's newest notifications and their total unread count; scope is `session.userId`. */
  async listMine() {
    const { userId } = await this.caller();
    const em = this.deps.em.fork();
    const rows = await em.find(Notification, { user: userId }, { populate: ['booking.mentee', 'booking.mentorProfile.user'], orderBy: { createdAt: 'desc' }, limit: PAGE });
    const unreadCount = await em.count(Notification, { user: userId, readAt: null });
    return { unreadCount, items: rows.map(row => toDto(row, userId)) };
  }

  /** Marks only the caller's own unread rows; other people's ids are indistinguishable from read ones. */
  async markRead(input: unknown) {
    const { userId } = await this.caller();
    const { ids } = parseWith(notificationReadSchema, input);
    const now = this.deps.clock.now();
    const updated = await this.deps.em.fork().nativeUpdate(Notification, { id: { $in: ids }, user: userId, readAt: null }, { readAt: now, updatedAt: now });
    return { updated };
  }
}
