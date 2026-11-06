import { expect, it } from 'vitest';
import { ProcessedWebhookEvent } from '@devmentor/db';
import { paymentEvent, postCheckout, postPaymentEvent, storedBooking, withPaymentFixture } from './fixtures/payment';

it('PAYMENTS-012 rejects a forged webhook signature without recording or confirming payment', async () => {
  await withPaymentFixture('012', async fixture => {
    expect((await postCheckout(fixture)).status).toBe(200);
    const event = await paymentEvent(fixture, `evt_forged_${fixture.booking.id}`);
    const response = await postPaymentEvent(fixture, event, 'forged-signature');
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('');
    expect(await storedBooking(fixture)).toMatchObject({ status: 'pending', paidAt: null, amountPaidCents: null, paymentPending: true });
    expect(await fixture.em.count(ProcessedWebhookEvent, { eventId: event.id })).toBe(0);
  });
});
