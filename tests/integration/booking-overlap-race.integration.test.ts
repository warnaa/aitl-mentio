import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { postBooking, publishBookingSlot, withBookingFixture } from './fixtures/booking';

it('BOOKING-009 refuses overlapping concurrent reservations across different slot IDs', async () => {
  await withBookingFixture('009', async fixture => {
    const next = await publishBookingSlot(fixture, '2099-11-06T12:25:00.000Z');
    const responses = await Promise.all([postBooking(fixture, fixture.slot.id, 50), postBooking(fixture, next.id, 50, fixture.second)]);
    expect(responses.map(response => response.status).sort()).toEqual([201, 409]);
    expect(await fixture.em.count(Booking, { mentorProfile: fixture.profileId, status: 'pending' })).toBe(1);
  });
});
