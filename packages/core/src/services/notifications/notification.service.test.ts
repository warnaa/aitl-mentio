import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntityManager } from '@devmentor/db';
import type { Session } from '../../http/auth';
import { NotificationService } from './notification.service';

const { UniqueError } = vi.hoisted(() => ({ UniqueError: class extends Error {} }));
vi.mock('@devmentor/db', () => ({ Booking: 'Booking', SessionNote: 'SessionNote', Notification: 'Notification', User: 'User', UniqueConstraintViolationException: UniqueError }));

type Row = Record<string, unknown> & { id: string };
const now = new Date('2026-11-06T12:00:00Z');
const bookingId = '11111111-1111-4111-8111-111111111111';
const menteeUser = { id: 'mentee', email: 'mentee@example.com', displayName: 'Sam Mentee' };
const mentorUser = { id: 'mentor', email: 'mentor@example.com', displayName: 'Alex Mentor' };
let session: Session | null;
let booking: Row | null;
let note: Row | null;
let notifications: Row[];
let insertError: Error | null;
const send = vi.fn();
const warn = vi.fn();
const nativeUpdate = vi.fn();
const matches = (row: Row, where: Record<string, unknown>) =>
  Object.entries(where).every(([key, value]) => typeof value === 'object' && value && '$in' in value ? (value.$in as unknown[]).includes(row[key]) : row[key] === value);
const em = {
  fork: () => em,
  findOne: vi.fn(async (entity: string, where: Record<string, unknown>) => entity === 'Booking' ? booking : entity === 'SessionNote' ? (note && matches(note, where) ? note : null) : notifications.find(row => matches(row, where)) ?? null),
  find: vi.fn(async (_entity: string, where: Record<string, unknown>) => notifications.filter(row => matches(row, where))),
  count: vi.fn(async (_entity: string, where: Record<string, unknown>) => notifications.filter(row => matches(row, where)).length),
  create: vi.fn((_entity: string, values: Record<string, unknown>): Row => ({ id: `n${notifications.length + 1}`, ...values })),
  getReference: (_entity: string, id: string) => id,
  persist: vi.fn((row: Row) => { notifications.push({ ...row, user: row.user as string, booking: row.booking as string }); }),
  flush: vi.fn(async () => { if (insertError) { notifications.pop(); throw insertError; } }),
  nativeUpdate,
};
const service = () => new NotificationService({
  em: em as unknown as EntityManager, session: Promise.resolve(session), clock: { now: () => now },
  env: { APP_URL: 'https://devmentor.example' }, mailer: { send }, logger: { warn },
});
const confirmed = (): Row => ({
  id: bookingId, status: 'confirmed', mentee: menteeUser, mentorProfile: { user: mentorUser },
  startsAt: new Date('2026-11-12T14:00:00Z'), lengthMinutes: 25,
});

beforeEach(() => {
  vi.clearAllMocks();
  session = { userId: 'mentee', roles: ['mentee'] };
  booking = confirmed();
  note = null;
  notifications = [];
  insertError = null;
  send.mockResolvedValue(undefined);
  nativeUpdate.mockImplementation(async (_entity: string, where: Record<string, unknown>, values: Record<string, unknown>) => {
    const rows = notifications.filter(row => matches(row, where));
    rows.forEach(row => Object.assign(row, values));
    return rows.length;
  });
});

it('notifies both participants once and emails each with the other party only', async () => {
  await service().onBookingConfirmed(bookingId);
  expect(notifications.map(row => [row.user, row.kind, row.booking, row.readAt, row.emailSentAt?.valueOf?.()])).toEqual([
    ['mentee', 'booking_confirmed', bookingId, null, now.valueOf()],
    ['mentor', 'booking_confirmed', bookingId, null, now.valueOf()],
  ]);
  expect(send).toHaveBeenCalledTimes(2);
  const [toMentee, toMentor] = send.mock.calls.map(([message]) => message);
  expect(toMentee).toMatchObject({ to: 'mentee@example.com' });
  expect(toMentee.text).toContain('Mentor: Alex Mentor');
  expect(toMentee.text).toContain('https://devmentor.example/home');
  expect(toMentor).toMatchObject({ to: 'mentor@example.com' });
  expect(toMentor.text).toContain('Mentee: Sam Mentee');
  expect(toMentor.text).toContain('https://devmentor.example/mentor');
  expect(toMentee.text + toMentor.text).not.toContain('mentee@example.com');
  expect(toMentee.text + toMentor.text).not.toContain('mentor@example.com');
});

it('creates nothing and sends nothing for a pending, expired, cancelled or missing booking', async () => {
  for (const status of ['pending', 'expired', 'cancelled']) {
    booking = { ...confirmed(), status };
    await service().onBookingConfirmed(bookingId);
  }
  booking = null;
  await service().onBookingConfirmed(bookingId);
  expect(notifications).toEqual([]);
  expect(send).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledTimes(4);
  expect(warn).toHaveBeenCalledWith({ bookingId }, 'notifications.booking_not_confirmed');
});

it('is idempotent: a replay adds no rows and no emails', async () => {
  await service().onBookingConfirmed(bookingId);
  await service().onBookingConfirmed(bookingId);
  expect(notifications).toHaveLength(2);
  expect(send).toHaveBeenCalledTimes(2);
});

it('keeps the in-product row when email fails, mails the other party, and retries the failed one on replay', async () => {
  send.mockRejectedValueOnce(new Error('provider down'));
  await service().onBookingConfirmed(bookingId);
  expect(notifications).toHaveLength(2);
  expect(notifications[0]!.emailSentAt).toBeNull();
  expect(notifications[1]!.emailSentAt).toEqual(now);
  expect(warn).toHaveBeenCalledWith({ err: expect.any(Error), notificationId: 'n1' }, 'notifications.email_failed');
  await service().onBookingConfirmed(bookingId);
  expect(notifications[0]!.emailSentAt).toEqual(now);
  expect(send).toHaveBeenCalledTimes(3);
});

it('lets a concurrent consumer that inserted first own the email, and surfaces other write failures', async () => {
  insertError = new UniqueError('duplicate');
  await service().onBookingConfirmed(bookingId);
  expect(send).not.toHaveBeenCalled();
  insertError = new Error('database down');
  await expect(service().onBookingConfirmed(bookingId)).rejects.toThrow('database down');
});

const stored = (user: string, id: string, readAt: Date | null = null): Row => ({
  id, user, kind: 'booking_confirmed', readAt, createdAt: now, booking: confirmed(),
});

it('lists only the caller notifications with the right audience, counterpart and unread count', async () => {
  notifications = [stored('mentee', 'a'), stored('mentor', 'b'), stored('mentee', 'c', new Date('2026-11-06T13:00:00Z'))];
  const mentee = await service().listMine();
  expect(mentee.unreadCount).toBe(1);
  expect(mentee.items.map(item => item.id)).toEqual(['a', 'c']);
  expect(mentee.items[0]).toEqual({
    id: 'a', kind: 'booking_confirmed', audience: 'mentee', counterpartName: 'Alex Mentor',
    startsAt: '2026-11-12T14:00:00.000Z', lengthMinutes: 25, readAt: null, createdAt: now.toISOString(), sessionPath: `/sessions/${bookingId}`,
  });
  expect(mentee.items[1]!.readAt).toBe('2026-11-06T13:00:00.000Z');
  session = { userId: 'mentor', roles: ['mentor'] };
  const mentor = await service().listMine();
  expect(mentor.items).toEqual([expect.objectContaining({ id: 'b', audience: 'mentor', counterpartName: 'Sam Mentee' })]);
  session = { userId: 'other', roles: ['mentee'] };
  expect(await service().listMine()).toEqual({ unreadCount: 0, items: [] });
});

it('marks only the caller own unread notifications and ignores foreign ids', async () => {
  notifications = [stored('mentee', '22222222-2222-4222-8222-222222222222'), stored('mentor', '33333333-3333-4333-8333-333333333333')];
  expect(await service().markRead({ ids: ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'], userId: 'mentor' })).toEqual({ updated: 1 });
  expect(notifications[0]!.readAt).toEqual(now);
  expect(notifications[1]!.readAt).toBeNull();
  expect(await service().markRead({ ids: ['22222222-2222-4222-8222-222222222222'] })).toEqual({ updated: 0 });
});

it('rejects signed-out callers and invalid bounds before touching data', async () => {
  session = null;
  await expect(service().listMine()).rejects.toMatchObject({ status: 401 });
  await expect(service().markRead({ ids: [bookingId] })).rejects.toMatchObject({ status: 401 });
  session = { userId: 'mentee', roles: ['mentee'] };
  for (const bad of [{}, { ids: [] }, { ids: ['nope'] }, { ids: Array.from({ length: 51 }, () => bookingId) }]) {
    await expect(service().markRead(bad)).rejects.toMatchObject({ status: 422 });
  }
  expect(nativeUpdate).not.toHaveBeenCalled();
});

describe('onAnswerPosted', () => {
  const answered = (): Row => ({ ...confirmed(), writtenAnswer: 'Use a union.', writtenAnswerAt: now });
  beforeEach(() => {
    booking = answered();
  });

  it('tells only the mentee, once, in the product and by email without the answer', async () => {
    await service().onAnswerPosted(bookingId);
    expect(notifications.map(row => [row.user, row.kind, row.booking, row.readAt, (row.emailSentAt as Date | null)?.valueOf()])).toEqual([
      ['mentee', 'answer_posted', bookingId, null, now.valueOf()],
    ]);
    expect(send).toHaveBeenCalledOnce();
    const [mail] = send.mock.calls[0]!;
    expect(mail).toMatchObject({ to: 'mentee@example.com', subject: 'Your DevMentor written answer is ready' });
    expect(mail.text).toContain('Alex Mentor posted the written answer');
    expect(mail.text).toContain(`https://devmentor.example/sessions/${bookingId}`);
    expect(mail.text).not.toContain('Use a union.');
  });

  it('writes one row and sends one email however often the answer is saved', async () => {
    await service().onAnswerPosted(bookingId);
    await service().onAnswerPosted(bookingId);
    await service().onAnswerPosted(bookingId);
    expect(notifications).toHaveLength(1);
    expect(send).toHaveBeenCalledOnce();
  });

  it('sends nothing when a concurrent event already claimed the email', async () => {
    nativeUpdate.mockResolvedValueOnce(0);
    await service().onAnswerPosted(bookingId);
    expect(notifications).toHaveLength(1);
    expect(send).not.toHaveBeenCalled();
  });

  it('releases the claim when the email fails, without logging the address, so the next save retries it', async () => {
    send.mockRejectedValueOnce(new Error('provider down'));
    await service().onAnswerPosted(bookingId);
    expect(notifications[0]!.emailSentAt).toBeNull();
    expect(warn).toHaveBeenCalledWith({ err: expect.any(Error), notificationId: notifications[0]!.id }, 'notifications.email_failed');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('mentee@example.com');
    await service().onAnswerPosted(bookingId);
    expect(send).toHaveBeenCalledTimes(2);
    expect(notifications[0]!.emailSentAt).toEqual(now);
    expect(notifications).toHaveLength(1);
  });

  it.each([
    ['missing', () => null],
    ['not confirmed', () => ({ ...answered(), status: 'cancelled' })],
    ['without an answer', () => ({ ...confirmed(), writtenAnswer: null })],
  ])('writes and sends nothing for a booking that is %s', async (_label, make) => {
    booking = make();
    await service().onAnswerPosted(bookingId);
    expect(notifications).toEqual([]);
    expect(send).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith({ bookingId }, 'notifications.answer_not_posted');
  });

  it('lists the answer notification for the mentee with its kind and session link', async () => {
    await service().onAnswerPosted(bookingId);
    notifications[0]!.createdAt = now;
    notifications[0]!.booking = booking!;
    expect((await service().listMine()).items[0]).toMatchObject({ kind: 'answer_posted', audience: 'mentee', counterpartName: 'Alex Mentor', sessionPath: `/sessions/${bookingId}` });
  });
});


it('records only a persisted sent note for the mentee, with replay preserving readAt and no email', async () => {
  const payload = { bookingId, noteId: 'note1', version: 1 };
  await service().onNoteSent(payload);
  note = { id: 'note1', booking: bookingId, version: 1, status: 'draft' };
  await service().onNoteSent(payload);
  expect(notifications).toEqual([]);
  note.status = 'awaiting_approval';
  const existingBooking = booking;
  booking = null;
  await service().onNoteSent(payload);
  expect(notifications).toEqual([]);
  booking = existingBooking;
  await service().onNoteSent({ ...payload, version: 2 });
  expect(notifications).toEqual([]);
  await service().onNoteSent(payload);
  expect(notifications).toHaveLength(1);
  expect(notifications[0]).toMatchObject({ user: 'mentee', booking: bookingId, kind: 'note_awaiting_approval', emailSentAt: null });
  notifications[0]!.readAt = now;
  await service().onNoteSent(payload);
  expect(notifications).toHaveLength(1);
  expect(notifications[0]!.readAt).toEqual(now);
  expect(send).not.toHaveBeenCalled();
  expect(nativeUpdate).not.toHaveBeenCalled();
});
