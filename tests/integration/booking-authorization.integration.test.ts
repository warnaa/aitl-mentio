import { expect, it } from 'vitest';
import { Booking, User } from '@devmentor/db';
import { postBooking, withBookingFixture } from './fixtures/booking';

it('BOOKING-004 denies unsigned, wrong-role and CSRF-less booking requests', async () => {
  await withBookingFixture('004', async fixture => {
    const unsigned = await postBooking(fixture, fixture.slot.id, 25, { 'x-devmentor-request': '1' });
    expect(unsigned.status).toBe(401);
    expect(await unsigned.json()).toMatchObject({ error: { code: 'unauthorized' } });
    const csrf = await postBooking(fixture, fixture.slot.id, 25, { cookie: fixture.first.cookie! });
    expect(csrf.status).toBe(403);
    expect(await csrf.json()).toMatchObject({ error: { code: 'forbidden' } });
    await fixture.em.nativeUpdate(User, { id: fixture.mentorId }, { roles: ['mentor'] });
    const wrongRole = await postBooking(fixture, fixture.slot.id, 25, fixture.mentor);
    expect(wrongRole.status).toBe(403);
    expect(await fixture.em.count(Booking, { mentorProfile: fixture.profileId })).toBe(0);
  });
});
