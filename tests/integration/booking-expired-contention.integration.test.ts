import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { postBooking, withBookingFixture } from './fixtures/booking';

it('BOOKING-006 replaces an expired hold under contention while preserving its history', async () => {
  await withBookingFixture('006', async fixture => {
    const first = await postBooking(fixture);
    expect(first.status).toBe(201);
    const old = (await first.json()).data;
    await fixture.em.nativeUpdate(Booking, { id: old.id }, { expiresAt: new Date('2000-01-01T00:00:00Z') });
    const responses = await Promise.all([postBooking(fixture), postBooking(fixture, fixture.slot.id, 50, fixture.second)]);
    expect(responses.map(response => response.status).sort()).toEqual([201, 409]);
    const history = await fixture.em.fork().find(Booking, { slot: fixture.slot.id });
    expect(history).toHaveLength(2);
    expect(history.find(booking => booking.id === old.id)).toMatchObject({ status: 'expired', priceCents: old.priceCents, lengthMinutes: old.lengthMinutes });
    expect(history.filter(booking => booking.status === 'pending')).toHaveLength(1);
  });
});
