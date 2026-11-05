import { beforeEach, expect, it, vi } from 'vitest';
import { UniqueConstraintViolationException, type EntityManager } from '@devmentor/db';
import { SlotService } from './slot.service';
import type { Session } from '../../http/auth';

vi.mock('@devmentor/db', () => ({ Slot: 'Slot', MentorProfile: 'Profile', LockMode: { PESSIMISTIC_WRITE: 'write' }, UniqueConstraintViolationException: class extends Error {} }));
const now = new Date('2026-11-05T12:00:00Z');
let session: Session | null;
let profile: { id: string; lastPublishedAvailabilityAt: Date | null; updatedAt: Date };
let slot: { id: string; startsAt: Date; removedAt: Date | null; updatedAt: Date };
const findOne = vi.fn();
const find = vi.fn();
const count = vi.fn();
const flush = vi.fn();
const persist = vi.fn();
const emit = vi.fn();
const clock = { now: vi.fn(() => now) };
const em = { count, findOne, find, flush, persist, create: vi.fn((_type, data) => ({ id: 'slot', ...data })), fork: () => ({ transactional: async (fn: (em: unknown) => unknown) => fn(em) }) };
const service = () => new SlotService({ em: em as unknown as EntityManager, session: Promise.resolve(session), clock, eventBus: { emit } });
beforeEach(() => {
  vi.clearAllMocks();
  session = { userId: 'owner', roles: ['mentor'] };
  profile = { id: 'profile', lastPublishedAvailabilityAt: null, updatedAt: now };
  slot = { id: 'slot', startsAt: new Date('2026-11-06T12:00:00Z'), removedAt: null, updatedAt: now };
  findOne.mockImplementation(async type => type === 'Profile' ? profile : slot);
  count.mockResolvedValue(1); find.mockResolvedValue([slot]); flush.mockResolvedValue(undefined); emit.mockResolvedValue(undefined);
});
it('guards every owner operation before access', async () => {
  for (session of [null, { userId: 'owner', roles: ['mentee'] } as Session]) {
    for (const call of [() => service().list(), () => service().publish({ startsAt: slot.startsAt.toISOString() }), () => service().remove('11111111-1111-4111-8111-111111111111')]) {
      await expect(call()).rejects.toMatchObject({ status: session ? 403 : 401 });
    }
  }
  expect(findOne).not.toHaveBeenCalled(); expect(find).not.toHaveBeenCalled();
});
it('lists only active slots for the live owner in chronological order', async () => {
  expect(await service().list()).toEqual({ items: [{ id: 'slot', startsAt: slot.startsAt.toISOString() }], page: 1, pageCount: 1 });
  expect(find).toHaveBeenCalledWith('Slot', { mentorProfile: { user: 'owner' }, removedAt: null, startsAt: { $gt: now } }, { orderBy: { startsAt: 'asc' }, limit: 25, offset: 0 });
});
it('locks the owner before reading time and atomically writes the publication timestamp', async () => {
  expect(await service().publish({ startsAt: slot.startsAt.toISOString() })).toEqual({ id: 'slot', startsAt: slot.startsAt.toISOString() });
  expect(findOne).toHaveBeenCalledWith('Profile', { user: 'owner' }, { lockMode: 'write', refresh: true });
  expect(findOne.mock.invocationCallOrder[0]!).toBeLessThan(clock.now.mock.invocationCallOrder[0]!);
  expect(profile.lastPublishedAvailabilityAt).toBe(now);
  expect(persist).toHaveBeenCalledOnce();
  expect(emit).toHaveBeenCalledWith('availability.slot.published', { mentorProfileId: 'profile', slotId: 'slot', startsAt: slot.startsAt.toISOString() });
  expect(flush.mock.invocationCallOrder[0]!).toBeLessThan(emit.mock.invocationCallOrder[0]!);
});
it('refuses unknown profiles, bad shape and past or equal-to-now instants', async () => {
  await expect(service().publish({ startsAt: 'invalid' })).rejects.toMatchObject({ status: 422 });
  for (const startsAt of [now.toISOString(), '2000-01-01T00:00:00Z']) await expect(service().publish({ startsAt })).rejects.toMatchObject({ status: 422, fieldErrors: { startsAt: expect.any(Array) } });
  findOne.mockResolvedValue(null);
  await expect(service().publish({ startsAt: slot.startsAt.toISOString() })).rejects.toMatchObject({ status: 404 });
  expect(flush).not.toHaveBeenCalled(); expect(emit).not.toHaveBeenCalled();
});
it('maps only the named duplicate constraint and never emits on rollback', async () => {
  const duplicate = Object.assign(new UniqueConstraintViolationException(new Error('duplicate')), { constraint: 'slots_active_mentor_start_unique' });
  flush.mockRejectedValueOnce(duplicate);
  await expect(service().publish({ startsAt: slot.startsAt.toISOString() })).rejects.toMatchObject({ status: 409 });
  const other = Object.assign(new UniqueConstraintViolationException(new Error('other')), { constraint: 'other' });
  flush.mockRejectedValueOnce(other);
  await expect(service().publish({ startsAt: slot.startsAt.toISOString() })).rejects.toBe(other);
  flush.mockRejectedValueOnce(new Error('down'));
  await expect(service().publish({ startsAt: slot.startsAt.toISOString() })).rejects.toThrow('down');
  expect(emit).not.toHaveBeenCalled();
});
it('soft-removes under an owner-scoped row lock and hides foreign/missing IDs', async () => {
  expect(await service().remove('11111111-1111-4111-8111-111111111111')).toEqual({ id: 'slot' });
  expect(findOne).toHaveBeenCalledWith('Slot', { id: '11111111-1111-4111-8111-111111111111', mentorProfile: { user: 'owner' }, removedAt: null }, { lockMode: 'write', refresh: true });
  expect(slot.removedAt).toBe(now); expect(profile.lastPublishedAvailabilityAt).toBeNull();
  findOne.mockResolvedValue(null);
  await expect(service().remove('22222222-2222-4222-8222-222222222222')).rejects.toMatchObject({ status: 404, message: 'Slot not found' });
});


it('bounds future/past paging, clamps stale pages and rejects malformed list/id input', async () => {
  count.mockResolvedValue(51);
  expect(await service().list({ page: '2', past: 'true' })).toMatchObject({ page: 2, pageCount: 3 });
  expect(find).toHaveBeenLastCalledWith('Slot', expect.objectContaining({ startsAt: { $lte: now } }), { orderBy: { startsAt: 'desc' }, limit: 25, offset: 25 });
  expect(await service().list({ page: 9 })).toMatchObject({ page: 3 });
  count.mockResolvedValue(0); expect(await service().list()).toMatchObject({ page: 1, pageCount: 1 });
  await expect(service().list({ page: -1 })).rejects.toMatchObject({ status: 422 });
  await expect(service().remove('invalid')).rejects.toMatchObject({ status: 422 });
});
