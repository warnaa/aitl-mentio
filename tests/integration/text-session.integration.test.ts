import { expect, it } from 'vitest';
import { Booking, SessionMessage } from '@devmentor/db';
import { confirmBooking } from './fixtures/notification';
import { withPaymentFixture, type PaymentFixture } from './fixtures/payment';

const MINUTE = 60_000;
const CSRF_ONLY = { 'x-devmentor-request': '1' };
type Message = { id: string; authorRole: string; isOwn: boolean; authorName: string; body: string };
type View = { window: string; viewerRole: string; messages: Message[]; truncated: boolean };
type ErrorBody = { code: string; message: string; fieldErrors?: Record<string, string[]> };

const read = async (fixture: PaymentFixture, headers: Record<string, string>) => {
  const response = await fetch(`${fixture.base}/api/sessions/${fixture.booking.id}`, { headers });
  return { status: response.status, text: await response.clone().text(), body: await response.json() as { ok: boolean; data?: View; error?: ErrorBody } };
};
const post = async (fixture: PaymentFixture, headers: Record<string, string>, body: unknown) => {
  const response = await fetch(`${fixture.base}/api/sessions/${fixture.booking.id}/messages`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() as { ok: boolean; data?: Message; error?: ErrorBody } };
};
/** The app uses the real clock, so a case moves the booking's start instead of the clock. */
const startedMinutesAgo = (fixture: PaymentFixture, minutes: number) =>
  fixture.em.fork().nativeUpdate(Booking, { id: fixture.booking.id }, { startsAt: new Date(Date.now() - minutes * MINUTE) });
const stored = (fixture: PaymentFixture) => fixture.em.fork().count(SessionMessage, { booking: fixture.booking.id });

it('TEXTSESSION-001 lets the two parties exchange text in the open window and refuses everyone else', async () => {
  await withPaymentFixture('ts-001', async fixture => {
    await confirmBooking(fixture);
    await startedMinutesAgo(fixture, 1);

    const first = await post(fixture, fixture.first, { body: '  How should I validate this?\r\nIt is an API request.  ' });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ authorRole: 'mentee', isOwn: true, body: 'How should I validate this?\nIt is an API request.' });
    const second = await post(fixture, fixture.mentor, { body: 'At the HTTP boundary.' });
    expect(second.status).toBe(201);
    expect(second.body.data).toMatchObject({ authorRole: 'mentor', isOwn: true });

    const asMentee = await read(fixture, fixture.first);
    expect(asMentee.status).toBe(200);
    expect(asMentee.body.data).toMatchObject({ window: 'open', viewerRole: 'mentee', truncated: false });
    expect(asMentee.body.data!.messages.map(m => [m.authorRole, m.isOwn, m.body])).toEqual([
      ['mentee', true, 'How should I validate this?\nIt is an API request.'],
      ['mentor', false, 'At the HTTP boundary.'],
    ]);
    const asMentor = await read(fixture, fixture.mentor);
    expect(asMentor.body.data).toMatchObject({ window: 'open', viewerRole: 'mentor' });
    expect(asMentor.body.data!.messages.map(m => m.isOwn)).toEqual([false, true]);
    expect(asMentor.text).not.toContain('@');

    // A signed-in user who is neither party is refused exactly like an unknown booking, and writes nothing.
    const third = await read(fixture, fixture.second);
    expect(third.status).toBe(404);
    expect(third.text).not.toContain('HTTP boundary');
    expect((await post(fixture, fixture.second, { body: 'let me in' })).status).toBe(404);
    expect(await stored(fixture)).toBe(2);

    // Signed out, cross-site and malformed requests never reach the session.
    expect((await read(fixture, CSRF_ONLY)).status).toBe(401);
    const noHeader = await fetch(`${fixture.base}/api/sessions/${fixture.booking.id}/messages`, { method: 'POST', headers: { cookie: fixture.first.cookie!, 'content-type': 'application/json' }, body: '{"body":"x"}' });
    expect(noHeader.status).toBe(403);
    expect((await post(fixture, fixture.first, { body: '   ' })).body.error?.fieldErrors?.body).toBeTruthy();
    expect((await post(fixture, fixture.first, { body: 'x'.repeat(4001) })).status).toBe(422);
    expect((await fetch(`${fixture.base}/api/sessions/not-a-uuid`, { headers: fixture.first })).status).toBe(422);
    expect(await stored(fixture)).toBe(2);

    // The screen both parties open says sessions are text and carries the share rule; a stranger gets not-found.
    const page = await fetch(`${fixture.base}/sessions/${fixture.booking.id}`, { headers: { cookie: fixture.first.cookie! } });
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('Sessions are text.');
    expect(html).toContain('Paste only what you are allowed to share. DevMentor does not check who owns it.');
    expect(html).not.toMatch(/<(audio|video)\b/i);
    expect((await fetch(`${fixture.base}/sessions/${fixture.booking.id}`, { headers: { cookie: fixture.second.cookie! } })).status).toBe(404);
    const signedOut = await fetch(`${fixture.base}/sessions/${fixture.booking.id}`, { redirect: 'manual' });
    expect(signedOut.status).toBeGreaterThanOrEqual(300);
    expect(signedOut.headers.get('location')).toContain(`/sign-in?returnTo=${encodeURIComponent(`/sessions/${fixture.booking.id}`)}`);
  });
});

it('TEXTSESSION-002 keeps posting inside the booked window and an unconfirmed booking closed', async () => {
  await withPaymentFixture('ts-002', async fixture => {
    // Reserved but unpaid: not a session yet, even for its own parties.
    expect((await read(fixture, fixture.first)).status).toBe(404);
    expect((await read(fixture, fixture.mentor)).status).toBe(404);
    expect((await post(fixture, fixture.first, { body: 'too soon' })).status).toBe(404);

    await confirmBooking(fixture);
    // Confirmed, start still in the future: readable, closed to posting.
    const early = await read(fixture, fixture.first);
    expect(early.body.data).toMatchObject({ window: 'not_started', messages: [] });
    const refusedEarly = await post(fixture, fixture.first, { body: 'before the start' });
    expect(refusedEarly.status).toBe(409);
    expect(refusedEarly.body.error?.message).toBe('This session has not started yet.');

    await startedMinutesAgo(fixture, 24);
    expect((await post(fixture, fixture.first, { body: 'inside the 25 minutes' })).status).toBe(201);

    await startedMinutesAgo(fixture, 26);
    const late = await post(fixture, fixture.mentor, { body: 'after the end' });
    expect(late.status).toBe(409);
    expect(late.body.error?.message).toBe('This session has ended.');
    const after = await read(fixture, fixture.mentor);
    expect(after.body.data).toMatchObject({ window: 'ended' });
    expect(after.body.data!.messages.map(m => m.body)).toEqual(['inside the 25 minutes']);
    expect(await stored(fixture)).toBe(1);
  });
});
