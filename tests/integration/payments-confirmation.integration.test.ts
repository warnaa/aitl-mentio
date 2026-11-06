import { expect, it } from 'vitest';
import { Booking, ProcessedWebhookEvent } from '@devmentor/db';
import { paymentEvent, postCheckout, postPaymentEvent, storedBooking, withPaymentFixture } from './fixtures/payment';

it('PAYMENTS-011 confirms one exact payment despite repeated callbacks and shows it to both participants', async () => {
  await withPaymentFixture('011', async fixture => {
    expect((await postCheckout(fixture)).status).toBe(200);
    const event = await paymentEvent(fixture, `evt_payment_${fixture.booking.id}`);
    expect((await postPaymentEvent(fixture, event)).status).toBe(200);
    const first = await storedBooking(fixture);
    expect(first).toMatchObject({ status: 'confirmed', amountPaidCents: 8000, currency: 'PLN', paymentPending: false, stripePaymentIntentId: event.session!.paymentIntentId });
    expect(first.bookedAt).toBeInstanceOf(Date);
    expect(first.paidAt).toBeInstanceOf(Date);
    expect(first.startsAt.toISOString()).toBe(fixture.booking.startsAt);

    const callbacks = await Promise.all([
      postPaymentEvent(fixture, event),
      postPaymentEvent(fixture, event),
      postPaymentEvent(fixture, { ...event, id: `${event.id}_redelivery` }),
    ]);
    expect(callbacks.map(response => response.status)).toEqual([200, 200, 200]);
    const after = await storedBooking(fixture);
    expect(after.bookedAt).toEqual(first.bookedAt);
    expect(after.paidAt).toEqual(first.paidAt);
    expect(await fixture.em.count(Booking, { stripePaymentIntentId: event.session!.paymentIntentId })).toBe(1);
    expect(await fixture.em.count(ProcessedWebhookEvent, { eventId: event.id })).toBe(1);

    for (const [headers, role] of [[fixture.first, 'mentee'], [fixture.mentor, 'mentor']] as const) {
      const response = await fetch(`${fixture.base}/api/bookings?role=${role}`, { headers });
      expect(response.status).toBe(200);
      expect((await response.json()).data).toEqual(expect.arrayContaining([expect.objectContaining({ id: fixture.booking.id, status: 'confirmed', priceCents: 8000, paymentStatus: 'confirmed' })]));
    }
    const other = await fetch(`${fixture.base}/api/bookings?role=mentee`, { headers: fixture.second });
    expect((await other.json()).data).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: fixture.booking.id })]));
  });
});
