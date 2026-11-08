/** Local synthetic exploration. Runtime state/cookies stay in ignored test-env-runtime. */
import { readFile, writeFile } from 'node:fs/promises';
import { Booking, MentorProfile, Slot, User, SessionNote, Notification, entities, MikroORM } from '@devmentor/db';
import { runAgentBrowser, signInAs, closeAgentBrowser } from '../../../tests/integration/agent-browser';

const descriptor = JSON.parse(await readFile('.ai/qa/test-env.json', 'utf8'));
if (descriptor.status !== 'running' || descriptor.projectRoot !== process.cwd()) throw new Error('Start this checkout shared test environment first');
const base = descriptor.baseUrl as string;
const runtime = '.ai/qa/test-env-runtime/notes-fixture.json';
const sessions = ['notes-mentor', 'notes-mentee', 'notes-outsider'];
const orm = await MikroORM.init({ entities, clientUrl: descriptor.services[0].url });
await orm.connect();
const em = orm.em.fork();
const [action = 'setup'] = process.argv.slice(2);
try {
  if (action === 'setup') {
    const logins = ['notes-mentor', 'notes-mentee', 'notes-outsider'];
    for (let i = 0; i < logins.length; i++) await signInAs(sessions[i]!, base, logins[i]!);
    const mentor = await em.findOneOrFail(User, { githubLogin: logins[0] });
    const mentee = await em.findOneOrFail(User, { githubLogin: logins[1] });
    mentor.roles = ['mentee', 'mentor'];
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 60_000);
    const profile = em.create(MentorProfile, { user: mentor, slug: `notes-${now.getTime()}`, publishedAt: now, publicWorkUrl: 'https://example.test/synthetic', bio: 'Synthetic local QA', headline: 'Synthetic note mentor', stackTags: ['react'], yearsOfExperience: 5, initialPublishDueAt: null, lastPublishedAvailabilityAt: null, price25Cents: 8000, price50Cents: 16000 });
    const slot = em.create(Slot, { mentorProfile: profile, startsAt: start, removedAt: null });
    const booking = em.create(Booking, { slot, mentee, mentorProfile: profile, startsAt: start, lengthMinutes: 25, priceCents: 8000, currency: 'PLN', status: 'confirmed', expiresAt: null, bookedAt: now, stripeCheckoutSessionId: null, stripePaymentIntentId: null, paidAt: null, amountPaidCents: null, paymentPending: false, writtenAnswer: null, writtenAnswerAt: null });
    em.persist([mentor, profile, slot, booking]); await em.flush();
    await writeFile(runtime, JSON.stringify({ bookingId: booking.id, base }));
    for (const session of sessions) {
      await runAgentBrowser(session, 'open', `${base}/sessions/${booking.id}`);
      console.log(session, await runAgentBrowser(session, 'snapshot', '-i'));
    }
  } else {
    const state = JSON.parse(await readFile(runtime, 'utf8'));
    if (state.base !== base) throw new Error('Fixture belongs to another environment');
    const booking = await em.findOneOrFail(Booking, { id: state.bookingId });
    if (action === 'answer') {
      booking.writtenAnswer = 'Synthetic written answer: validate at the HTTP boundary.';
      booking.writtenAnswerAt = new Date(); await em.flush();
    } else if (action === 'clear-note') {
      await em.nativeDelete(Notification, { booking: booking.id, kind: 'note_awaiting_approval' });
      await em.nativeDelete(SessionNote, { booking: booking.id });
    } else if (action === 'close') {
      for (const session of sessions) await closeAgentBrowser(session);
    }
    if (action !== 'close') {
      for (const session of sessions.slice(0, 2)) {
        await runAgentBrowser(session, 'open', `${base}/sessions/${booking.id}`);
        console.log(session, await runAgentBrowser(session, 'snapshot', '-i'));
      }
    }
  }
} finally { await orm.close(); }
