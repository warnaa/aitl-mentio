import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { postBooking, withBookingFixture } from './fixtures/booking';

it('BOOKING-005 gives two concurrent mentees one reservation and one conflict', async () => {
  await withBookingFixture('005', async fixture => {
    const responses = await Promise.all([postBooking(fixture), postBooking(fixture, fixture.slot.id, 25, fixture.second)]);
    expect(responses.map(response => response.status).sort()).toEqual([201, 409]);
    const conflict = await responses.find(response => response.status === 409)!.json();
    expect(conflict).toMatchObject({ ok: false, error: { code: 'conflict' } });
    expect(JSON.stringify(conflict)).not.toContain(fixture.firstId);
    expect(JSON.stringify(conflict)).not.toContain(fixture.secondId);
    expect(await fixture.em.count(Booking, { slot: fixture.slot.id, status: 'pending' })).toBe(1);
  });
});
