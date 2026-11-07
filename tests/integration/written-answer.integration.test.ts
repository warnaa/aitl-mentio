import { expect, it } from 'vitest';
import { Booking, Notification } from '@devmentor/db';
import { confirmBooking, emailOf, listNotifications, mailsTo, withSecondMentorBooking } from './fixtures/notification';
import { withPaymentFixture, type PaymentFixture } from './fixtures/payment';

const MINUTE = 60_000;
type Answer = { body: string; postedAt: string };
type View = { window: string; answer: Answer | null; answerOwed: boolean };
type ErrorBody = { code: string; message: string; fieldErrors?: Record<string, string[]> };

const read = async (fixture: PaymentFixture, headers: Record<string, string>, bookingId = fixture.booking.id) => {
  const response = await fetch(`${fixture.base}/api/sessions/${bookingId}`, { headers });
  return { status: response.status, body: await response.json() as { ok: boolean; data?: View; error?: ErrorBody } };
};
const put = async (fixture: PaymentFixture, headers: Record<string, string>, body: unknown, bookingId = fixture.booking.id) => {
  const response = await fetch(`${fixture.base}/api/sessions/${bookingId}/answer`, { method: 'PUT', headers, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() as { ok: boolean; data?: Answer; error?: ErrorBody } };
};
/** The app uses the real clock, so a case moves the booking's start instead of the clock. */
const startedMinutesAgo = (fixture: PaymentFixture, minutes: number) =>
  fixture.em.fork().nativeUpdate(Booking, { id: fixture.booking.id }, { startsAt: new Date(Date.now() - minutes * MINUTE) });
const storedAnswer = async (fixture: PaymentFixture) => (await fixture.em.fork().findOneOrFail(Booking, { id: fixture.booking.id })).writtenAnswer;

it('WRITTENANSWER-001 the mentor posts the answer, the mentee keeps it and is told once; everyone else is refused', async () => {
  await withPaymentFixture('wa-001', async fixture => {
    await confirmBooking(fixture);
    const menteeEmail = await emailOf(fixture, fixture.firstId);

    // Before the start the mentor cannot post yet.
    const early = await put(fixture, fixture.mentor, { body: 'Too early.' });
    expect(early.status).toBe(409);
    expect(early.body.error?.message).toBe('You can post the written answer when the session starts.');

    // After the end with no answer, the mentee sees that it is still owed.
    await startedMinutesAgo(fixture, 30);
    expect((await read(fixture, fixture.first)).body.data).toMatchObject({ window: 'ended', answer: null, answerOwed: true });
    const owedPage = await fetch(`${fixture.base}/sessions/${fixture.booking.id}`, { headers: { cookie: fixture.first.cookie! } });
    expect(await owedPage.text()).toContain('The written answer is still owed.');

    // The booking's mentee and a stranger cannot post; a cross-site write never reaches the service.
    const asMentee = await put(fixture, fixture.first, { body: 'I will answer myself.' });
    expect(asMentee.status).toBe(403);
    expect(asMentee.body.error?.message).toBe('Only the mentor can post the written answer.');
    expect((await put(fixture, fixture.second, { body: 'Not my session.' })).status).toBe(404);
    const noHeader = await fetch(`${fixture.base}/api/sessions/${fixture.booking.id}/answer`, { method: 'PUT', headers: { cookie: fixture.mentor.cookie!, 'content-type': 'application/json' }, body: '{"body":"x"}' });
    expect(noHeader.status).toBe(403);
    expect((await put(fixture, fixture.mentor, { body: '   ' })).status).toBe(422);
    expect(await storedAnswer(fixture)).toBeNull();

    // The mentor posts; the mentee sees it on the session and is told in the product and by email.
    const since = Date.now();
    const posted = await put(fixture, fixture.mentor, { body: '  Use a discriminated union.\r\nNarrow on ok.  ' });
    expect(posted.status).toBe(200);
    expect(posted.body.data?.body).toBe('Use a discriminated union.\nNarrow on ok.');
    expect((await read(fixture, fixture.first)).body.data).toMatchObject({ answer: { body: 'Use a discriminated union.\nNarrow on ok.' }, answerOwed: false });
    const notes = await listNotifications(fixture, fixture.first);
    expect(notes.body.data.items).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'answer_posted', audience: 'mentee', counterpartName: expect.any(String) })]));
    expect((await listNotifications(fixture, fixture.mentor)).body.data.items.some(item => item.kind === 'answer_posted')).toBe(false);
    const mail = (await mailsTo(menteeEmail, since)).filter(entry => entry.subject === 'Your DevMentor written answer is ready');
    expect(mail).toHaveLength(1);
    expect(mail[0]!.text).toContain(`/sessions/${fixture.booking.id}`);
    expect(mail[0]!.text).not.toContain('discriminated union');

    // Replacing it changes the answer but tells nobody again.
    expect((await put(fixture, fixture.mentor, { body: 'Use a discriminated union; keep an adapter.' })).status).toBe(200);
    expect((await mailsTo(menteeEmail, since)).filter(entry => entry.subject === 'Your DevMentor written answer is ready')).toHaveLength(1);
    expect(await fixture.em.fork().count(Notification, { booking: fixture.booking.id, kind: 'answer_posted' })).toBe(1);

    // Weeks later the answer is still there, on the API and the page.
    await startedMinutesAgo(fixture, 42 * 24 * 60);
    expect((await read(fixture, fixture.first)).body.data?.answer?.body).toBe('Use a discriminated union; keep an adapter.');
    const later = await fetch(`${fixture.base}/sessions/${fixture.booking.id}`, { headers: { cookie: fixture.first.cookie! } });
    expect(await later.text()).toContain('Use a discriminated union; keep an adapter.');
  });
});

it('WRITTENANSWER-002 the mentor of a different session cannot post an answer to this one', async () => {
  await withPaymentFixture('wa-002', async fixture => {
    await confirmBooking(fixture);
    await startedMinutesAgo(fixture, 30);
    await withSecondMentorBooking(fixture, async () => {
      // `second` is now a mentor with a booking of their own, and still no party to this one.
      const refused = await put(fixture, fixture.second, { body: 'Answering someone else’s session.' });
      expect(refused.status).toBe(404);
      expect(await storedAnswer(fixture)).toBeNull();
    });
  });
});
