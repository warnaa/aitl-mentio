import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { postBooking, withBookingFixture } from './fixtures/booking';

it('BOOKING-013 throttles repeated account attempts without creating a booking', async () => {
  await withBookingFixture('013', async fixture => {
    // Invalid input still consumes an attempt, so abuse cannot avoid the budget via malformed bodies.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect((await postBooking(fixture, 'invalid')).status).toBe(422);
    }
    const limited = await postBooking(fixture);
    expect(limited.status).toBe(429);
    const body = await limited.json();
    expect(body).toMatchObject({ ok: false, error: { code: 'rate_limited' } });
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(Number(limited.headers.get('retry-after'))).toBeLessThanOrEqual(600);
    expect(await fixture.em.count(Booking, { mentorProfile: fixture.profileId })).toBe(0);
  });
});
