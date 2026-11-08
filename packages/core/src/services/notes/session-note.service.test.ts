import { beforeEach, expect, it, vi } from 'vitest';
import type { EntityManager, IBooking, ISessionNote } from '@devmentor/db';
import type { Session } from '../../http/auth';
import { DECIDE_NOTE_POLICY, READ_NOTE_POLICY, SAVE_NOTE_POLICY, SEND_NOTE_POLICY, SessionNoteService } from './session-note.service';

vi.mock('@devmentor/db', () => ({ Booking: 'Booking', SessionNote: 'SessionNote', LockMode: { PESSIMISTIC_WRITE: 'write' } }));
const id = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-11-07T15:00:00Z');
let booking: IBooking | null;
let note: ISessionNote | null;
let session: Session | null;
const emit = vi.fn();
const consumeFor = vi.fn();
const em = {
  fork: () => em,
  transactional: vi.fn(async (fn: (em: unknown) => unknown) => fn(em)),
  findOne: vi.fn(async (entity: string) => entity === 'Booking' ? booking : note),
  find: vi.fn(async (entity: string): Promise<unknown[]> => entity === 'Booking' ? (booking ? [booking] : []) : note ? [note] : []),
  populate: vi.fn(),
  persist: vi.fn(),
  create: vi.fn((_entity: string, values: object) => ({ id: 'note-id', ...values })),
  flush: vi.fn(),
};
const service = () => new SessionNoteService({ em: em as unknown as EntityManager, session: Promise.resolve(session), clock: { now: () => now }, rateLimiter: { consumeFor }, eventBus: { emit } });
const saved = (values: Partial<ISessionNote> = {}) => ({ id: 'note-id', booking, version: 1, revision: 1, body: 'private', status: 'draft', declineComment: null, sentAt: null, decidedAt: null, createdAt: now, updatedAt: now, ...values }) as ISessionNote;
const attempt = (kind: string, bookingId: string = id) => kind === 'read' ? service().getForParticipant(bookingId) : kind === 'save' ? service().saveDraft(bookingId, { body: 'edited', expectedRevision: null }) : service().send(bookingId, { version: 1, revision: 1 });
beforeEach(() => {
  vi.clearAllMocks();
  booking = { id, status: 'confirmed', writtenAnswerAt: now, mentee: { id: 'mentee' }, mentorProfile: { user: { id: 'mentor' } } } as IBooking;
  note = null;
  session = { userId: 'mentor', roles: ['mentor'] };
  consumeFor.mockResolvedValue(undefined);
  em.flush.mockResolvedValue(undefined);
});

it.each(['read', 'save', 'send'])('authenticates and validates ids on %s', async kind => {
  session = null;
  await expect(attempt(kind)).rejects.toMatchObject({ status: 401 });
  session = { userId: 'mentor', roles: ['mentor'] };
  await expect(attempt(kind, 'invalid')).rejects.toMatchObject({ status: 422 });
  expect(em.findOne).not.toHaveBeenCalled();
});
it.each(['read', 'save', 'send'])('gives outsiders and missing/unconfirmed bookings identical 404 on %s before limits', async kind => {
  session = { userId: 'stranger', roles: ['operator', 'mentor', 'mentee'] };
  await expect(attempt(kind)).rejects.toMatchObject({ status: 404 });
  session = { userId: 'mentor', roles: ['mentor'] };
  booking!.status = 'cancelled';
  await expect(attempt(kind)).rejects.toMatchObject({ status: 404 });
  booking = null;
  await expect(attempt(kind)).rejects.toMatchObject({ status: 404 });
  expect(consumeFor).not.toHaveBeenCalled();
});
it('lets the mentee read a draft without exposing relations, but refuses both mutations', async () => {
  note = saved();
  session = { userId: 'mentee', roles: ['mentor', 'mentee'] };
  const view = await service().getForParticipant(id);
  expect(view).toEqual({ current: { id: 'note-id', version: 1, revision: 1, body: 'private', status: 'draft', declineComment: null, sentAt: null, decidedAt: null, updatedAt: now.toISOString(), private: true }, history: [] });
  expect(consumeFor).toHaveBeenCalledWith(READ_NOTE_POLICY, 'mentee');
  await expect(attempt('save')).rejects.toMatchObject({ status: 403 });
  await expect(attempt('send')).rejects.toMatchObject({ status: 403 });
  expect(em.flush).not.toHaveBeenCalled();
});
it('reads empty or dated note DTOs, without using timestamps as revisions', async () => {
  expect(await service().getForParticipant(id)).toEqual({ current: null, history: [] });
  note = saved({ status: 'declined', sentAt: now, decidedAt: now, declineComment: 'context' });
  expect((await service().getForParticipant(id)).current).toMatchObject({ sentAt: now.toISOString(), decidedAt: now.toISOString(), declineComment: 'context' });
});
it.each(['save', 'send'])('requires the written answer for %s and propagates the account limit', async kind => {
  booking!.writtenAnswerAt = null;
  await expect(attempt(kind)).rejects.toMatchObject({ status: 409 });
  expect(consumeFor).toHaveBeenCalledWith(kind === 'save' ? SAVE_NOTE_POLICY : SEND_NOTE_POLICY, 'mentor');
  booking!.writtenAnswerAt = now;
  consumeFor.mockRejectedValueOnce(new Error('rate limit'));
  await expect(attempt(kind)).rejects.toThrow('rate limit');
});
it('authorizes and limits before the transaction, then locks booking before current parties and note', async () => {
  expect(await attempt('save')).toMatchObject({ version: 1, revision: 1, body: 'edited', status: 'draft' });
  expect(em.findOne.mock.calls[0]).toEqual(['Booking', { id }]);
  expect(consumeFor.mock.invocationCallOrder[0]).toBeLessThan(em.transactional.mock.invocationCallOrder[0]!);
  expect(em.populate.mock.invocationCallOrder[0]).toBeLessThan(consumeFor.mock.invocationCallOrder[0]!);
  expect(em.findOne.mock.calls[1]).toEqual(['Booking', { id }, { lockMode: 'write', refresh: true }]);
  expect(em.findOne.mock.invocationCallOrder[0]).toBeLessThan(em.populate.mock.invocationCallOrder[0]!);
  expect(em.findOne.mock.invocationCallOrder[1]).toBeLessThan(em.populate.mock.invocationCallOrder[1]!);
  expect(em.populate.mock.invocationCallOrder[1]).toBeLessThan(em.findOne.mock.invocationCallOrder[2]!);
  expect(em.findOne.mock.calls[2]).toEqual(['SessionNote', { booking: id }, { orderBy: { version: 'desc' }, refresh: true, lockMode: 'write' }]);
  expect(em.persist).toHaveBeenCalledOnce();
  note = saved();
  expect(await service().saveDraft(id, { body: '  changed\r\ntext ', expectedRevision: 1 })).toMatchObject({ body: 'changed\ntext', revision: 2, version: 1 });
  expect(emit).not.toHaveBeenCalled();
});
it.each(['save', 'send'])('rechecks a distinct cancelled booking after preauthorization on %s', async kind => {
  const cancelled = { ...booking!, status: 'cancelled' } as IBooking;
  em.findOne.mockResolvedValueOnce(booking).mockResolvedValueOnce(cancelled);
  await expect(attempt(kind)).rejects.toMatchObject({ status: 404 });
  expect(booking!.status).toBe('confirmed');
  expect(consumeFor).toHaveBeenCalledOnce();
  expect(em.findOne).toHaveBeenCalledTimes(2);
  expect(em.flush).not.toHaveBeenCalled();
  expect(emit).not.toHaveBeenCalled();
});
it('does not start a booking transaction when the limiter refuses the attempt', async () => {
  consumeFor.mockRejectedValueOnce(new Error('limited'));
  await expect(attempt('save')).rejects.toThrow('limited');
  expect(em.transactional).not.toHaveBeenCalled();
});
it('rejects create-only overwrites, missing and stale revisions, invalid inputs and writes to a sent note', async () => {
  await expect(service().saveDraft(id, { body: 'x', expectedRevision: 1 })).rejects.toMatchObject({ status: 409 });
  await expect(service().saveDraft(id, { body: ' ', expectedRevision: null })).rejects.toMatchObject({ status: 422 });
  note = saved();
  for (const expectedRevision of [null, 2]) await expect(service().saveDraft(id, { body: 'x', expectedRevision })).rejects.toMatchObject({ status: 409 });
  note.status = 'awaiting_approval';
  await expect(service().saveDraft(id, { body: 'x', expectedRevision: 1 })).rejects.toMatchObject({ status: 409 });
  expect(em.flush).not.toHaveBeenCalled();
});
it('sends exactly the saved body after commit and replays the same submission without changing its dates/revision', async () => {
  note = saved();
  const first = await service().send(id, { version: 1, revision: 1, body: 'never sent' });
  expect(first).toMatchObject({ body: 'private', status: 'awaiting_approval', revision: 1, sentAt: now.toISOString() });
  expect(em.flush.mock.invocationCallOrder[0]).toBeLessThan(emit.mock.invocationCallOrder[0]!);
  expect(emit).toHaveBeenCalledWith('notes.note.sent', { bookingId: id, noteId: 'note-id', version: 1 });
  expect(await service().send(id, { version: 1, revision: 1 })).toEqual(first);
  expect(em.flush).toHaveBeenCalledTimes(1);
  expect(emit).toHaveBeenCalledTimes(2);
});
it('refuses absent, different versions/revisions or decided notes without an event', async () => {
  await expect(service().send(id, { version: 1, revision: 1 })).rejects.toMatchObject({ status: 409 });
  note = saved();
  await expect(service().send(id, { version: 2, revision: 1 })).rejects.toMatchObject({ status: 409 });
  await expect(service().send(id, { version: 1, revision: 2 })).rejects.toMatchObject({ status: 409 });
  for (const status of ['approved', 'declined']) {
    note.status = status;
    await expect(service().send(id, { version: 1, revision: 1 })).rejects.toMatchObject({ status: 409 });
  }
  expect(emit).not.toHaveBeenCalled();
});
it('does not emit after a failed flush, and surfaces read failures without leaking text', async () => {
  note = saved();
  em.flush.mockRejectedValueOnce(new Error('database down'));
  await expect(service().send(id, { version: 1, revision: 1 })).rejects.toThrow('database down');
  expect(emit).not.toHaveBeenCalled();
  consumeFor.mockRejectedValueOnce(new Error('reads limited'));
  await expect(service().getForParticipant(id)).rejects.toThrow('reads limited');
});

const asMentee = () => { session = { userId: 'mentee', roles: ['mentee'] }; };
const sent = (values: Partial<ISessionNote> = {}) => saved({ status: 'awaiting_approval', sentAt: now, ...values });
const later = new Date('2026-11-08T10:00:00Z');
const decided = (status: string, comment: string | null) => saved({ status, sentAt: now, decidedAt: later, updatedAt: later, declineComment: comment });

it('returns older versions, newest first, as history', async () => {
  const older = decided('declined', 'add context');
  const newest = saved({ id: 'second', version: 2 });
  em.find.mockResolvedValueOnce([newest, older]);
  const view = await service().getForParticipant(id);
  expect(view.current).toMatchObject({ id: 'second', version: 2 });
  expect(view.history).toEqual([expect.objectContaining({ version: 1, status: 'declined', declineComment: 'add context' })]);
  expect(em.find.mock.calls[0]).toEqual(['SessionNote', { booking: id }, { orderBy: { version: 'desc' }, refresh: true }]);
});

it('approves the exact sent version after commit, emitting identifiers only', async () => {
  note = sent(); asMentee();
  const result = await service().approve(id, { version: 1 });
  expect(result).toMatchObject({ status: 'approved', decidedAt: now.toISOString(), declineComment: null, private: true });
  expect(consumeFor).toHaveBeenCalledWith(DECIDE_NOTE_POLICY, 'mentee');
  expect(em.flush.mock.invocationCallOrder[0]).toBeLessThan(emit.mock.invocationCallOrder[0]!);
  expect(emit).toHaveBeenCalledExactlyOnceWith('notes.note.approved', { bookingId: id, noteId: 'note-id', version: 1 });
});

it('declines with a normalized comment and never reads as approved', async () => {
  note = sent(); asMentee();
  const result = await service().decline(id, { version: 1, comment: ' add\r\ncontext ' });
  expect(result).toMatchObject({ status: 'declined', declineComment: 'add\ncontext', decidedAt: now.toISOString() });
  expect(emit).toHaveBeenCalledExactlyOnceWith('notes.note.declined', { bookingId: id, noteId: 'note-id', version: 1 });
  expect(JSON.stringify(emit.mock.calls)).not.toContain('context');
});

it('refuses a decline without a comment as a field error and changes nothing', async () => {
  note = sent(); asMentee();
  await expect(service().decline(id, { version: 1, comment: '  ' })).rejects.toMatchObject({ status: 422, fieldErrors: { comment: expect.any(Array) } });
  expect(note.status).toBe('awaiting_approval');
  expect(emit).not.toHaveBeenCalled();
});

it('does not let the mentor decide, and hides the decision from outsiders', async () => {
  note = sent();
  await expect(service().approve(id, { version: 1 })).rejects.toMatchObject({ status: 403 });
  await expect(service().decline(id, { version: 1, comment: 'x' })).rejects.toMatchObject({ status: 403 });
  session = { userId: 'stranger', roles: ['operator'] };
  await expect(service().approve(id, { version: 1 })).rejects.toMatchObject({ status: 404 });
  expect(note.status).toBe('awaiting_approval');
  expect(consumeFor).not.toHaveBeenCalled();
});

it('replays an identical decision without changing dates so a lost notification can be repaired', async () => {
  asMentee();
  note = decided('approved', null);
  expect(await service().approve(id, { version: 1 })).toMatchObject({ decidedAt: later.toISOString() });
  note = decided('declined', 'same');
  expect(await service().decline(id, { version: 1, comment: 'same' })).toMatchObject({ decidedAt: later.toISOString(), declineComment: 'same' });
  expect(em.flush).not.toHaveBeenCalled();
  expect(emit).toHaveBeenCalledTimes(2);
});

it('refuses decisions on a draft, a stale or missing version, a conflicting decision or a changed comment', async () => {
  asMentee();
  await expect(service().approve(id, { version: 1 })).rejects.toMatchObject({ status: 409 });
  note = saved();
  await expect(service().approve(id, { version: 1 })).rejects.toMatchObject({ status: 409 });
  note = sent({ version: 2 });
  await expect(service().approve(id, { version: 1 })).rejects.toMatchObject({ status: 409 });
  note = decided('approved', null);
  await expect(service().decline(id, { version: 1, comment: 'x' })).rejects.toMatchObject({ status: 409 });
  note = decided('declined', 'x');
  await expect(service().approve(id, { version: 1 })).rejects.toMatchObject({ status: 409 });
  await expect(service().decline(id, { version: 1, comment: 'different' })).rejects.toMatchObject({ status: 409 });
  expect(em.flush).not.toHaveBeenCalled();
  expect(emit).not.toHaveBeenCalled();
});

it('starts a redraft as the next version and leaves the declined version untouched', async () => {
  note = decided('declined', 'add context');
  const declined = note;
  expect(await service().saveDraft(id, { body: 'second try', expectedRevision: 1, expectedVersion: 1 })).toMatchObject({ version: 2, revision: 1, status: 'draft', body: 'second try', declineComment: null });
  expect(declined).toMatchObject({ version: 1, status: 'declined', body: 'private', declineComment: 'add context' });
  expect(em.persist).toHaveBeenCalledOnce();
});

it('refuses a redraft from a stale editor and a second tab overwriting the new version', async () => {
  note = decided('declined', 'add context');
  for (const stale of [{ expectedRevision: 1 }, { expectedRevision: 1, expectedVersion: null }, { expectedRevision: 2, expectedVersion: 1 }, { expectedRevision: 1, expectedVersion: 2 }]) {
    await expect(service().saveDraft(id, { body: 'x', ...stale })).rejects.toMatchObject({ status: 409 });
  }
  note = saved({ version: 2 });
  await expect(service().saveDraft(id, { body: 'x', expectedRevision: 1, expectedVersion: 1 })).rejects.toMatchObject({ status: 409 });
  expect(await service().saveDraft(id, { body: 'edited', expectedRevision: 1, expectedVersion: 2 })).toMatchObject({ version: 2, revision: 2 });
  note = decided('approved', null);
  await expect(service().saveDraft(id, { body: 'x', expectedRevision: 1, expectedVersion: 1 })).rejects.toMatchObject({ status: 409 });
});

it('reports declined-version counts to operators only, with no text', async () => {
  session = null;
  await expect(service().declineReport()).rejects.toMatchObject({ status: 401 });
  session = { userId: 'mentor', roles: ['mentor', 'mentee'] };
  await expect(service().declineReport()).rejects.toMatchObject({ status: 403 });
  session = { userId: 'op', roles: ['operator'] };
  booking = { ...booking!, startsAt: now, mentee: { displayName: 'Sam' }, mentorProfile: { user: { displayName: 'Alex' } } } as unknown as IBooking;
  note = null;
  expect(await service().declineReport()).toEqual([]);
  em.find.mockClear();
  em.find.mockResolvedValueOnce([{ booking: { id } }, { booking: { id } }]);
  const report = await service().declineReport();
  expect(report).toEqual([{ bookingId: id, startsAt: now.toISOString(), mentorName: 'Alex', menteeName: 'Sam', declineCount: 2 }]);
  expect(em.find.mock.calls[0]).toEqual(['SessionNote', { status: 'declined', booking: { status: 'confirmed' } }, { fields: ['booking'] }]);
  expect((em.find.mock.calls[1] as unknown[])[2]).toMatchObject({ limit: 100, orderBy: { startsAt: 'desc' } });
});
