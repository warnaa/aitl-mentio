import { createHash } from 'node:crypto';
import { inject } from 'vitest';
import { AuthRateLimit, Booking, entities, MentorProfile, MikroORM, Notification, PaymentAttempt, PaymentResolution, ProcessedWebhookEvent, SessionMessage, Slot, User, type EntityManager } from '@devmentor/db';
import { CSRF_HEADERS } from './mentor';

export const BOOKING_START = '2099-11-06T12:00:00.000Z';
export interface BookingPayload {
  id: string;
  slotId: string;
  mentorProfileId: string;
  lengthMinutes: number;
  priceCents: number;
  currency: string;
  status: string;
  startsAt: string;
  expiresAt: string;
}
export interface BookingFixture {
  base: string;
  em: EntityManager;
  mentor: Record<string, string>;
  first: Record<string, string>;
  second: Record<string, string>;
  firstId: string;
  secondId: string;
  mentorId: string;
  profileId: string;
  slug: string;
  slot: { id: string; startsAt: string };
}

/** Real mock-provider OAuth, used only for fixture authentication; no credential is logged. */
export async function bookingPersona(base: string, login: string) {
  const start = await fetch(`${base}/api/auth/github?login=${encodeURIComponent(login)}`, { redirect: 'manual' });
  const location = start.headers.get('location');
  const state = start.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
  if (!location || !state) throw new Error(`OAuth fixture start answered ${start.status}`);
  const callback = await fetch(new URL(location, base), { redirect: 'manual', headers: { cookie: state } });
  const cookie = callback.headers.getSetCookie().find(value => value.startsWith('devmentor_session='))?.split(';')[0];
  if (!cookie) throw new Error(`OAuth fixture callback answered ${callback.status} without a session`);
  return { cookie, ...CSRF_HEADERS, 'content-type': 'application/json' };
}

export const postBooking = (fixture: BookingFixture, slotId = fixture.slot.id, lengthMinutes = 25, headers = fixture.first, extra: Record<string, unknown> = {}) =>
  fetch(`${fixture.base}/api/bookings`, { method: 'POST', headers, body: JSON.stringify({ ...extra, slotId, lengthMinutes }) });

export async function publishBookingSlot(fixture: BookingFixture, startsAt: string) {
  const response = await fetch(`${fixture.base}/api/availability/slots`, {
    method: 'POST', headers: fixture.mentor, body: JSON.stringify({ startsAt }),
  });
  if (response.status !== 200) throw new Error(`Slot fixture answered ${response.status}`);
  return (await response.json()).data as BookingFixture['slot'];
}

/** Owns only synthetic fixture rows; the behavior under test always crosses the real HTTP app. */
export async function withBookingFixture(caseId: string, run: (fixture: BookingFixture) => Promise<void>) {
  const base = inject('integrationBaseUrl');
  const orm = await MikroORM.init({ entities, clientUrl: inject('integrationDatabaseUrl') });
  await orm.connect();
  const em = orm.em.fork();
  const prefix = `booking-${caseId}-${process.pid}`;
  const logins = [`${prefix}-mentor`, `${prefix}-first`, `${prefix}-second`];
  let profileId: string | undefined;
  const userIds: string[] = [];
  try {
    const headers = await Promise.all(logins.map(login => bookingPersona(base, login)));
    const mentor = headers[0]!;
    const first = headers[1]!;
    const second = headers[2]!;
    const users = await Promise.all(logins.map(login => em.findOneOrFail(User, { githubLogin: login })));
    userIds.push(...users.map(user => user.id));
    const mentorUser = users[0]!;
    // Setup uses the direct fixture layer, avoiding unrelated invitation/operator work in every case.
    await em.nativeUpdate(User, { id: mentorUser.id }, { roles: ['mentee', 'mentor'] });
    const profile = em.create(MentorProfile, {
      user: mentorUser, slug: prefix, publishedAt: new Date('2026-11-05T12:00:00Z'),
      publicWorkUrl: 'https://github.com/devmentor-fixture', bio: 'Synthetic booking mentor.',
      headline: 'Booking fixture', stackTags: ['react'], yearsOfExperience: 5,
      initialPublishDueAt: null, lastPublishedAvailabilityAt: null, price25Cents: 8000, price50Cents: 16000,
    });
    em.persist(profile); await em.flush(); profileId = profile.id;
    const fixture: BookingFixture = {
      base, em, mentor, first, second, firstId: users[1]!.id, secondId: users[2]!.id,
      mentorId: mentorUser.id, profileId, slug: prefix, slot: { id: '', startsAt: BOOKING_START },
    };
    fixture.slot = await publishBookingSlot(fixture, BOOKING_START);
    await run(fixture);
  } finally {
    try {
      // FK history is deliberately restrictive: release owned bookings before their slots/accounts.
      if (profileId) {
        const bookings = await em.find(Booking, { mentorProfile: profileId });
        const bookingIds = bookings.map(booking => booking.id);
        if (bookingIds.length) {
          await em.nativeDelete(Notification, { booking: { $in: bookingIds } });
          await em.nativeDelete(SessionMessage, { booking: { $in: bookingIds } });
          const attempts = await em.find(PaymentAttempt, { booking: { $in: bookingIds } });
          const attemptIds = attempts.map(attempt => attempt.id);
          if (attemptIds.length) await em.nativeDelete(PaymentResolution, { attempt: { $in: attemptIds } });
          await em.nativeDelete(ProcessedWebhookEvent, { booking: { $in: bookingIds } });
          await em.nativeDelete(PaymentAttempt, { booking: { $in: bookingIds } });
        }
        await em.nativeDelete(Booking, { mentorProfile: profileId });
        await em.nativeDelete(Slot, { mentorProfile: profileId });
        await em.nativeDelete(MentorProfile, { id: profileId });
      }
      for (const userId of userIds) {
        for (const scope of ['bookings', 'checkout']) {
          const key = `${scope}:account:${createHash('sha256').update(userId).digest('hex')}`;
          await em.nativeDelete(AuthRateLimit, { key });
        }
      }
      // Include partially created OAuth personas when setup failed before collecting their IDs.
      await em.nativeDelete(User, { githubLogin: { $in: logins } });
    } finally {
      await orm.close();
    }
  }
}
