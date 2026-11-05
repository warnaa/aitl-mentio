import { expect, it } from 'vitest';
import { Booking, MentorProfile, Slot } from '@devmentor/db';
import { postBooking, publishBookingSlot, withBookingFixture } from './fixtures/booking';

it('BOOKING-003 rejects invalid, too-near, removed and unbookable selections without writing', async () => {
  await withBookingFixture('003', async fixture => {
    for (const [slotId, lengthMinutes] of [['invalid', 25], [fixture.slot.id, 30]] as const) {
      const response = await postBooking(fixture, slotId, lengthMinutes);
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: 'validation_failed' } });
    }
    const near = await publishBookingSlot(fixture, new Date(Date.now() + 60 * 60_000).toISOString());
    const tooNear = await postBooking(fixture, near.id);
    expect(tooNear.status).toBe(422);
    expect(await tooNear.json()).toMatchObject({ error: { fieldErrors: { slotId: ['Sessions need at least two hours of notice.'] } } });
    expect((await postBooking(fixture, crypto.randomUUID())).status).toBe(404);
    await fixture.em.nativeUpdate(Slot, { id: fixture.slot.id }, { removedAt: new Date('2026-11-05T12:00:00Z') });
    expect((await postBooking(fixture)).status).toBe(404);
    await fixture.em.nativeUpdate(Slot, { id: fixture.slot.id }, { removedAt: null });
    await fixture.em.nativeUpdate(MentorProfile, { id: fixture.profileId }, { publishedAt: null });
    expect((await postBooking(fixture)).status).toBe(422);
    await fixture.em.nativeUpdate(MentorProfile, { id: fixture.profileId }, { publishedAt: new Date('2026-11-05T12:00:00Z'), price25Cents: 1 });
    expect((await postBooking(fixture)).status).toBe(422);
    expect(await fixture.em.count(Booking, { mentorProfile: fixture.profileId })).toBe(0);
  });
});
