import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { postBooking } from './fixtures/booking';
import { paymentEvent, postCheckout, postPaymentEvent, storedBooking, withPaymentFixture } from './fixtures/payment';

it('PAYMENTS-016 releases verified unpaid Checkout expiry while preserving reservation history', async () => {
  await withPaymentFixture('016', async fixture => {
    expect((await postCheckout(fixture)).status).toBe(200);
    const event = await paymentEvent(fixture, `evt_expired_${fixture.booking.id}`, { paid: false, status: 'expired', paymentIntentId: null }, 'checkout.session.expired');
    expect((await postPaymentEvent(fixture, event)).status).toBe(200);
    expect(await storedBooking(fixture)).toMatchObject({ status: 'expired', paymentPending: false, paidAt: null, amountPaidCents: null });
    const replacement = await postBooking(fixture, fixture.slot.id, 25, fixture.second);
    expect(replacement.status).toBe(201);
    const history = await fixture.em.fork().find(Booking, { slot: fixture.slot.id });
    expect(history).toHaveLength(2);
    expect(history.filter(booking => booking.status === 'expired')).toHaveLength(1);
    expect(history.filter(booking => booking.status === 'pending')).toHaveLength(1);
  });
});
