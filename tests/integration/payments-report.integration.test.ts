import { expect, it } from 'vitest';
import { Booking, MentorProfile, ProcessedWebhookEvent, Slot, User } from '@devmentor/db';
import { PaymentReportService } from '../../packages/core/src/services/payments/payment-report.service';
import { withPaymentDatabaseFixture } from './fixtures/payment-database';

it('PAYMENTS-019 counts recorded payments once in both Warsaw week views and computes the valid timing median', async () => {
  await withPaymentDatabaseFixture('019', async fixture => {
    fixture.setNow('2026-11-09T12:00:00Z');
    const report = new PaymentReportService({ em: fixture.em.fork(), clock: fixture.clock, session: Promise.resolve({ userId: fixture.operatorId, roles: ['operator'] }) });
    // Other integration cases clean their owned rows; the fixture itself is unpaid.
    const initial = await report.get(); expect(initial.paidSessionCount).toBe(0); expect(initial.medianBookingToStartMinutes).toBeNull();
    const times = [
      ['2026-11-01T22:59:00Z', '2026-11-02T01:59:00Z'],
      ['2026-11-01T23:00:00Z', '2026-11-09T23:00:00Z'],
      ['2026-11-08T23:00:00Z', '2026-11-16T00:00:00Z'],
      ['2026-11-03T12:00:00Z', '2026-11-03T11:00:00Z'],
      ['2026-08-16T12:00:00Z', '2026-11-17T12:00:00Z'],
      ['2026-11-10T12:00:00Z', '2026-11-18T12:00:00Z'],
    ];
    const created = [];
    for (const [booked, starts] of times) {
      const id = crypto.randomUUID();
      const slot = fixture.em.create(Slot, { mentorProfile: fixture.em.getReference(MentorProfile, fixture.profileId), startsAt: new Date(starts!) });
      const booking = fixture.em.create(Booking, {
        slot, mentorProfile: slot.mentorProfile, mentee: fixture.em.getReference(User, fixture.menteeId),
        status: 'confirmed', lengthMinutes: 25, priceCents: 8000, currency: 'PLN', startsAt: slot.startsAt,
        bookedAt: new Date(booked!), paidAt: new Date(booked!), amountPaidCents: 8000,
        feePercentApplied: 20, platformFeeCents: 1600, mentorShareCents: 6400,
        stripeCheckoutSessionId: `cs_report_${id}`, stripePaymentIntentId: `pi_report_${id}`,
      });
      fixture.em.persist([slot, booking]); created.push(booking);
    }
    await fixture.em.flush();
    for (let index = 0; index < 2; index++) fixture.em.persist(fixture.em.create(ProcessedWebhookEvent, {
      booking: created[0]!, eventId: `evt_report_${crypto.randomUUID()}`, type: 'checkout.session.completed',
      sessionId: created[0]!.stripeCheckoutSessionId!, outcome: 'confirmed', receivedAt: fixture.clock.now(),
    }));
    await fixture.em.flush();
    expect(await report.get()).toMatchObject({
      timezone: 'Europe/Warsaw', cohortStart: '2026-08-24', paidSessionCount: 4, timingSampleCount: 3,
      medianBookingToStartMinutes: 10140,
      bookingWeeks: [{ week: '2026-10-26', count: 1 }, { week: '2026-11-02', count: 2 }, { week: '2026-11-09', count: 1 }],
      sessionStartWeeks: [{ week: '2026-11-02', count: 2 }, { week: '2026-11-09', count: 1 }, { week: '2026-11-16', count: 1 }],
    });
  });
});
