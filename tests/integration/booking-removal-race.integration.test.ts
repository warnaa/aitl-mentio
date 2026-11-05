import { expect, it } from 'vitest';
import { Booking, Slot } from '@devmentor/db';
import { postBooking, withBookingFixture } from './fixtures/booking';

it('BOOKING-008 serializes booking against removal so only one operation succeeds', async () => {
  await withBookingFixture('008', async fixture => {
    const [booking, removal] = await Promise.all([
      postBooking(fixture),
      fetch(`${fixture.base}/api/availability/slots/${fixture.slot.id}`, { method: 'DELETE', headers: fixture.mentor }),
    ]);
    expect([[201, 409], [404, 200]]).toContainEqual([booking.status, removal.status]);
    const stored = await fixture.em.fork().findOneOrFail(Slot, { id: fixture.slot.id });
    const count = await fixture.em.count(Booking, { slot: fixture.slot.id, status: 'pending' });
    if (booking.status === 201) { expect(stored.removedAt).toBeNull(); expect(count).toBe(1); }
    else { expect(stored.removedAt).not.toBeNull(); expect(count).toBe(0); }
  });
});
