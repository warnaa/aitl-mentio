import { Booking, LockMode, SessionNote, type EntityManager, type IBooking, type ISessionNote } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import type { Session } from '../../http/auth';
import { parseWith } from '../../http/body';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../http/errors';
import type { RateLimitPolicy, RateLimiter } from '../../http/rate-limit';
import type { Clock } from '../../time/clock';
import type { z } from 'zod';
import { noteApproveSchema, noteDeclineSchema } from '../../validators/notes/note-decline.schema';
import { noteDraftSchema, noteSendSchema } from '../../validators/notes/note.schema';
import { sessionBookingIdSchema } from '../../validators/sessions/session-id.schema';

export const READ_NOTE_POLICY: RateLimitPolicy = { scope: 'note-reads', kind: 'account', limit: 120, windowMs: 60_000 };
export const SAVE_NOTE_POLICY: RateLimitPolicy = { scope: 'note-saves', kind: 'account', limit: 30, windowMs: 60_000 };
export const SEND_NOTE_POLICY: RateLimitPolicy = { scope: 'note-sends', kind: 'account', limit: 30, windowMs: 60_000 };
export const DECIDE_NOTE_POLICY: RateLimitPolicy = { scope: 'note-decisions', kind: 'account', limit: 30, windowMs: 60_000 };
/** Operators read the newest sessions first; the signal is recent, so one page is enough. */
export const DECLINE_REPORT_PAGE = 100;
type Actor = 'mentor' | 'mentee';

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
/** Aggregate only (D20's co-editing signal): never a note body or a decline comment. */
export interface NoteDeclineRow { bookingId: string; startsAt: string; mentorName: string; menteeName: string; declineCount: number }
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

  private async party(em: EntityManager, booking: IBooking | null, userId: string, actor: Actor | null) {
    if (!booking || booking.status !== 'confirmed') throw new NotFoundError('Session not found');
    // Populate separately: the authoritative write check follows an ID-only lock.
    await em.populate(booking, ['mentee', 'mentorProfile.user']);
    const mentor = booking.mentorProfile.user.id === userId;
    if (!mentor && booking.mentee.id !== userId) throw new NotFoundError('Session not found');
    if (actor === 'mentor' && !mentor) throw new ForbiddenError('Only the mentor can write the session note.');
    if (actor === 'mentee' && mentor) throw new ForbiddenError('Only the mentee can approve or decline the session note.');
    return booking;
  }

  private latest(em: EntityManager, bookingId: string) {
    return em.findOne(SessionNote, { booking: bookingId }, { orderBy: { version: 'desc' }, refresh: true, lockMode: LockMode.PESSIMISTIC_WRITE });
  }

  async getForParticipant(bookingId: unknown): Promise<NoteView> {
    const { id, userId } = await this.caller(bookingId);
    const em = this.deps.em.fork();
    await this.party(em, await em.findOne(Booking, { id }), userId, null);
    await this.deps.rateLimiter.consumeFor(READ_NOTE_POLICY, userId);
    const [current, ...history] = await em.find(SessionNote, { booking: id }, { orderBy: { version: 'desc' }, refresh: true });
    return { current: current ? toDto(current) : null, history: history.map(toDto) };
  }

  private async mutate<T>(bookingId: unknown, policy: RateLimitPolicy, actor: Actor, fn: (em: EntityManager, booking: IBooking, note: ISessionNote | null) => Promise<T>) {
    const { id, userId } = await this.caller(bookingId);
    const advisory = this.deps.em.fork();
    await this.party(advisory, await advisory.findOne(Booking, { id }), userId, actor);
    // The limiter owns a separate scoped EM. Never await its connection while
    // holding the booking transaction's connection (even a max-one pool must work).
    await this.deps.rateLimiter.consumeFor(policy, userId);
    return this.deps.em.fork().transactional(async em => {
      const booking = await this.party(em, await em.findOne(Booking, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true }), userId, actor);
      if (!booking.writtenAnswerAt) throw new ConflictError('Post the written answer before drafting a session note.');
      return fn(em, booking, await this.latest(em, id));
    });
  }

  private create(em: EntityManager, booking: IBooking, version: number, body: string, now: Date) {
    const note = em.create(SessionNote, { booking, version, revision: 1, body, status: 'draft', declineComment: null, sentAt: null, decidedAt: null, createdAt: now, updatedAt: now });
    em.persist(note);
    return note;
  }

  async saveDraft(bookingId: unknown, input: unknown): Promise<NoteDto> {
    return this.mutate(bookingId, SAVE_NOTE_POLICY, 'mentor', async (em, booking, note) => {
      const data = parseWith(noteDraftSchema, input);
      const stale = new ConflictError('A newer session note exists. Refresh the saved preview; your edits are still here.');
      const now = this.deps.clock.now();
      if (note?.status === 'declined') {
        // A redraft is a new version; the declined one stays as it was, comment included.
        if (data.expectedVersion !== note.version || data.expectedRevision !== note.revision) throw stale;
        note = this.create(em, booking, note.version + 1, data.body, now);
      } else if (note) {
        if (note.status !== 'draft' || data.expectedRevision !== note.revision || (data.expectedVersion != null && data.expectedVersion !== note.version)) throw stale;
        note.body = data.body;
        note.revision += 1;
        note.updatedAt = now;
      } else {
        if (data.expectedRevision !== null) throw new ConflictError('The saved draft no longer exists. Refresh the note.');
        note = this.create(em, booking, 1, data.body, now);
      }
      await em.flush();
      return toDto(note);
    });
  }

  async send(bookingId: unknown, input: unknown): Promise<NoteDto> {
    const result = await this.mutate(bookingId, SEND_NOTE_POLICY, 'mentor', async (em, _booking, note) => {
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

  approve(bookingId: unknown, input: unknown): Promise<NoteDto> {
    return this.decide(bookingId, input, noteApproveSchema, 'approved', () => null);
  }

  decline(bookingId: unknown, input: unknown): Promise<NoteDto> {
    return this.decide(bookingId, input, noteDeclineSchema, 'declined', data => data.comment);
  }

  /** Only the latest sent version can be decided, once. An identical replay repairs a lost notification. */
  private async decide<T extends { version: number }>(bookingId: unknown, input: unknown, schema: z.ZodType<T>, status: 'approved' | 'declined', comment: (data: T) => string | null): Promise<NoteDto> {
    const result = await this.mutate(bookingId, DECIDE_NOTE_POLICY, 'mentee', async (em, _booking, note) => {
      const data = parseWith(schema, input);
      const declineComment = comment(data);
      if (!note || note.version !== data.version) throw new ConflictError('This session note changed. Refresh it before deciding.');
      if (note.status !== status || (note.declineComment ?? null) !== declineComment) {
        if (note.status !== 'awaiting_approval') throw new ConflictError('This session note has already been decided or changed. Refresh it.');
        const now = this.deps.clock.now();
        note.status = status;
        note.declineComment = declineComment;
        note.decidedAt = now;
        note.updatedAt = now;
        await em.flush();
      }
      return { dto: toDto(note), bookingId: note.booking.id };
    });
    await this.deps.eventBus.emit(`notes.note.${status}`, { bookingId: result.bookingId, noteId: result.dto.id, version: result.dto.version });
    return result.dto;
  }

  /** Operators only. Selects no text columns, so a body or comment cannot reach this report. */
  async declineReport(): Promise<NoteDeclineRow[]> {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    if (!session.roles.includes('operator')) throw new ForbiddenError();
    const em = this.deps.em.fork();
    const declined = await em.find(SessionNote, { status: 'declined', booking: { status: 'confirmed' } }, { fields: ['booking'] });
    const counts = new Map<string, number>();
    for (const note of declined) counts.set(note.booking.id, (counts.get(note.booking.id) ?? 0) + 1);
    const bookings = await em.find(Booking, { id: { $in: [...counts.keys()] } }, { populate: ['mentee', 'mentorProfile.user'], orderBy: { startsAt: 'desc' }, limit: DECLINE_REPORT_PAGE });
    return bookings.map(booking => ({ bookingId: booking.id, startsAt: booking.startsAt.toISOString(), mentorName: booking.mentorProfile.user.displayName, menteeName: booking.mentee.displayName, declineCount: counts.get(booking.id)! }));
  }
}
