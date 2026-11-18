import { Booking, LockMode, MentorProfile, Slot, type EntityManager, type IBooking } from '@devmentor/db';
import { NotFoundError } from '../../http/errors';

/**
 * Runs `fn` in a fresh transaction holding the booking's locks in the one order every
 * booking writer uses: mentor profile, then slot, then booking. The first read only
 * discovers the lock owners; `fn` receives the booking re-read under its lock.
 */
export async function withBookingLock<T>(em: EntityManager, bookingId: string, fn: (em: EntityManager, booking: IBooking) => Promise<T>) {
  const discovered = await em.fork().findOne(Booking, { id: bookingId });
  if (!discovered) throw new NotFoundError('Booking not found');
  return em.fork().transactional(async tx => {
    await tx.findOneOrFail(MentorProfile, { id: discovered.mentorProfile.id }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
    await tx.findOneOrFail(Slot, { id: discovered.slot.id }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
    const booking = await tx.findOneOrFail(Booking, { id: bookingId }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
    return fn(tx, booking);
  });
}
