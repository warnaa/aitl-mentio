import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { postBooking, withBookingFixture } from './fixtures/booking';

it('BOOKING-001 reserves a 25-minute pending session at the mentor price', async () => {
  await withBookingFixture('001', async fixture => {
    const before = Date.now();
    const response = await postBooking(fixture);
    const after = Date.now();
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, data: { slotId: fixture.slot.id, mentorProfileId: fixture.profileId, lengthMinutes: 25, priceCents: 8000, currency: 'PLN', status: 'pending', startsAt: fixture.slot.startsAt } });
    expect(Object.keys(body.data).sort()).toEqual(['id', 'slotId', 'mentorProfileId', 'lengthMinutes', 'priceCents', 'currency', 'status', 'startsAt', 'expiresAt'].sort());
    expect(Date.parse(body.data.expiresAt)).toBeGreaterThanOrEqual(before + 30 * 60_000);
    expect(Date.parse(body.data.expiresAt)).toBeLessThanOrEqual(after + 30 * 60_000);
    const stored = await fixture.em.fork().findOneOrFail(Booking, { id: body.data.id });
    expect(stored.mentee.id).toBe(fixture.firstId);
    expect(stored.bookedAt).toBeNull(); expect(stored.stripeCheckoutSessionId).toBeNull();
  });
});
