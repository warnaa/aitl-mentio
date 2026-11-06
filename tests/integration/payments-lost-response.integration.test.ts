import { expect, it } from 'vitest';
import { Booking, PaymentAttempt } from '@devmentor/db';
import { withPaymentDatabaseFixture } from './fixtures/payment-database';

it('PAYMENTS-008 recovers a lost Checkout creation response with one payable provider session', async () => {
  await withPaymentDatabaseFixture('008', async fixture => {
    fixture.gateway.loseNextCreationResponse = true;
    await expect(fixture.service().startCheckout(fixture.booking.id)).rejects.toThrow('Synthetic provider timeout');
    const unresolved = await fixture.em.fork().findOneOrFail(PaymentAttempt, { booking: fixture.booking.id });
    expect(unresolved).toMatchObject({ state: 'creating', sessionId: null });
    expect((await fixture.em.fork().findOneOrFail(Booking, { id: fixture.booking.id })).paymentPending).toBe(true);

    const checkout = await fixture.service().startCheckout(fixture.booking.id);
    const recovered = await fixture.em.fork().findOneOrFail(PaymentAttempt, { booking: fixture.booking.id });
    expect(recovered.state).toBe('open');
    expect(checkout.expiresAt).toBe(unresolved.expiresAt.toISOString());
    expect(checkout.url).toContain(recovered.sessionId!);
    expect(await fixture.em.count(PaymentAttempt, { booking: fixture.booking.id })).toBe(1);
    expect(new Set(fixture.gateway.requests.map(request => request.idempotencyKey)).size).toBe(1);
    expect(fixture.gateway.requests.every(request => request.amountCents === 8000 && request.currency === 'PLN' && request.bookingId === fixture.booking.id)).toBe(true);
    const event = await fixture.gateway.simulateCheckoutCompleted(recovered.sessionId!);
    expect(await fixture.service().handleEvent(event)).toEqual({ outcome: 'confirmed' });
    expect((await fixture.em.fork().findOneOrFail(Booking, { id: fixture.booking.id })).amountPaidCents).toBe(8000);
    expect(fixture.confirmations).toEqual([fixture.booking.id]);
  });
});
