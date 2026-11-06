import { expect, it } from 'vitest';
import { ProcessedWebhookEvent } from '@devmentor/db';
import { bookingPersona } from './fixtures/booking';
import { paymentEvent, postCheckout, postPaymentEvent, storedBooking, withPaymentFixture } from './fixtures/payment';

it('PAYMENTS-018 safely quarantines verified unknown provider metadata for operator review', async () => {
  await withPaymentFixture('018', async fixture => {
    expect((await postCheckout(fixture)).status).toBe(200);
    const event = await paymentEvent(fixture, `evt_unknown_${fixture.booking.id}`, { id: `cs_unknown_${fixture.booking.id}`, bookingId: 'missing-provider-metadata', attemptId: 'not-a-uuid' });
    try {
      const response = await postPaymentEvent(fixture, event);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('');
      expect(await fixture.em.findOneOrFail(ProcessedWebhookEvent, { eventId: event.id })).toMatchObject({ booking: null, outcome: 'unknown_session', sessionId: event.session!.id });
      expect(await storedBooking(fixture)).toMatchObject({ status: 'pending', paidAt: null, paymentPending: true });
      expect((await fetch(`${fixture.base}/api/payments/review`, { headers: fixture.first })).status).toBe(403);
      const operator = await bookingPersona(fixture.base, 'mock-operator');
      const review = await fetch(`${fixture.base}/api/payments/review`, { headers: operator });
      expect(review.status).toBe(200);
      expect((await review.json()).data).toEqual(expect.arrayContaining([expect.objectContaining({ sessionId: event.session!.id, bookingId: null, attemptId: null, reason: 'unknown_provider_session' })]));
    } finally {
      await fixture.em.nativeDelete(ProcessedWebhookEvent, { eventId: event.id });
    }
  });
});
