import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { AuthRateLimit, Booking, entities, MentorProfile, MikroORM, PaymentAttempt, PaymentResolution, ProcessedWebhookEvent, Slot, User } from '@devmentor/db';
import { runAgentBrowser, closeAgentBrowser } from '../../../tests/integration/agent-browser.ts';

const state = JSON.parse(await readFile('.ai/qa/test-env.json', 'utf8'));
if (state.status !== 'running') throw new Error('QA app is not running');
if (state.mode !== 'ephemeral' || !state.startedByThisRepo || state.projectRoot !== process.cwd() || !['127.0.0.1','localhost','[::1]'].includes(new URL(state.baseUrl).hostname)) throw new Error('Only this checkout owned disposable loopback QA environment is allowed');
process.kill(state.ownerPid, 0);
const { fingerprint } = await import(pathToFileURL(resolve('.ai/scripts/test-env.mjs')).href);
if (await fingerprint() !== state.sourceFingerprint) throw new Error('QA source fingerprint is stale');
if (Date.now() - Date.parse(state.startedAt) > 600_000) throw new Error('QA descriptor TTL expired');
const base = state.baseUrl;
const health = await fetch(`${base}/api/health`);
if ((await health.json()).database !== 'up') throw new Error('QA database is unavailable');
const orm = await MikroORM.init({ entities, clientUrl: state.services.find(service => service.type === 'postgres').url });
await orm.connect(); const em = orm.em.fork();
const prefix = `report-observe-${process.pid}`;
const menteeLogin = `${prefix}-mentee`;
const fixtureEmails = [`${prefix}-mentor@devmentor.test`, `${prefix}-paid-mentee@devmentor.test`];
const evidence = resolve('.ai/qa/PAYMENTS'); await mkdir(evidence, { recursive: true });
const browsers = [];
let profileId;
async function persona(login) {
  const start = await fetch(`${base}/api/auth/github?login=${encodeURIComponent(login)}`, { redirect: 'manual' });
  const location = start.headers.get('location');
  const stateCookie = start.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
  const callback = await fetch(new URL(location, base), { redirect: 'manual', headers: { cookie: stateCookie } });
  const cookie = callback.headers.getSetCookie().find(value => value.startsWith('devmentor_session='))?.split(';')[0];
  if (!cookie) throw new Error(`Synthetic sign-in failed: ${callback.status}`);
  return { cookie, 'x-devmentor-request': '1', 'content-type': 'application/json' };
}
async function capture(session, name, width = 1280) {
  await runAgentBrowser(session, 'set', 'viewport', String(width), '900');
  await writeFile(resolve(evidence, `${name}-snapshot.txt`), await runAgentBrowser(session, 'snapshot'));
  await runAgentBrowser(session, 'screenshot', resolve(evidence, `${name}.png`), '--full');
  return Number(await runAgentBrowser(session, 'eval', 'document.documentElement.scrollWidth - document.documentElement.clientWidth'));
}
const summary = { sourceValidated: true, viewports: {}, faults: {} };
try {
  const operator = await persona('mock-operator'); const mentee = await persona(menteeLogin);
  const unsigned = await fetch(`${base}/api/payments/report`);
  const denied = await fetch(`${base}/api/payments/report`, { headers: mentee });
  const empty = await fetch(`${base}/api/payments/report`, { headers: operator }); const emptyBody = await empty.json();
  if (unsigned.status !== 401 || denied.status !== 403 || empty.status !== 200) throw new Error('Report API guards differ from the contract');
  if (emptyBody.data.paidSessionCount !== 0 || emptyBody.data.medianBookingToStartMinutes !== null) throw new Error('Fresh report is not empty');
  summary.api = { operator: empty.status, anonymous: unsigned.status, mentee: denied.status, emptyCount: emptyBody.data.paidSessionCount, emptyMedian: emptyBody.data.medianBookingToStartMinutes };
  const operatorBrowser = `${prefix}-operator`; browsers.push(operatorBrowser);
  await runAgentBrowser(operatorBrowser, 'open', `${base}/api/auth/github?login=mock-operator`);
  await runAgentBrowser(operatorBrowser, 'wait', '--text', 'No recorded payments yet');
  summary.viewports.operatorEmptyDesktop = await capture(operatorBrowser, 'PAYMENTS-operator-empty-desktop');
  summary.viewports.operatorEmptyMobile = await capture(operatorBrowser, 'PAYMENTS-operator-empty-mobile', 320);

  const menteeBrowser = `${prefix}-mentee`; browsers.push(menteeBrowser);
  await runAgentBrowser(menteeBrowser, 'open', `${base}/api/auth/github?login=${encodeURIComponent(menteeLogin)}`);
  await runAgentBrowser(menteeBrowser, 'wait', '--text', 'No sessions yet');
  summary.viewports.participantEmpty = await capture(menteeBrowser, 'PAYMENTS-participant-empty-desktop');
  await runAgentBrowser(menteeBrowser, 'eval', `(() => { const original = window.fetch.bind(window); window.__paymentQaRefresh = 0; window.fetch = (...args) => { if (String(args[0]).includes('/api/bookings')) window.__paymentQaRefresh++; return original(...args); }; return true; })()`);
  const refreshSnapshot = await runAgentBrowser(menteeBrowser, 'snapshot');
  const refreshRef = refreshSnapshot.match(/button "Check payment status" \[ref=(e\d+)\]/)?.[1];
  if (!refreshRef) throw new Error('Observed refresh button has no current browser ref');
  await runAgentBrowser(menteeBrowser, 'focus', `@${refreshRef}`);
  await runAgentBrowser(menteeBrowser, 'press', 'Enter');
  summary.keyboardRefreshRequests = Number(await runAgentBrowser(menteeBrowser, 'eval', 'window.__paymentQaRefresh'));
  if (summary.keyboardRefreshRequests < 1) throw new Error('Keyboard Enter did not activate payment refresh');

  await em.findOneOrFail(User, { githubLogin: menteeLogin });
  const mentor = em.create(User, { email: fixtureEmails[0], displayName: 'A deliberately long synthetic mentor name for payment reconciliation', roles: ['mentor'] });
  const paidMentee = em.create(User, { email: fixtureEmails[1], displayName: 'Synthetic reporting payer', roles: ['mentee'] });
  const profile = em.create(MentorProfile, { user: mentor, headline: 'Synthetic reporting mentor', slug: prefix, publishedAt: new Date(), publicWorkUrl: 'https://github.com/devmentor-fixture', bio: 'Synthetic reporting and review fixture.', stackTags: ['react'], yearsOfExperience: 5, price25Cents: 8000, price50Cents: 16000 });
  em.persist([mentor, paidMentee, profile]); await em.flush(); profileId = profile.id;
  const anchor = new Date();
  for (const [offsetMinutes, durationMinutes] of [[-120, 180], [-8 * 24 * 60, 7 * 24 * 60]]) {
    const bookedAt = new Date(anchor.getTime() + offsetMinutes * 60_000); const startsAt = new Date(bookedAt.getTime() + durationMinutes * 60_000);
    const slot = em.create(Slot, { mentorProfile: profile, startsAt });
    const id = crypto.randomUUID();
    const booking = em.create(Booking, { slot, mentorProfile: profile, mentee: paidMentee, lengthMinutes: 25, priceCents: 8000, currency: 'PLN', status: 'confirmed', startsAt, bookedAt, paidAt: bookedAt, amountPaidCents: 8000, stripeCheckoutSessionId: `cs_report_${id}`, stripePaymentIntentId: `pi_report_${id}` });
    em.persist([slot, booking]);
  }
  const reviewSlot = em.create(Slot, { mentorProfile: profile, startsAt: new Date('2099-11-06T12:00:00Z') }); em.persist(reviewSlot); await em.flush();
  const reservation = await fetch(`${base}/api/bookings`, { method: 'POST', headers: mentee, body: JSON.stringify({ slotId: reviewSlot.id, lengthMinutes: 25 }) });
  if (reservation.status !== 201) throw new Error(`Review reservation failed: ${reservation.status}`);
  const booking = (await reservation.json()).data;
  const checkout = await fetch(`${base}/api/bookings/${booking.id}/checkout`, { method: 'POST', headers: mentee, body: '{}' });
  if (checkout.status !== 200) throw new Error(`Review Checkout failed: ${checkout.status}`);
  const attempt = await em.fork().findOneOrFail(PaymentAttempt, { booking: booking.id });
  const mismatch = { id: `evt_review_${prefix}`, type: 'checkout.session.completed', session: { id: attempt.sessionId, url: null, bookingId: booking.id, attemptId: attempt.id, amountCents: 7999, currency: 'pln', paymentIntentId: `pi_review_${prefix}`, paid: true, status: 'complete', livemode: false, refundedCents: 0 } };
  const callback = await fetch(`${base}/api/payments/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 'devmentor-mock-payment' }, body: JSON.stringify(mismatch) });
  if (callback.status !== 200) throw new Error(`Review callback failed: ${callback.status}`);
  const populated = await fetch(`${base}/api/payments/report`, { headers: operator }); const report = (await populated.json()).data;
  if (report.paidSessionCount !== 2 || report.timingSampleCount !== 2 || report.medianBookingToStartMinutes !== 5130) throw new Error('Report count/median mismatch');
  summary.report = { timezone: report.timezone, paidSessionCount: report.paidSessionCount, timingSampleCount: report.timingSampleCount, medianBookingToStartMinutes: report.medianBookingToStartMinutes, bookingWeeks: report.bookingWeeks, sessionStartWeeks: report.sessionStartWeeks };
  await runAgentBrowser(operatorBrowser, 'open', `${base}/admin`);
  await runAgentBrowser(operatorBrowser, 'wait', '--text', '5,130 minutes');
  await runAgentBrowser(operatorBrowser, 'wait', '--text', 'amount_mismatch');
  const populatedSnapshot = await runAgentBrowser(operatorBrowser, 'snapshot');
  if (!populatedSnapshot.includes('By booking week') || !populatedSnapshot.includes('By session-start week')) throw new Error('A weekly report label is missing');
  summary.viewports.operatorPopulatedDesktop = await capture(operatorBrowser, 'PAYMENTS-operator-populated-review-desktop');
  summary.viewports.operatorPopulatedMobile = await capture(operatorBrowser, 'PAYMENTS-operator-populated-review-mobile', 320);
  await runAgentBrowser(menteeBrowser, 'open', `${base}/home`);
  await runAgentBrowser(menteeBrowser, 'wait', '--text', 'Your payment needs review.');
  summary.viewports.participantReviewDesktop = await capture(menteeBrowser, 'PAYMENTS-participant-review-desktop');
  summary.viewports.participantReviewMobile = await capture(menteeBrowser, 'PAYMENTS-participant-review-mobile', 320);
  await runAgentBrowser(menteeBrowser, 'open', `${base}/admin`);
  summary.nonoperatorAdminPath = new URL(await runAgentBrowser(menteeBrowser, 'get', 'url')).pathname;
  if (summary.nonoperatorAdminPath !== '/home') throw new Error('Nonoperator reached the admin page');
  await capture(menteeBrowser, 'PAYMENTS-nonoperator-admin-denied', 320);

  for (const kind of ['loading', 'error']) {
    const session = `${prefix}-${kind}`; browsers.push(session);
    await runAgentBrowser(session, 'open', `${base}/api/auth/github?login=${encodeURIComponent(menteeLogin)}`);
    await runAgentBrowser(session, 'wait', '--text', 'Your payment needs review.');
    const response = kind === 'loading' ? 'new Promise(() => {})' : `Promise.resolve(new Response(JSON.stringify({ ok: false, error: { code: 'service_unavailable', message: 'Synthetic QA booking request failure.' } }), { status: 503, headers: { 'content-type': 'application/json' } }))`;
    await runAgentBrowser(session, 'eval', `(() => { const original = window.fetch.bind(window); window.__paymentQaInjected = '${kind}'; window.fetch = (...args) => String(args[0]).includes('/api/bookings') ? ${response} : original(...args); return true; })();`);
    const beforeRefresh = await runAgentBrowser(session, 'snapshot');
    const ref = beforeRefresh.match(/button "Check payment status" \[ref=(e\d+)\]/)?.[1];
    if (!ref) throw new Error('Fault-state refresh has no observed browser ref');
    await runAgentBrowser(session, 'focus', `@${ref}`);
    await runAgentBrowser(session, 'press', 'Enter');
    if (kind === 'error') await runAgentBrowser(session, 'wait', '--text', 'Synthetic QA booking request failure.');
    else if (!/button "Check payment status"[^\n]*disabled/.test(await runAgentBrowser(session, 'snapshot'))) throw new Error('Loading refresh did not disable the button');
    summary.faults[kind] = { applied: await runAgentBrowser(session, 'eval', 'window.__paymentQaInjected'), rendering: kind === 'loading' ? 'reload keeps prior data and disables refresh' : 'error feedback replaces booking content', overflow: await capture(session, `PAYMENTS-participant-fault-injected-${kind}`, 320) };
  }
  if (Object.values(summary.viewports).some(value => value !== 0) || Object.values(summary.faults).some(value => value.overflow !== 0)) throw new Error('A captured page overflows its viewport');
  await writeFile(resolve(evidence, 'PAYMENTS-report-state-exploration.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
} finally {
  for (const session of browsers) await closeAgentBrowser(session);
  try {
    if (profileId) {
      const bookings = await em.find(Booking, { mentorProfile: profileId }); const bookingIds = bookings.map(row => row.id);
      const attempts = await em.find(PaymentAttempt, { booking: { $in: bookingIds } }); const attemptIds = attempts.map(row => row.id);
      if (attemptIds.length) await em.nativeDelete(PaymentResolution, { attempt: { $in: attemptIds } });
      await em.nativeDelete(ProcessedWebhookEvent, { booking: { $in: bookingIds } }); await em.nativeDelete(PaymentAttempt, { booking: { $in: bookingIds } });
      await em.nativeDelete(Booking, { mentorProfile: profileId }); await em.nativeDelete(Slot, { mentorProfile: profileId }); await em.nativeDelete(MentorProfile, { id: profileId });
    }
    const mentee = await em.findOne(User, { githubLogin: menteeLogin });
    if (mentee) for (const scope of ['bookings', 'checkout']) await em.nativeDelete(AuthRateLimit, { key: `${scope}:account:${createHash('sha256').update(mentee.id).digest('hex')}` });
    await em.nativeDelete(User, { githubLogin: menteeLogin }); await em.nativeDelete(User, { email: { $in: fixtureEmails } });
  } finally { await orm.close(); }
}
