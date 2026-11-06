import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { postBooking } from './fixtures/booking';
import { paymentEvent, postCheckout, postPaymentEvent, storedBooking, withPaymentFixture } from './fixtures/payment';

it('PAYMENTS-017 retains payment occupancy past local expiry until a delayed paid callback confirms', async () => {
  await withPaymentFixture('017', async fixture => {
    expect((await postCheckout(fixture)).status).toBe(200);
    await fixture.em.nativeUpdate(Booking, { id: fixture.booking.id }, { expiresAt: new Date('2000-01-01T00:00:00Z') });
    expect((await postBooking(fixture, fixture.slot.id, 25, fixture.second)).status).toBe(409);
    expect(await storedBooking(fixture)).toMatchObject({ status: 'pending', paymentPending: true });
    const event = await paymentEvent(fixture, `evt_delayed_${fixture.booking.id}`);
    expect((await postPaymentEvent(fixture, event)).status).toBe(200);
    expect(await storedBooking(fixture)).toMatchObject({ status: 'confirmed', paymentPending: false, amountPaidCents: 8000 });
    expect(await fixture.em.count(Booking, { slot: fixture.slot.id })).toBe(1);
  });
});
