import { beforeEach, expect, it, vi } from 'vitest';
import type { EntityManager } from '@devmentor/db';
import type { Session } from '../../http/auth';
import { BookingService } from './booking.service';
import { MINUTE_MS } from './occupancy';

vi.mock('@devmentor/db', () => ({ Booking: 'Booking', Slot: 'Slot', MentorProfile: 'Profile', User: 'User', LockMode: { PESSIMISTIC_WRITE: 'write' } }));
const now = new Date('2026-11-05T12:00:00Z');
const slotId = '11111111-1111-4111-8111-111111111111';
const settings = { currency: 'PLN' as const, priceBounds: { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } } };
let session: Session | null;
let profile: { id: string; price25Cents: number; price50Cents: number; publishedAt: Date | null; bio: string; stackTags: string[]; publicWorkUrl: string };
let slot: { id: string; mentorProfile: { id: string }; startsAt: Date };
const findOne = vi.fn();
const nativeUpdate = vi.fn();
const persist = vi.fn();
const flush = vi.fn();
const clock = { now: vi.fn(() => now) };
const em = { findOne, nativeUpdate, persist, flush, create: vi.fn((_entity, values) => ({ id: 'booking', ...values })), getReference: vi.fn((_entity, id) => ({ id })), fork: () => ({ transactional: async (fn: (value: unknown) => unknown) => fn(em) }) };
const service = () => new BookingService({ em: em as unknown as EntityManager, clock, session: Promise.resolve(session), platformSettingsService: { get: () => settings } });
const input = { slotId, lengthMinutes: 25 as const };
beforeEach(() => {
  vi.clearAllMocks();
  session = { userId: 'mentee', roles: ['mentee'] };
  profile = { id: 'profile', price25Cents: 12345, price50Cents: 23456, publishedAt: now, bio: 'Mentor', stackTags: ['react'], publicWorkUrl: 'https://example.test' };
  slot = { id: slotId, mentorProfile: profile, startsAt: new Date(now.getTime() + 120 * MINUTE_MS) };
  findOne.mockImplementation(async entity => entity === 'Slot' ? slot : entity === 'Profile' ? profile : null);
  flush.mockResolvedValue(undefined); nativeUpdate.mockResolvedValue(0);
});
it('requires live mentee authorization and valid input before database access', async () => {
  session = null; await expect(service().start(input)).rejects.toMatchObject({ status: 401 });
  session = { userId: 'mentor', roles: ['mentor'] }; await expect(service().start(input)).rejects.toMatchObject({ status: 403 });
  session = { userId: 'mentee', roles: ['mentee'] }; await expect(service().start({ ...input, slotId: 'bad' })).rejects.toMatchObject({ status: 422 });
  expect(findOne).not.toHaveBeenCalled();
});
it('snapshots each duration from current stored prices at the inclusive lead boundary', async () => {
  for (const lengthMinutes of [25, 50] as const) {
    const result = await service().start({ slotId, lengthMinutes });
    expect(result).toEqual({ created: true, booking: { id: 'booking', slotId, mentorProfileId: 'profile', lengthMinutes, priceCents: lengthMinutes === 25 ? 12345 : 23456, currency: 'PLN', status: 'pending', startsAt: slot.startsAt.toISOString(), expiresAt: '2026-11-05T12:30:00.000Z' } });
    expect(em.create).toHaveBeenLastCalledWith('Booking', expect.objectContaining({ mentee: { id: 'mentee' }, bookedAt: null, stripeCheckoutSessionId: null }));
  }
  expect(findOne).toHaveBeenCalledWith('Profile', { id: 'profile' }, { lockMode: 'write', refresh: true });
  expect(findOne).toHaveBeenCalledWith('Slot', { id: slotId, mentorProfile: 'profile', removedAt: null }, { lockMode: 'write', refresh: true });
  expect(nativeUpdate).toHaveBeenCalledWith('Booking', { mentorProfile: 'profile', status: 'pending', expiresAt: { $lte: now } }, { status: 'expired', updatedAt: now });
  expect(flush).toHaveBeenCalledTimes(2);
});
it('rechecks a missing or removed slot and missing mentor after locking', async () => {
  findOne.mockResolvedValueOnce(null); await expect(service().start(input)).rejects.toMatchObject({ status: 404 });
  findOne.mockResolvedValueOnce(slot).mockResolvedValueOnce(null); await expect(service().start(input)).rejects.toMatchObject({ status: 404 });
  findOne.mockResolvedValueOnce(slot).mockResolvedValueOnce(profile).mockResolvedValueOnce(null); await expect(service().start(input)).rejects.toMatchObject({ status: 404 });
  expect(persist).not.toHaveBeenCalled();
});
it('rejects one millisecond inside the lead threshold and an unbookable mentor', async () => {
  slot.startsAt = new Date(slot.startsAt.getTime() - 1);
  await expect(service().start(input)).rejects.toMatchObject({ status: 422, fieldErrors: { slotId: expect.any(Array) } });
  slot.startsAt = new Date(now.getTime() + 120 * MINUTE_MS);
  profile.publishedAt = null;
  await expect(service().start(input)).rejects.toMatchObject({ status: 422 });
  profile.publishedAt = now; profile.price25Cents = 1;
  await expect(service().start(input)).rejects.toMatchObject({ status: 422 });
  expect(persist).not.toHaveBeenCalled();
});
it('recovers only a matching own pending hold without extending it or reading current prices', async () => {
  const occupant = { id: 'old', slot, mentorProfile: profile, mentee: { id: 'mentee' }, lengthMinutes: 25, status: 'pending', priceCents: 8000, currency: 'PLN', startsAt: slot.startsAt, expiresAt: new Date('2026-11-05T12:10:00Z') };
  findOne.mockImplementation(async entity => entity === 'Slot' ? slot : entity === 'Profile' ? profile : occupant);
  expect(await service().start(input)).toMatchObject({ created: false, booking: { id: 'old', priceCents: 8000, expiresAt: '2026-11-05T12:10:00.000Z' } });
  expect(persist).not.toHaveBeenCalled(); expect(flush).not.toHaveBeenCalled();
  for (const changed of [{ status: 'confirmed' }, { mentee: { id: 'other' } }, { lengthMinutes: 50 }]) {
    findOne.mockImplementation(async entity => entity === 'Slot' ? slot : entity === 'Profile' ? profile : { ...occupant, ...changed });
    await expect(service().start(input)).rejects.toMatchObject({ status: 409 });
  }
});
it('refuses an overlapping active session on another slot and propagates storage failure', async () => {
  findOne.mockResolvedValueOnce(slot).mockResolvedValueOnce(profile).mockResolvedValueOnce(slot).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'overlap' });
  await expect(service().start(input)).rejects.toMatchObject({ status: 409 });
  expect(persist).not.toHaveBeenCalled();
  flush.mockRejectedValueOnce(new Error('database unavailable'));
  await expect(service().start(input)).rejects.toThrow('database unavailable');
});
