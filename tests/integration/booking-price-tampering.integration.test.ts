import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { postBooking, withBookingFixture } from './fixtures/booking';

it('BOOKING-007 snapshots a changed server price and ignores forged money and identity fields', async () => {
  await withBookingFixture('007', async fixture => {
    const viewed = await (await fetch(`${fixture.base}/api/mentors/${fixture.slug}`)).json();
    expect(viewed.data.prices.price25Cents).toBe(8000);
    const changed = await fetch(`${fixture.base}/api/mentors/me/prices`, { method: 'PUT', headers: fixture.mentor, body: JSON.stringify({ price25: '123.45', price50: '234.56' }) });
    expect(changed.status).toBe(200);
    const response = await postBooking(fixture, fixture.slot.id, 25, fixture.first, { priceCents: 1, currency: 'USD', menteeId: fixture.secondId, mentorProfileId: crypto.randomUUID(), status: 'confirmed' });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ data: { priceCents: 12345, currency: 'PLN', mentorProfileId: fixture.profileId, status: 'pending' } });
    const stored = await fixture.em.fork().findOneOrFail(Booking, { id: body.data.id });
    expect(stored.mentee.id).toBe(fixture.firstId);
    expect(stored.priceCents).toBe(12345); expect(stored.bookedAt).toBeNull();
  });
});
