import { Booking, LockMode, MentorProfile, Slot, type EntityManager } from '@devmentor/db';
import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../http/errors';
import { withBookingLock } from './booking-lock';

function fakeEm(found: unknown) {
  const locks: string[] = [];
  const tx = {
    findOneOrFail: vi.fn(async (entity: unknown, where: { id: string }, options: { lockMode: LockMode }) => {
      expect(options.lockMode).toBe(LockMode.PESSIMISTIC_WRITE);
      locks.push(entity === MentorProfile ? 'mentor' : entity === Slot ? 'slot' : entity === Booking ? 'booking' : 'other');
      return { id: where.id };
    }),
  };
  const em = {
    fork: () => ({
      findOne: vi.fn(async () => found),
      transactional: async (fn: (tx: unknown) => unknown) => fn(tx),
    }),
  };
  return { em: em as unknown as EntityManager, locks };
}

describe('withBookingLock', () => {
  it('locks mentor, then slot, then booking, and passes the locked booking', async () => {
    const { em, locks } = fakeEm({ id: 'b1', mentorProfile: { id: 'm1' }, slot: { id: 's1' } });
    const result = await withBookingLock(em, 'b1', async (_tx, booking) => booking.id);
    expect(result).toBe('b1');
    expect(locks).toEqual(['mentor', 'slot', 'booking']);
  });

  it('answers not found for a missing booking without opening a transaction', async () => {
    const { em, locks } = fakeEm(null);
    await expect(withBookingLock(em, 'missing', async () => 'never')).rejects.toBeInstanceOf(NotFoundError);
    expect(locks).toEqual([]);
  });
});
