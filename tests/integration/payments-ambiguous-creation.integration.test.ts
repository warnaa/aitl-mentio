import { expect, it } from 'vitest';
import { Booking, PaymentAttempt } from '@devmentor/db';
import { withPaymentDatabaseFixture } from './fixtures/payment-database';

it('PAYMENTS-009 retains ambiguous paid inventory when creation recovery exceeds the fixed margin', async () => {
  await withPaymentDatabaseFixture('009', async fixture => {
    fixture.gateway.loseNextCreationResponse = true;
    await expect(fixture.service().startCheckout(fixture.booking.id)).rejects.toThrow('Synthetic provider timeout');
    const before = await fixture.em.fork().findOneOrFail(PaymentAttempt, { booking: fixture.booking.id });
    fixture.setNow(new Date(before.expiresAt.getTime() - 30 * 60_000 + 1));
    await expect(fixture.service().startCheckout(fixture.booking.id)).rejects.toMatchObject({ code: 'conflict' });
    const after = await fixture.em.fork().findOneOrFail(PaymentAttempt, { booking: fixture.booking.id });
    expect(after).toMatchObject({ state: 'review', diagnosticCode: 'ambiguous_creation', sessionId: null });
    expect(after.expiresAt).toEqual(before.expiresAt);
    const booking = await fixture.em.fork().findOneOrFail(Booking, { id: fixture.booking.id });
    expect(booking).toMatchObject({ status: 'pending', paymentPending: true, paidAt: null });
    expect(fixture.gateway.requests).toHaveLength(1);
    expect(fixture.confirmations).toEqual([]);
  });
});
