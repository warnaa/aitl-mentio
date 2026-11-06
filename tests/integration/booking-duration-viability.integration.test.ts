import { expect, it } from 'vitest';
import { postBooking, publishBookingSlot, withBookingFixture } from './fixtures/booking';

it('BOOKING-010 exposes only viable durations and allows adjacent sessions', async () => {
  await withBookingFixture('010', async fixture => {
    const next = await publishBookingSlot(fixture, '2099-11-06T12:25:00.000Z');
    expect((await postBooking(fixture, next.id, 25, fixture.second)).status).toBe(201);
    const offer = await (await fetch(`${fixture.base}/api/mentors/${fixture.slug}`)).json();
    expect(offer.data.slots.find((slot: { id: string }) => slot.id === fixture.slot.id).viableLengths).toEqual([25]);
    expect((await postBooking(fixture, fixture.slot.id, 50)).status).toBe(409);
    expect((await postBooking(fixture, fixture.slot.id, 25)).status).toBe(201);
  });
});
