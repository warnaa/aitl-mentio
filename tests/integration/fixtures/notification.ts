import { readFile } from 'node:fs/promises';
import { Booking, MentorProfile, Notification, PaymentAttempt, PaymentResolution, ProcessedWebhookEvent, Slot, User } from '@devmentor/db';
import { APP_LOG_PATH } from '../mail';
import { paymentEvent, postCheckout, postPaymentEvent, storedBooking, type PaymentFixture } from './payment';
import { postBooking, publishBookingSlot, type BookingPayload } from './booking';

export interface NotificationPayload {
  unreadCount: number;
  items: Array<{ id: string; kind: string; audience: string; counterpartName: string; startsAt: string; lengthMinutes: number; readAt: string | null }>;
}

export const listNotifications = async (fixture: PaymentFixture, headers: Record<string, string>) => {
  const response = await fetch(`${fixture.base}/api/notifications`, { headers });
  return { status: response.status, body: await response.json() as { ok: boolean; data: NotificationPayload } };
};

export const postRead = (fixture: PaymentFixture, headers: Record<string, string>, ids: string[]) =>
  fetch(`${fixture.base}/api/notifications`, { method: 'POST', headers, body: JSON.stringify({ ids }) });

/** Confirms the fixture booking through the real checkout and a mock-provider signed callback. */
export async function confirmBooking(fixture: PaymentFixture) {
  if ((await postCheckout(fixture)).status !== 200) throw new Error('Checkout fixture did not open');
  const event = await paymentEvent(fixture, `evt_notify_${fixture.booking.id}`);
  if ((await postPaymentEvent(fixture, event)).status !== 200) throw new Error('Payment callback fixture was not accepted');
  if ((await storedBooking(fixture)).status !== 'confirmed') throw new Error('Booking fixture did not confirm');
  return event;
}

/** Every `mail.sent` line the app logged at or after `since` for one address. */
export async function mailsTo(address: string, since: number) {
  const log = await readFile(APP_LOG_PATH, 'utf8').catch(() => '');
  return log.split('\n').filter(line => line.includes('"mail.sent"')).flatMap(line => {
    try {
      const entry = JSON.parse(line) as { to?: string; subject?: string; text?: string; time?: number };
      return entry.to?.toLowerCase() === address.toLowerCase() && Number(entry.time) >= since ? [{ subject: entry.subject ?? '', text: entry.text ?? '' }] : [];
    } catch { return []; }
  });
}

export const emailOf = async (fixture: PaymentFixture, userId: string) => (await fixture.em.fork().findOneOrFail(User, { id: userId })).email;

/** A second, independently owned mentor offer, booked by the fixture's first mentee. */
export async function withSecondMentorBooking(fixture: PaymentFixture, run: (other: BookingPayload) => Promise<void>) {

  const em = fixture.em.fork();

  await em.nativeUpdate(User, { id: fixture.secondId }, { roles: ['mentee', 'mentor'] });
  const mentorUser = await em.findOneOrFail(User, { id: fixture.secondId });
  const profile = em.create(MentorProfile, {
    user: mentorUser, slug: `${fixture.slug}-other`, publishedAt: new Date('2026-11-05T12:00:00Z'),
    publicWorkUrl: 'https://github.com/devmentor-fixture', bio: 'Second synthetic mentor.',
    headline: 'Isolation fixture', stackTags: ['react'], yearsOfExperience: 5,
    initialPublishDueAt: null, lastPublishedAvailabilityAt: null, price25Cents: 8000, price50Cents: 16000,
  });
  em.persist(profile);
  await em.flush();

  try {
    const other = { ...fixture, mentor: fixture.second, profileId: profile.id };
    const slot = await publishBookingSlot(other, '2099-11-07T12:00:00.000Z');

    const response = await postBooking(other, slot.id, 25, fixture.first);
    if (response.status !== 201) throw new Error(`Second mentor booking answered ${response.status}`);

    await run((await response.json()).data as BookingPayload);
  } finally {
    const bookings = await em.find(Booking, { mentorProfile: profile.id });
    const ids = bookings.map(booking => booking.id);
    if (ids.length) {
      await em.nativeDelete(Notification, { booking: { $in: ids } });
      const attempts = await em.find(PaymentAttempt, { booking: { $in: ids } });
      if (attempts.length) await em.nativeDelete(PaymentResolution, { attempt: { $in: attempts.map(attempt => attempt.id) } });
      await em.nativeDelete(ProcessedWebhookEvent, { booking: { $in: ids } });
      await em.nativeDelete(PaymentAttempt, { booking: { $in: ids } });
    }
    await em.nativeDelete(Booking, { mentorProfile: profile.id });
    await em.nativeDelete(Slot, { mentorProfile: profile.id });
    await em.nativeDelete(MentorProfile, { id: profile.id });
  }
}
