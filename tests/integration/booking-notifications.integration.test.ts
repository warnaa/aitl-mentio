import { expect, it } from 'vitest';
import { Notification } from '@devmentor/db';
import { emailOf, confirmBooking, listNotifications, mailsTo, postRead } from './fixtures/notification';
import { paymentEvent, postCheckout, postPaymentEvent, storedBooking, withPaymentFixture } from './fixtures/payment';

const confirmedSubject = 'Your DevMentor session is confirmed';
const bookedSubject = 'A DevMentor session was booked with you';

it('NOTIFY-001 tells the mentor and the mentee once, in the product and by email, and a replay adds nothing', async () => {
  await withPaymentFixture('notify-001', async fixture => {
    const since = Date.now();
    const event = await confirmBooking(fixture);
    const [menteeEmail, mentorEmail] = await Promise.all([emailOf(fixture, fixture.firstId), emailOf(fixture, fixture.mentorId)]);

    const mentee = await listNotifications(fixture, fixture.first);
    const mentor = await listNotifications(fixture, fixture.mentor);
    expect(mentee.body.data).toMatchObject({ unreadCount: 1, items: [{ kind: 'booking_confirmed', audience: 'mentee', lengthMinutes: 25, startsAt: fixture.booking.startsAt, readAt: null }] });
    expect(mentor.body.data).toMatchObject({ unreadCount: 1, items: [{ kind: 'booking_confirmed', audience: 'mentor', lengthMinutes: 25, startsAt: fixture.booking.startsAt, readAt: null }] });
    expect(JSON.stringify([mentee.body, mentor.body])).not.toContain('@');

    const menteeMail = await mailsTo(menteeEmail, since);
    const mentorMail = await mailsTo(mentorEmail, since);
    expect(menteeMail).toHaveLength(1);
    expect(menteeMail[0]!.subject).toBe(confirmedSubject);
    expect(menteeMail[0]!.text).toContain(`Mentor: ${mentee.body.data.items[0]!.counterpartName}`);
    expect(menteeMail[0]!.text).toContain('Length: 25 minutes');
    expect(menteeMail[0]!.text).toContain('UTC');
    expect(menteeMail[0]!.text).not.toContain(mentorEmail);
    expect(mentorMail).toHaveLength(1);
    expect(mentorMail[0]!.subject).toBe(bookedSubject);
    expect(mentorMail[0]!.text).toContain(`Mentee: ${mentor.body.data.items[0]!.counterpartName}`);
    expect(mentorMail[0]!.text).not.toContain(menteeEmail);

    // The consumer runs before the callback answers, so no waiting is needed here; a redelivery or a
    // different event for the same charge must not notify again.
    expect((await postPaymentEvent(fixture, event)).status).toBe(200);
    expect((await postPaymentEvent(fixture, { ...event, id: `${event.id}_redelivery` })).status).toBe(200);
    expect(await fixture.em.fork().count(Notification, { booking: fixture.booking.id })).toBe(2);
    expect(await mailsTo(menteeEmail, since)).toHaveLength(1);
    expect(await mailsTo(mentorEmail, since)).toHaveLength(1);
  });
});

it('NOTIFY-002 sends nothing for a booking that was never confirmed, including a mismatched paid callback held for review', async () => {
  await withPaymentFixture('notify-002', async fixture => {
    const since = Date.now();
    const [menteeEmail, mentorEmail] = await Promise.all([emailOf(fixture, fixture.firstId), emailOf(fixture, fixture.mentorId)]);
    expect((await postCheckout(fixture)).status).toBe(200);
    expect((await postPaymentEvent(fixture, await paymentEvent(fixture, 'evt_unconfirmed', { amountCents: 7999 }))).status).toBe(200);
    expect((await storedBooking(fixture)).status).toBe('pending');
    expect(await fixture.em.fork().count(Notification, { booking: fixture.booking.id })).toBe(0);
    for (const email of [menteeEmail, mentorEmail]) {
      const mails = await mailsTo(email, since);
      expect(mails.filter(mail => [confirmedSubject, bookedSubject].includes(mail.subject))).toEqual([]);
    }
    for (const headers of [fixture.first, fixture.mentor]) {
      expect((await listNotifications(fixture, headers)).body.data).toEqual({ unreadCount: 0, items: [] });
    }
  });
});

it('NOTIFY-003 lets a user mark only their own notifications read and denies anonymous or cross-site calls', async () => {
  await withPaymentFixture('notify-003', async fixture => {
    await confirmBooking(fixture);
    const mentee = await listNotifications(fixture, fixture.first);
    const mentor = await listNotifications(fixture, fixture.mentor);
    const [menteeId, mentorId] = [mentee.body.data.items[0]!.id, mentor.body.data.items[0]!.id];

    expect((await fetch(`${fixture.base}/api/notifications`)).status).toBe(401);
    expect((await postRead(fixture, { cookie: fixture.first.cookie!, 'content-type': 'application/json' }, [menteeId])).status).toBe(403);
    expect((await postRead(fixture, { 'x-devmentor-request': '1', 'content-type': 'application/json' }, [menteeId])).status).toBe(401);
    expect((await postRead(fixture, fixture.first, [])).status).toBe(422);

    // The mentee names the mentor's id as well as their own: only their own changes.
    const response = await postRead(fixture, fixture.first, [menteeId, mentorId]);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ updated: 1 });
    expect((await listNotifications(fixture, fixture.first)).body.data.unreadCount).toBe(0);
    expect((await listNotifications(fixture, fixture.mentor)).body.data).toMatchObject({ unreadCount: 1, items: [{ id: mentorId, readAt: null }] });
    expect((await (await postRead(fixture, fixture.first, [menteeId])).json()).data).toEqual({ updated: 0 });
  });
});
