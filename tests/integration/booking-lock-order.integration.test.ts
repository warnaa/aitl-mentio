import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { postBooking, withBookingFixture } from './fixtures/booking';

it('BOOKING-014 orders mentor and slot locks during an adverse removal interleaving', async () => {
  await withBookingFixture('014', async fixture => {
    let removal: Promise<Response> | undefined;
    let booking: Promise<Response> | undefined;
    const observer = fixture.em.fork();
    const blocked = () => observer.execute<{ query: string }[]>(
      "select query from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and state = 'active'",
    );
    try {
      await fixture.em.fork().transactional(async blocker => {
        // Hold the slot independently so DELETE must reach its second lock and wait there.
        await blocker.execute('select id from slots where id = ? for update', [fixture.slot.id]);
        removal = fetch(`${fixture.base}/api/availability/slots/${fixture.slot.id}`, { method: 'DELETE', headers: fixture.mentor });
        await expect.poll(async () => (await blocked()).some(row => row.query.includes('"slots"') && !row.query.toLowerCase().includes(' join '))).toBe(true);
        booking = postBooking(fixture);
        await expect.poll(async () => {
          const queries = await blocked();
          return queries.some(row => row.query.includes('"slots"')) && queries.some(row => row.query.includes('"mentor_profiles"'));
        }).toBe(true);
        // Committing releases our slot. DELETE already owns mentor, so booking cannot reverse the order.
      });
    } finally {
      // Always consume in-flight HTTP work before the fixture removes its database rows.
      if (removal && booking) {
        const responses = await Promise.all([removal, booking]);
        expect(responses.map(response => response.status)).toEqual([200, 404]);
      } else if (removal) await removal;
    }
    expect(await fixture.em.count(Booking, { mentorProfile: fixture.profileId })).toBe(0);
  });
});
