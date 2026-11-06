import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Booking, entities, MentorProfile, MikroORM, PaymentAttempt, PaymentResolution, ProcessedWebhookEvent, Slot, User, AuthRateLimit } from '@devmentor/db';
import { createHash } from 'node:crypto';
import { runAgentBrowser, closeAgentBrowser } from '../../../tests/integration/agent-browser.ts';

const descriptor = JSON.parse(await readFile('.ai/qa/test-env.json', 'utf8'));
if (descriptor.status !== 'running') throw new Error('QA descriptor is not running');
if (descriptor.mode !== 'ephemeral' || !descriptor.startedByThisRepo || descriptor.projectRoot !== process.cwd() || !['127.0.0.1','localhost','[::1]'].includes(new URL(descriptor.baseUrl).hostname)) throw new Error('Only this checkout owned disposable loopback QA environment is allowed');
process.kill(descriptor.ownerPid, 0);
const base = descriptor.baseUrl;
const health = await fetch(`${base}/api/health`);
if ((await health.json()).database !== 'up') throw new Error('QA database is not ready');
const orm = await MikroORM.init({ entities, clientUrl: descriptor.services.find(service => service.type === 'postgres').url });
await orm.connect();
const em = orm.em.fork();
const prefix = `payment-observe-${process.pid}`;
const logins = ['mentor', 'mentee', 'other'].map(persona => `${prefix}-${persona}`);
const browserSessions = [];
const unknownEventId = `evt_unknown_${prefix}`;
let profileId;
async function persona(login) {
  const start = await fetch(`${base}/api/auth/github?login=${encodeURIComponent(login)}`, { redirect: 'manual' });
  const location = start.headers.get('location');
  const state = start.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
  const callback = await fetch(new URL(location, base), { redirect: 'manual', headers: { cookie: state } });
  const cookie = callback.headers.getSetCookie().find(value => value.startsWith('devmentor_session='))?.split(';')[0];
  if (!cookie) throw new Error(`Synthetic sign-in returned ${callback.status}`);
  return { cookie, 'x-devmentor-request': '1', 'content-type': 'application/json' };
}
const evidence = resolve('.ai/qa/PAYMENTS');
await mkdir(evidence, { recursive: true });
try {
  const [mentor, mentee, other] = await Promise.all(logins.map(persona));
  const users = await Promise.all(logins.map(githubLogin => em.findOneOrFail(User, { githubLogin })));
  await em.nativeUpdate(User, { id: users[0].id }, { roles: ['mentee', 'mentor'] });
  const profile = em.create(MentorProfile, { user: users[0], slug: prefix, publishedAt: new Date('2026-11-05T12:00:00Z'), publicWorkUrl: 'https://github.com/devmentor-fixture', bio: 'Synthetic payment mentor.', headline: 'Payment fixture mentor', stackTags: ['react'], yearsOfExperience: 5, price25Cents: 8000, price50Cents: 16000 });
  em.persist(profile); await em.flush(); profileId = profile.id;
  const publish = await fetch(`${base}/api/availability/slots`, { method: 'POST', headers: mentor, body: JSON.stringify({ startsAt: '2099-11-06T12:00:00Z' }) });
  if (publish.status !== 200) throw new Error(`Observed slot creation status ${publish.status}`);
  const slot = (await publish.json()).data;
  const reserve = await fetch(`${base}/api/bookings`, { method: 'POST', headers: mentee, body: JSON.stringify({ slotId: slot.id, lengthMinutes: 25 }) });
  if (reserve.status !== 201) throw new Error(`Observed booking status ${reserve.status}`);
  const booking = (await reserve.json()).data;
  const checkout = await fetch(`${base}/api/bookings/${booking.id}/checkout`, { method: 'POST', headers: mentee, body: '{}' });
  if (checkout.status !== 200) throw new Error(`Observed checkout status ${checkout.status}`);
  const checkoutBody = await checkout.json();
  const attempt = await em.fork().findOneOrFail(PaymentAttempt, { booking: booking.id });
  const event = { id: `evt_paid_${prefix}`, type: 'checkout.session.completed', session: { id: attempt.sessionId, url: null, bookingId: booking.id, attemptId: attempt.id, amountCents: 8000, currency: 'pln', paymentIntentId: `pi_${prefix}`, paid: true, status: 'complete', livemode: false, refundedCents: 0 } };
  const send = (data, signature = 'devmentor-mock-payment') => fetch(`${base}/api/payments/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body: JSON.stringify(data) });
  const bad = await send(event, 'invalid-signature');
  const foreign = await fetch(`${base}/api/bookings/${booking.id}/checkout`, { method: 'POST', headers: other, body: '{}' });
  const menteeSession = `${prefix}-browser-mentee`; browserSessions.push(menteeSession);
  await runAgentBrowser(menteeSession, 'open', `${base}/api/auth/github?login=${encodeURIComponent(logins[1])}`);
  await runAgentBrowser(menteeSession, 'wait', '--text', 'Waiting for payment confirmation.');
  await writeFile(resolve(evidence, 'PAYMENTS-observed-pending-snapshot.txt'), await runAgentBrowser(menteeSession, 'snapshot'));
  await runAgentBrowser(menteeSession, 'screenshot', resolve(evidence, 'PAYMENTS-pending-desktop.png'), '--full');
  const paid = await send(event); const replay = await send(event);
  const list = await fetch(`${base}/api/bookings?role=mentee`, { headers: mentee });
  const mentorList = await fetch(`${base}/api/bookings?role=mentor`, { headers: mentor });
  const listBody = await list.json(); const mentorListBody = await mentorList.json();
  const stored = await em.fork().findOneOrFail(Booking, { id: booking.id });
  await runAgentBrowser(menteeSession, 'open', `${base}/home?booked=${booking.id}`);
  await runAgentBrowser(menteeSession, 'wait', '--text', 'Payment verified. Your session is confirmed.');
  await writeFile(resolve(evidence, 'PAYMENTS-observed-confirmed-mentee-snapshot.txt'), await runAgentBrowser(menteeSession, 'snapshot'));
  await runAgentBrowser(menteeSession, 'screenshot', resolve(evidence, 'PAYMENTS-confirmed-mentee-desktop.png'), '--full');
  await runAgentBrowser(menteeSession, 'set', 'viewport', '320', '900');
  const overflow = Number(await runAgentBrowser(menteeSession, 'eval', 'document.documentElement.scrollWidth - document.documentElement.clientWidth'));
  if (overflow > 0) throw new Error(`Mentee booking screen overflows 320px by ${overflow}`);
  await runAgentBrowser(menteeSession, 'screenshot', resolve(evidence, 'PAYMENTS-confirmed-mentee-mobile.png'), '--full');
  const mentorSession = `${prefix}-browser-mentor`; browserSessions.push(mentorSession);
  await runAgentBrowser(mentorSession, 'open', `${base}/api/auth/github?login=${encodeURIComponent(logins[0])}`);
  await runAgentBrowser(mentorSession, 'wait', '--text', 'Payment verified. Your session is confirmed.');
  await writeFile(resolve(evidence, 'PAYMENTS-observed-confirmed-mentor-snapshot.txt'), await runAgentBrowser(mentorSession, 'snapshot'));
  await runAgentBrowser(mentorSession, 'screenshot', resolve(evidence, 'PAYMENTS-confirmed-mentor-desktop.png'), '--full');
  const unknown = { ...event, id: unknownEventId, session: { ...event.session, id: `cs_unknown_${prefix}`, bookingId: 'missing-provider-metadata', attemptId: 'not-a-uuid' } };
  const unknownResponse = await send(unknown);
  const operator = await persona('mock-operator');
  const review = await fetch(`${base}/api/payments/review`, { headers: operator });
  const reviewBody = await review.json();
  const summary = { reserve: reserve.status, checkout: checkout.status, checkoutFields: Object.keys(checkoutBody.data), badSignature: bad.status, foreignCheckout: foreign.status, paid: paid.status, replay: replay.status, storedStatus: stored.status, amountPaidCents: stored.amountPaidCents, markers: await em.count(ProcessedWebhookEvent, { eventId: event.id }), ownListContainsConfirmed: listBody.data.some(row => row.id === booking.id && row.status === 'confirmed'), mentorListContainsConfirmed: mentorListBody.data.some(row => row.id === booking.id && row.status === 'confirmed'), unknownMetadata: unknownResponse.status, operatorSeesUnknown: reviewBody.data.some(row => row.sessionId === unknown.session.id && row.reason === 'unknown_provider_session'), mobileOverflow: overflow };
  console.log(JSON.stringify(summary));
  await writeFile(resolve(evidence, 'PAYMENTS-api-exploration.json'), JSON.stringify(summary, null, 2) + '\n');
} finally {
  for (const session of browserSessions) await closeAgentBrowser(session);
  try {
    await em.nativeDelete(ProcessedWebhookEvent, { eventId: unknownEventId });
    if (profileId) {
      const bookings = await em.find(Booking, { mentorProfile: profileId }); const bookingIds = bookings.map(booking => booking.id);
      const attempts = await em.find(PaymentAttempt, { booking: { $in: bookingIds } }); const attemptIds = attempts.map(attempt => attempt.id);
      if (attemptIds.length) await em.nativeDelete(PaymentResolution, { attempt: { $in: attemptIds } });
      await em.nativeDelete(ProcessedWebhookEvent, { booking: { $in: bookingIds } });
      await em.nativeDelete(PaymentAttempt, { booking: { $in: bookingIds } });
      await em.nativeDelete(Booking, { mentorProfile: profileId }); await em.nativeDelete(Slot, { mentorProfile: profileId }); await em.nativeDelete(MentorProfile, { id: profileId });
    }
    const users = await em.find(User, { githubLogin: { $in: logins } });
    for (const user of users) for (const scope of ['bookings', 'checkout']) await em.nativeDelete(AuthRateLimit, { key: `${scope}:account:${createHash('sha256').update(user.id).digest('hex')}` });
    await em.nativeDelete(User, { githubLogin: { $in: logins } });
  } finally { await orm.close(); }
}
