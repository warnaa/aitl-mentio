import { expect, it } from 'vitest';
import { ProcessedWebhookEvent } from '@devmentor/db';
import { postBooking } from './fixtures/booking';
import { paymentAttempt, paymentEvent, postCheckout, postPaymentEvent, storedBooking, withPaymentFixture } from './fixtures/payment';

it('PAYMENTS-013 quarantines a paid amount mismatch without confirming or reselling the time', async () => {
  await withPaymentFixture('013', async fixture => {
    expect((await postCheckout(fixture)).status).toBe(200);
    const event = await paymentEvent(fixture, `evt_mismatch_${fixture.booking.id}`, { amountCents: 7999 });
    expect((await postPaymentEvent(fixture, event)).status).toBe(200);
    expect(await paymentAttempt(fixture)).toMatchObject({ state: 'review' });
    expect(await storedBooking(fixture)).toMatchObject({ status: 'pending', paymentPending: true, amountPaidCents: null, paidAt: null });
    expect(await fixture.em.findOneOrFail(ProcessedWebhookEvent, { eventId: event.id })).toMatchObject({ outcome: 'review' });
    expect((await postBooking(fixture, fixture.slot.id, 25, fixture.second)).status).toBe(409);
  });
});
