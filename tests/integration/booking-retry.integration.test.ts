import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { postBooking, withBookingFixture } from './fixtures/booking';

it('BOOKING-011 recovers a lost-response retry without extending or duplicating the hold', async () => {
  await withBookingFixture('011', async fixture => {
    const original = await postBooking(fixture);
    expect(original.status).toBe(201);
    const first = (await original.json()).data;
    const retry = await postBooking(fixture);
    expect(retry.status).toBe(200);
    expect((await retry.json()).data).toEqual(first);
    expect((await postBooking(fixture, fixture.slot.id, 50)).status).toBe(409);
    expect((await postBooking(fixture, fixture.slot.id, 25, fixture.second)).status).toBe(409);
    expect(await fixture.em.count(Booking, { slot: fixture.slot.id })).toBe(1);
  });
});
