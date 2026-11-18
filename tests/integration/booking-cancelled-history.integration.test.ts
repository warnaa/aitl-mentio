import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { postBooking, withBookingFixture } from './fixtures/booking';

it('BOOKING-015 releases cancelled occupancy while preserving the original booking snapshot', async () => {
  await withBookingFixture('015', async fixture => {
    const original = await postBooking(fixture);
    expect(original.status).toBe(201);
    const snapshot = (await original.json()).data;
    // Cancellation is a future story: this fixture supplies its resulting stored state only.
    await fixture.em.nativeUpdate(Booking, { id: snapshot.id }, { status: 'cancelled', cancelledAt: new Date() });
    const replacement = await postBooking(fixture, fixture.slot.id, 50, fixture.second);
    expect(replacement.status).toBe(201);
    const current = (await replacement.json()).data;
    expect(current.id).not.toBe(snapshot.id);
    const history = await fixture.em.fork().find(Booking, { slot: fixture.slot.id });
    expect(history).toHaveLength(2);
    expect(history.find(booking => booking.id === snapshot.id)).toMatchObject({
      status: 'cancelled', lengthMinutes: snapshot.lengthMinutes,
      priceCents: snapshot.priceCents, currency: snapshot.currency,
      startsAt: new Date(snapshot.startsAt),
    });
    expect(history.find(booking => booking.id === current.id)).toMatchObject({ status: 'pending', lengthMinutes: 50 });
  });
});
