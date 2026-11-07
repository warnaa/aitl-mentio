import { Booking, SessionMessage, type EntityManager, type IBooking, type ISessionMessage } from '@devmentor/db';
import type { Session } from '../../http/auth';
import { parseWith } from '../../http/body';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../http/errors';
import type { RateLimitPolicy, RateLimiter } from '../../http/rate-limit';
import type { Clock } from '../../time/clock';
import { messageCreateSchema } from '../../validators/sessions/message-create.schema';
import { sessionBookingIdSchema } from '../../validators/sessions/session-id.schema';
import { MINUTE_MS } from '../bookings/occupancy';

/** Operational request protection for the exchange; not a product quota. */
export const POST_MESSAGE_POLICY: RateLimitPolicy = { scope: 'session-messages', kind: 'account', limit: 30, windowMs: 60_000 };
/** Sized for several open tabs polling every five seconds. */
export const READ_SESSION_POLICY: RateLimitPolicy = { scope: 'session-reads', kind: 'account', limit: 120, windowMs: 60_000 };
/** The newest messages a read returns; older ones are flagged with `truncated`. */
export const MESSAGE_PAGE = 500;

export type SessionWindow = 'not_started' | 'open' | 'ended';
export type PartyRole = 'mentee' | 'mentor';

/**
 * Where `now` sits against a booking's window. The window is derived, never stored:
 * exactly `startsAt` is open and exactly `endsAt` is ended.
 */
export function sessionWindow(booking: Pick<IBooking, 'startsAt' | 'lengthMinutes'>, now: Date): { window: SessionWindow; endsAt: Date } {
  const endsAt = new Date(booking.startsAt.getTime() + booking.lengthMinutes * MINUTE_MS);
  if (now < booking.startsAt) return { window: 'not_started', endsAt };
  return { window: now < endsAt ? 'open' : 'ended', endsAt };
}

export interface TextSessionServiceDeps {
  em: EntityManager;
  session: Promise<Session | null>;
  clock: Clock;
  rateLimiter: Pick<RateLimiter, 'consumeFor'>;
}

function toMessageDto(row: ISessionMessage, booking: IBooking, userId: string) {
  return {
    id: row.id,
    authorRole: (row.author.id === booking.mentee.id ? 'mentee' : 'mentor') as PartyRole,
    isOwn: row.author.id === userId,
    authorName: row.author.displayName,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}
export type SessionMessageDto = ReturnType<typeof toMessageDto>;

/**
 * The text exchange of a confirmed booking. Every call answers one question first: is the
 * caller a party to a confirmed booking? Anyone else (a stranger, an unknown id, a booking
 * that is not confirmed) gets the same `NotFoundError`, so nothing reveals that a booking
 * exists. Roles alone are not enough: one user can be mentee on one booking and mentor on
 * another, so the party is decided per booking.
 */
export class TextSessionService {
  constructor(private readonly deps: TextSessionServiceDeps) {}

  private async party(bookingId: string) {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    const id = parseWith(sessionBookingIdSchema, bookingId);
    const booking = await this.deps.em.findOne(Booking, { id, status: 'confirmed' }, { populate: ['mentee', 'mentorProfile.user'] });
    const role: PartyRole | null = !booking ? null : booking.mentee.id === session.userId ? 'mentee' : booking.mentorProfile.user.id === session.userId ? 'mentor' : null;
    if (!booking || !role) throw new NotFoundError('Session not found');
    return { booking, role, userId: session.userId, user: role === 'mentee' ? booking.mentee : booking.mentorProfile.user };
  }

  /** The session as the caller sees it: window, counterpart and the newest messages in time order. */
  async getForParticipant(bookingId: string) {
    const { booking, role, userId } = await this.party(bookingId);
    await this.deps.rateLimiter.consumeFor(READ_SESSION_POLICY, userId);
    const now = this.deps.clock.now();
    const rows = await this.deps.em.find(SessionMessage, { booking: booking.id }, { populate: ['author'], orderBy: { createdAt: 'desc', id: 'desc' }, limit: MESSAGE_PAGE + 1 });
    const { window, endsAt } = sessionWindow(booking, now);
    return {
      booking: { id: booking.id, startsAt: booking.startsAt.toISOString(), endsAt: endsAt.toISOString(), lengthMinutes: booking.lengthMinutes },
      window,
      serverNow: now.toISOString(),
      viewerRole: role,
      counterpartName: role === 'mentee' ? booking.mentorProfile.user.displayName : booking.mentee.displayName,
      truncated: rows.length > MESSAGE_PAGE,
      messages: rows.slice(0, MESSAGE_PAGE).reverse().map(row => toMessageDto(row, booking, userId)),
    };
  }

  /** Posts one message while the window is open. The window is judged by one clock read taken before the insert. */
  async postMessage(bookingId: string, input: unknown) {
    const { booking, userId, user } = await this.party(bookingId);
    await this.deps.rateLimiter.consumeFor(POST_MESSAGE_POLICY, userId);
    const { body } = parseWith(messageCreateSchema, input);
    const now = this.deps.clock.now();
    const { window } = sessionWindow(booking, now);
    if (window === 'not_started') throw new ConflictError('This session has not started yet.');
    if (window === 'ended') throw new ConflictError('This session has ended.');
    const row = this.deps.em.create(SessionMessage, { booking, author: user, body, createdAt: now, updatedAt: now });
    this.deps.em.persist(row);
    await this.deps.em.flush();
    return toMessageDto(row, booking, userId);
  }
}
