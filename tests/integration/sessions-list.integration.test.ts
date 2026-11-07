import { expect, it } from 'vitest';
import { confirmBooking, listNotifications, withSecondMentorBooking } from './fixtures/notification';
import { withPaymentFixture } from './fixtures/payment';

type Row = { id: string; status: string; startsAt: string; lengthMinutes: number; mentorName: string };
const sessions = async (base: string, headers: Record<string, string>, role: 'mentee' | 'mentor') => {
  const response = await fetch(`${base}/api/bookings?role=${role}`, { headers });
  return { status: response.status, rows: ((await response.json()).data ?? []) as Row[] };
};

it('SESSIONS-001 lists each mentor only the sessions booked with them, and each mentee only their own', async () => {
  await withPaymentFixture('list-001', async fixture => {
    await withSecondMentorBooking(fixture, async other => {

      await confirmBooking(fixture); 



      const mentorA = await sessions(fixture.base, fixture.mentor, 'mentor');
      const mentorB = await sessions(fixture.base, fixture.second, 'mentor');
      expect(mentorA.rows.map(row => row.id)).toEqual([fixture.booking.id]);
      expect(mentorB.rows.map(row => row.id)).toEqual([other.id]);
      expect(mentorA.rows[0]).toMatchObject({ status: 'confirmed', lengthMinutes: 25, startsAt: fixture.booking.startsAt });

      // Both bookings belong to the first mentee; the second account is also mentor B, so their mentee list is empty.

      const mentee = await sessions(fixture.base, fixture.first, 'mentee');
      expect(mentee.rows.map(row => row.id).sort()).toEqual([fixture.booking.id, other.id].sort());
      expect((await sessions(fixture.base, fixture.second, 'mentee')).rows).toEqual([]);

      // A signed-in user cannot ask for another persona's list, or any list while signed out.
      expect((await sessions(fixture.base, fixture.first, 'mentor')).status).toBe(403);
      expect((await sessions(fixture.base, { 'x-devmentor-request': '1' }, 'mentor')).status).toBe(401);

      // The notification follows the same scope: A's mentor is told, B's is not.

      const a = await listNotifications(fixture, fixture.mentor);
      expect(a.body.data.items).toHaveLength(1);
      expect((await listNotifications(fixture, fixture.second)).body.data).toEqual({ unreadCount: 0, items: [] });
    });
  });
});
