import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntityManager } from '@devmentor/db';
import type { Session } from '../../http/auth';
import { TooManyRequestsError } from '../../http/errors';
import { MESSAGE_PAGE, POST_ANSWER_POLICY, POST_MESSAGE_POLICY, READ_SESSION_POLICY, sessionWindow, TextSessionService } from './text-session.service';

vi.mock('@devmentor/db', () => ({ Booking: 'Booking', SessionMessage: 'SessionMessage', SessionNote: 'SessionNote', LockMode: { PESSIMISTIC_WRITE: 'write' } }));

// Loose test rows stand in for entities.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const bookingId = '11111111-1111-4111-8111-111111111111';
const start = new Date('2026-11-12T14:00:00.000Z');
const mentee = { id: 'mentee-id', email: 'mentee@example.com', displayName: 'Sam Mentee' };
const mentor = { id: 'mentor-id', email: 'mentor@example.com', displayName: 'Alex Mentor' };
let now: Date;
let session: Session | null;
let booking: Row | null;
let newestFirst: Row[];
const consumeFor = vi.fn();
const emit = vi.fn();
let approvedNotes: number;
const em = {
  findOne: vi.fn(async (_entity: string, where: Row) => (booking && where.id === booking.id && where.status === booking.status ? booking : null)),
  find: vi.fn(async (_entity: string, _where: Row, options: Row) => newestFirst.slice(0, options.limit)),
  create: vi.fn((_entity: string, values: Row): Row => ({ id: 'new-message', ...values })),
  persist: vi.fn(),
  flush: vi.fn(),
  nativeUpdate: vi.fn(async () => 1),
  count: vi.fn(async () => approvedNotes),
  fork: () => em,
  transactional: vi.fn(async (fn: (scoped: unknown) => unknown) => fn(em)),
};
const service = () => new TextSessionService({ em: em as unknown as EntityManager, session: Promise.resolve(session), clock: { now: () => now }, rateLimiter: { consumeFor }, eventBus: { emit } });
const confirmed = (length = 25): Row => ({ id: bookingId, status: 'confirmed', mentee, mentorProfile: { user: mentor }, startsAt: start, lengthMinutes: length });
const message = (id: string, author: Row, body: string, createdAt: string): Row => ({ id, author, body, createdAt: new Date(createdAt) });
const at = (offsetMs: number) => new Date(start.getTime() + offsetMs);

beforeEach(() => {
  vi.clearAllMocks();
  now = at(60_000);
  session = { userId: 'mentee-id', roles: ['mentee'] };
  booking = confirmed();
  newestFirst = [];
  consumeFor.mockResolvedValue(undefined);
  approvedNotes = 0;
});

describe('sessionWindow', () => {
  it.each([
    [-1, 'not_started'],
    [0, 'open'],
    [25 * 60_000 - 1, 'open'],
    [25 * 60_000, 'ended'],
    [25 * 60_000 + 1, 'ended'],
  ])('puts %i ms from the start in %s for a 25-minute booking', (offset, expected) => {
    expect(sessionWindow({ startsAt: start, lengthMinutes: 25 }, at(offset)).window).toBe(expected);
  });

  it('ends a 50-minute booking after fifty minutes', () => {
    const result = sessionWindow({ startsAt: start, lengthMinutes: 50 }, at(49 * 60_000));
    expect(result.window).toBe('open');
    expect(result.endsAt.toISOString()).toBe('2026-11-12T14:50:00.000Z');
  });
});

describe('access', () => {
  it.each(['read', 'post'] as const)('answers 401 to a signed-out %s', async kind => {
    session = null;
    const call = kind === 'read' ? service().getForParticipant(bookingId) : service().postMessage(bookingId, { body: 'hi' });
    await expect(call).rejects.toMatchObject({ status: 401 });
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it.each(['read', 'post'] as const)('answers 422 to a %s with an id that is not a uuid, before any lookup', async kind => {
    const call = kind === 'read' ? service().getForParticipant('nope') : service().postMessage('nope', { body: 'hi' });
    await expect(call).rejects.toMatchObject({ status: 422 });
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it.each(['read', 'post'] as const)('answers the same 404 to a stranger, an unknown booking and an unconfirmed booking on %s', async kind => {
    const attempt = () => (kind === 'read' ? service().getForParticipant(bookingId) : service().postMessage(bookingId, { body: 'hi' }));
    session = { userId: 'stranger-id', roles: ['mentee', 'mentor'] };
    const stranger = await attempt().catch((error: Error) => error);
    session = { userId: 'mentee-id', roles: ['mentee'] };
    booking = null;
    const unknown = await attempt().catch((error: Error) => error);
    booking = { ...confirmed(), status: 'pending' };
    const pending = await attempt().catch((error: Error) => error);
    for (const outcome of [stranger, unknown, pending]) expect(outcome).toMatchObject({ status: 404, message: 'Session not found' });
    expect(consumeFor).not.toHaveBeenCalled();
    expect(em.persist).not.toHaveBeenCalled();
  });

  it('decides the party per booking, not by role: the same user is mentee on one booking and mentor on another', async () => {
    const both = { id: 'both-id', displayName: 'Both Person' };
    session = { userId: 'both-id', roles: ['mentee', 'mentor'] };
    booking = { ...confirmed(), mentee: both, mentorProfile: { user: mentor } };
    expect((await service().getForParticipant(bookingId)).viewerRole).toBe('mentee');
    booking = { ...confirmed(), mentee, mentorProfile: { user: both } };
    const asMentor = await service().getForParticipant(bookingId);
    expect(asMentor.viewerRole).toBe('mentor');
    expect(asMentor.counterpartName).toBe('Sam Mentee');
  });
});

describe('getForParticipant', () => {
  it('gives each party their own view of the same session', async () => {
    newestFirst = [message('m2', mentor, 'Try a join.', '2026-11-12T14:02:00Z'), message('m1', mentee, 'Why is this slow?', '2026-11-12T14:01:00Z')];
    const asMentee = await service().getForParticipant(bookingId);
    expect(asMentee).toMatchObject({
      booking: { id: bookingId, startsAt: '2026-11-12T14:00:00.000Z', endsAt: '2026-11-12T14:25:00.000Z', lengthMinutes: 25 },
      window: 'open', serverNow: now.toISOString(), viewerRole: 'mentee', counterpartName: 'Alex Mentor', truncated: false,
    });
    expect(asMentee.messages.map(m => [m.id, m.authorRole, m.isOwn, m.authorName])).toEqual([
      ['m1', 'mentee', true, 'Sam Mentee'],
      ['m2', 'mentor', false, 'Alex Mentor'],
    ]);
    session = { userId: 'mentor-id', roles: ['mentor'] };
    const asMentor = await service().getForParticipant(bookingId);
    expect(asMentor).toMatchObject({ viewerRole: 'mentor', counterpartName: 'Sam Mentee' });
    expect(asMentor.messages.map(m => m.isOwn)).toEqual([false, true]);
  });

  it('is readable before the start and after the end, in the matching window', async () => {
    now = at(-1);
    expect((await service().getForParticipant(bookingId)).window).toBe('not_started');
    now = at(25 * 60_000);
    expect((await service().getForParticipant(bookingId)).window).toBe('ended');
  });

  it('never exposes user ids or email addresses', async () => {
    newestFirst = [message('m1', mentor, 'Hi', '2026-11-12T14:01:00Z')];
    const result = await service().getForParticipant(bookingId);
    const json = JSON.stringify(result);
    for (const leak of ['@example.com', 'mentee-id', 'mentor-id']) expect(json).not.toContain(leak);
    expect(Object.keys(result.messages[0]!).sort()).toEqual(['authorName', 'authorRole', 'body', 'createdAt', 'id', 'isOwn']);
  });

  it('returns the newest page and flags that older messages exist', async () => {
    newestFirst = Array.from({ length: MESSAGE_PAGE + 1 }, (_, i) => message(`m${MESSAGE_PAGE - i}`, mentee, `line ${MESSAGE_PAGE - i}`, '2026-11-12T14:01:00Z'));
    const result = await service().getForParticipant(bookingId);
    expect(result.truncated).toBe(true);
    expect(result.messages).toHaveLength(MESSAGE_PAGE);
    expect(result.messages[0]!.id).toBe('m1');
    expect(em.find).toHaveBeenCalledWith('SessionMessage', { booking: bookingId }, expect.objectContaining({ limit: MESSAGE_PAGE + 1 }));
  });

  it('rate limits reads per account after the party check', async () => {
    await service().getForParticipant(bookingId);
    expect(consumeFor).toHaveBeenCalledWith(READ_SESSION_POLICY, 'mentee-id');
    consumeFor.mockRejectedValue(new TooManyRequestsError(30));
    await expect(service().getForParticipant(bookingId)).rejects.toMatchObject({ status: 429 });
  });
});

describe('postMessage', () => {
  it('stores a trimmed, newline-normalised message from the caller while the window is open', async () => {
    const dto = await service().postMessage(bookingId, { body: '  first\r\nsecond\rthird  ', extra: 'dropped' });
    expect(em.create).toHaveBeenCalledWith('SessionMessage', { booking, author: mentee, body: 'first\nsecond\nthird', createdAt: now, updatedAt: now });
    expect(em.persist).toHaveBeenCalledOnce();
    expect(em.flush).toHaveBeenCalledOnce();
    expect(dto).toEqual({ id: 'new-message', authorRole: 'mentee', isOwn: true, authorName: 'Sam Mentee', body: 'first\nsecond\nthird', createdAt: now.toISOString() });
    expect(consumeFor).toHaveBeenCalledWith(POST_MESSAGE_POLICY, 'mentee-id');
  });

  it('lets the mentor post as the mentor', async () => {
    session = { userId: 'mentor-id', roles: ['mentor'] };
    expect(await service().postMessage(bookingId, { body: 'Here.' })).toMatchObject({ authorRole: 'mentor', authorName: 'Alex Mentor', isOwn: true });
  });

  it('accepts a post one millisecond before the end and refuses one at the end', async () => {
    now = at(25 * 60_000 - 1);
    await expect(service().postMessage(bookingId, { body: 'last' })).resolves.toMatchObject({ body: 'last' });
    now = at(25 * 60_000);
    await expect(service().postMessage(bookingId, { body: 'late' })).rejects.toMatchObject({ status: 409, message: 'This session has ended.' });
    expect(em.persist).toHaveBeenCalledOnce();
  });

  it('refuses before the start and accepts exactly at the start', async () => {
    now = at(-1);
    await expect(service().postMessage(bookingId, { body: 'early' })).rejects.toMatchObject({ status: 409, message: 'This session has not started yet.' });
    now = at(0);
    await expect(service().postMessage(bookingId, { body: 'on time' })).resolves.toMatchObject({ body: 'on time' });
  });

  it('uses the booked length: a 50-minute session is still open after 30 minutes', async () => {
    booking = confirmed(50);
    now = at(30 * 60_000);
    await expect(service().postMessage(bookingId, { body: 'still here' })).resolves.toBeDefined();
  });

  it.each([
    ['empty', { body: '' }],
    ['whitespace only', { body: ' \n\t ' }],
    ['over 4,000 characters', { body: 'x'.repeat(4001) }],
    ['containing NUL', { body: 'a\u0000b' }],
    ['not a string', { body: 5 }],
    ['missing', {}],
  ])('rejects a body that is %s with field errors and stores nothing', async (_label, input) => {
    await expect(service().postMessage(bookingId, input)).rejects.toMatchObject({ status: 422, fieldErrors: { body: expect.any(Array) } });
    expect(em.persist).not.toHaveBeenCalled();
  });

  it('accepts exactly 4,000 characters', async () => {
    await expect(service().postMessage(bookingId, { body: 'x'.repeat(4000) })).resolves.toBeDefined();
  });

  it('stores text as written: markup is kept literal', async () => {
    expect(await service().postMessage(bookingId, { body: '<script>alert(1)</script>' })).toMatchObject({ body: '<script>alert(1)</script>' });
  });

  it('rate limits posts after the party check and before validation or storing', async () => {
    consumeFor.mockRejectedValue(new TooManyRequestsError(10));
    await expect(service().postMessage(bookingId, { body: '' })).rejects.toMatchObject({ status: 429 });
    expect(em.persist).not.toHaveBeenCalled();
  });
});

describe('the written answer on the read', () => {
  it('is null and not owed while the session has not ended', async () => {
    for (const offset of [-1, 0]) {
      now = at(offset);
      expect(await service().getForParticipant(bookingId)).toMatchObject({ answer: null, answerOwed: false });
    }
  });

  it('is owed once the session ended without an answer', async () => {
    now = at(25 * 60_000);
    expect(await service().getForParticipant(bookingId)).toMatchObject({ answer: null, answerOwed: true });
  });

  it('is shown to both parties, and still there weeks later', async () => {
    booking = { ...confirmed(), writtenAnswer: 'Use a union.', writtenAnswerAt: at(30 * 60_000) };
    now = at(42 * 24 * 60 * 60_000);
    const expected = { answer: { body: 'Use a union.', postedAt: '2026-11-12T14:30:00.000Z' }, answerOwed: false };
    expect(await service().getForParticipant(bookingId)).toMatchObject(expected);
    session = { userId: 'mentor-id', roles: ['mentor'] };
    expect(await service().getForParticipant(bookingId)).toMatchObject(expected);
  });
});

it('tells the reader whether an approved note froze the answer', async () => {
  expect(await service().getForParticipant(bookingId)).toMatchObject({ answerFrozen: false });
  approvedNotes = 2;
  expect(await service().getForParticipant(bookingId)).toMatchObject({ answerFrozen: true });
});

describe('postAnswer', () => {
  beforeEach(() => {
    session = { userId: 'mentor-id', roles: ['mentor'] };
  });

  it.each([['open', 60_000], ['ended', 25 * 60_000], ['long ended', 30 * 24 * 60 * 60_000]])("saves the mentor's answer when the session is %s and tells the bus", async (_label, offset) => {
    now = at(offset);
    const dto = await service().postAnswer(bookingId, { body: '  Use a union.\r\nNarrow on ok.  ', extra: 1 });
    expect(dto).toEqual({ body: 'Use a union.\nNarrow on ok.', postedAt: now.toISOString() });
    expect(em.nativeUpdate).toHaveBeenCalledWith('Booking', { id: bookingId }, { writtenAnswer: 'Use a union.\nNarrow on ok.', writtenAnswerAt: now, updatedAt: now });
    expect(emit).toHaveBeenCalledWith('sessions.answer.posted', { bookingId });
    expect(consumeFor).toHaveBeenCalledWith(POST_ANSWER_POLICY, 'mentor-id');
  });

  it('replaces an earlier answer and emits again', async () => {
    booking = { ...confirmed(), writtenAnswer: 'First draft.', writtenAnswerAt: at(60_000) };
    now = at(26 * 60_000);
    await expect(service().postAnswer(bookingId, { body: 'Corrected.' })).resolves.toEqual({ body: 'Corrected.', postedAt: now.toISOString() });
    expect(emit).toHaveBeenCalledOnce();
  });

  it('refuses before the start with 409 and accepts exactly at the start', async () => {
    now = at(-1);
    await expect(service().postAnswer(bookingId, { body: 'early' })).rejects.toMatchObject({ status: 409, message: 'You can post the written answer when the session starts.' });
    expect(em.nativeUpdate).not.toHaveBeenCalled();
    now = at(0);
    await expect(service().postAnswer(bookingId, { body: 'on time' })).resolves.toMatchObject({ body: 'on time' });
  });

  it("refuses the booking's mentee with 403 before the rate limit or any write", async () => {
    session = { userId: 'mentee-id', roles: ['mentee', 'mentor'] };
    await expect(service().postAnswer(bookingId, { body: 'mine' })).rejects.toMatchObject({ status: 403, message: 'Only the mentor can post the written answer.' });
    expect(consumeFor).not.toHaveBeenCalled();
    expect(em.nativeUpdate).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('answers 404 to the mentor of a different session, an unknown and an unconfirmed booking', async () => {
    session = { userId: 'other-mentor-id', roles: ['mentor'] };
    await expect(service().postAnswer(bookingId, { body: 'x' })).rejects.toMatchObject({ status: 404 });
    session = { userId: 'mentor-id', roles: ['mentor'] };
    booking = { ...confirmed(), status: 'cancelled' };
    await expect(service().postAnswer(bookingId, { body: 'x' })).rejects.toMatchObject({ status: 404 });
    booking = null;
    await expect(service().postAnswer(bookingId, { body: 'x' })).rejects.toMatchObject({ status: 404 });
    expect(em.nativeUpdate).not.toHaveBeenCalled();
  });

  it('answers 404 and emits nothing when the booking stopped being confirmed before the write', async () => {
    em.findOne.mockResolvedValueOnce(booking).mockResolvedValueOnce(null);
    await expect(service().postAnswer(bookingId, { body: 'x' })).rejects.toMatchObject({ status: 404, message: 'Session not found' });
    expect(em.nativeUpdate).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('checks for an approved note under the booking lock and refuses to replace a frozen answer', async () => {
    booking = { ...confirmed(), writtenAnswer: 'Final.', writtenAnswerAt: at(60_000) };
    approvedNotes = 1;
    await expect(service().postAnswer(bookingId, { body: 'Changed.' })).rejects.toMatchObject({ status: 409, message: 'The session note was approved, so the written answer is final.' });
    expect(em.findOne).toHaveBeenLastCalledWith('Booking', { id: bookingId, status: 'confirmed' }, { lockMode: 'write', refresh: true });
    expect(em.count).toHaveBeenCalledWith('SessionNote', { booking: bookingId, status: 'approved' });
    expect(em.nativeUpdate).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('answers 401 when signed out and 422 for a malformed id', async () => {
    session = null;
    await expect(service().postAnswer(bookingId, { body: 'x' })).rejects.toMatchObject({ status: 401 });
    session = { userId: 'mentor-id', roles: ['mentor'] };
    await expect(service().postAnswer('nope', { body: 'x' })).rejects.toMatchObject({ status: 422 });
  });

  it.each([
    ['empty', { body: '' }],
    ['over 20,000 characters', { body: 'x'.repeat(20001) }],
    ['containing NUL', { body: 'a\u0000b' }],
  ])('rejects a body that is %s and writes nothing', async (_label, input) => {
    await expect(service().postAnswer(bookingId, input)).rejects.toMatchObject({ status: 422, fieldErrors: { body: expect.any(Array) } });
    expect(em.nativeUpdate).not.toHaveBeenCalled();
  });

  it('rate limits saves before validation or writing', async () => {
    consumeFor.mockRejectedValue(new TooManyRequestsError(10));
    await expect(service().postAnswer(bookingId, { body: '' })).rejects.toMatchObject({ status: 429 });
    expect(em.nativeUpdate).not.toHaveBeenCalled();
  });
});
