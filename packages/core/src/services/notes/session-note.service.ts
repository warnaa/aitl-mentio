import { Booking, LockMode, SessionNote, type EntityManager, type IBooking, type ISessionNote } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import type { Session } from '../../http/auth';
import { parseWith } from '../../http/body';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../http/errors';
import type { RateLimitPolicy, RateLimiter } from '../../http/rate-limit';
import type { Clock } from '../../time/clock';
import { noteDraftSchema, noteSendSchema } from '../../validators/notes/note.schema';
import { sessionBookingIdSchema } from '../../validators/sessions/session-id.schema';

export const READ_NOTE_POLICY: RateLimitPolicy = { scope: 'note-reads', kind: 'account', limit: 120, windowMs: 60_000 };
export const SAVE_NOTE_POLICY: RateLimitPolicy = { scope: 'note-saves', kind: 'account', limit: 30, windowMs: 60_000 };
export const SEND_NOTE_POLICY: RateLimitPolicy = { scope: 'note-sends', kind: 'account', limit: 30, windowMs: 60_000 };
export interface SessionNoteServiceDeps {
  em: EntityManager;
  session: Promise<Session | null>;
  clock: Clock;
  rateLimiter: Pick<RateLimiter, 'consumeFor'>;
  eventBus: Pick<EventBus, 'emit'>;
}

export interface NoteDto {
  id: string;
  version: number;
  revision: number;
  body: string;
  status: 'draft' | 'awaiting_approval' | 'approved' | 'declined';
  declineComment: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  updatedAt: string;
  private: true;
}
export interface NoteView { current: NoteDto | null; history: NoteDto[] }
function toDto(row: ISessionNote): NoteDto {
  return { id: row.id, version: row.version, revision: row.revision, body: row.body,
    status: row.status as NoteDto['status'], declineComment: row.declineComment ?? null,
    sentAt: row.sentAt?.toISOString() ?? null, decidedAt: row.decidedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(), private: true };
}

/** Booking parties only. Global mentor/operator roles never grant access to another note. */
export class SessionNoteService {
  constructor(private readonly deps: SessionNoteServiceDeps) {}

  private async caller(bookingId: unknown) {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    return { id: parseWith(sessionBookingIdSchema, bookingId), userId: session.userId };
  }

  private async party(em: EntityManager, booking: IBooking | null, userId: string, write: boolean) {
    if (!booking || booking.status !== 'confirmed') throw new NotFoundError('Session not found');
    // Populate separately: the authoritative write check follows an ID-only lock.
    await em.populate(booking, ['mentee', 'mentorProfile.user']);
    const mentor = booking.mentorProfile.user.id === userId;
    if (!mentor && booking.mentee.id !== userId) throw new NotFoundError('Session not found');
    if (write && !mentor) throw new ForbiddenError('Only the mentor can write the session note.');
    return booking;
  }

  private latest(em: EntityManager, bookingId: string, locked: boolean) {
    return em.findOne(SessionNote, { booking: bookingId }, {
      orderBy: { version: 'desc' }, refresh: true,
      ...(locked ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {}),
    });
  }

  async getForParticipant(bookingId: unknown): Promise<NoteView> {
    const { id, userId } = await this.caller(bookingId);
    const em = this.deps.em.fork();
    await this.party(em, await em.findOne(Booking, { id }), userId, false);
    await this.deps.rateLimiter.consumeFor(READ_NOTE_POLICY, userId);
    const note = await this.latest(em, id, false);
    // Slice A creates only version 1. Decision history is delivered by slice B.
    return { current: note ? toDto(note) : null, history: [] };
  }

  private async mutate<T>(bookingId: unknown, policy: RateLimitPolicy, fn: (em: EntityManager, booking: IBooking, note: ISessionNote | null) => Promise<T>) {
    const { id, userId } = await this.caller(bookingId);
    const advisory = this.deps.em.fork();
    await this.party(advisory, await advisory.findOne(Booking, { id }), userId, true);
    // The limiter owns a separate scoped EM. Never await its connection while
    // holding the booking transaction's connection (even a max-one pool must work).
    await this.deps.rateLimiter.consumeFor(policy, userId);
    return this.deps.em.fork().transactional(async em => {
      const booking = await this.party(em, await em.findOne(Booking, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true }), userId, true);
      if (!booking.writtenAnswerAt) throw new ConflictError('Post the written answer before drafting a session note.');
      return fn(em, booking, await this.latest(em, id, true));
    });
  }

  async saveDraft(bookingId: unknown, input: unknown): Promise<NoteDto> {
    return this.mutate(bookingId, SAVE_NOTE_POLICY, async (em, booking, note) => {
      const data = parseWith(noteDraftSchema, input);
      if (note && (note.status !== 'draft' || data.expectedRevision !== note.revision)) throw new ConflictError('A newer session note exists. Refresh the saved preview; your edits are still here.');
      if (!note && data.expectedRevision !== null) throw new ConflictError('The saved draft no longer exists. Refresh the note.');
      const now = this.deps.clock.now();
      if (note) {
        note.body = data.body;
        note.revision += 1;
        note.updatedAt = now;
      } else {
        note = em.create(SessionNote, { booking, version: 1, revision: 1, body: data.body, status: 'draft', declineComment: null, sentAt: null, decidedAt: null, createdAt: now, updatedAt: now });
        em.persist(note);
      }
      await em.flush();
      return toDto(note);
    });
  }

  async send(bookingId: unknown, input: unknown): Promise<NoteDto> {
    const result = await this.mutate(bookingId, SEND_NOTE_POLICY, async (em, _booking, note) => {
      const data = parseWith(noteSendSchema, input);
      if (!note || note.version !== data.version || note.revision !== data.revision || !['draft', 'awaiting_approval'].includes(note.status)) throw new ConflictError('The saved note changed. Refresh it before sending.');
      if (note.status === 'draft') {
        note.status = 'awaiting_approval';
        note.sentAt = this.deps.clock.now();
        note.updatedAt = note.sentAt;
        await em.flush();
      }
      return { dto: toDto(note), bookingId: note.booking.id };
    });
    // Persist first. Replays repair a missed side effect; the bus deliberately swallows subscriber failures.
    await this.deps.eventBus.emit('notes.note.sent', { bookingId: result.bookingId, noteId: result.dto.id, version: result.dto.version });
    return result.dto;
  }
}
