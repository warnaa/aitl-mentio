import { expect, it } from 'vitest';
import { postBooking, withBookingFixture } from './fixtures/booking';

it('BOOKING-002 reserves a 50-minute pending session at its distinct mentor price', async () => {
  await withBookingFixture('002', async fixture => {
    const response = await postBooking(fixture, fixture.slot.id, 50);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true, data: { lengthMinutes: 50, priceCents: 16000, currency: 'PLN', status: 'pending' } });
  });
});
