import { expect, it, vi } from 'vitest';
import { Booking, PaymentAttempt } from '@devmentor/db';
import { CheckoutNotCreatedError } from '../../packages/core/src/services/payments/payment-gateway.port';
import { activeOccupancy } from '../../packages/core/src/services/bookings/occupancy';
import { withPaymentDatabaseFixture } from './fixtures/payment-database';

it('PAYMENTS-020 releases a definitively rejected creation with durable submission evidence', async () => {
  await withPaymentDatabaseFixture('020', async fixture => {
    vi.spyOn(fixture.gateway, 'createCheckoutSession').mockRejectedValueOnce(new CheckoutNotCreatedError('Synthetic verified provider rejection'));
    await expect(fixture.service().startCheckout(fixture.booking.id)).rejects.toMatchObject({ status: 503 });
    const em = fixture.em.fork();
    expect(await em.findOneOrFail(Booking, { id: fixture.booking.id })).toMatchObject({ status: 'expired', paymentPending: false });
    expect(await em.findOneOrFail(PaymentAttempt, { booking: fixture.booking.id })).toMatchObject({ state: 'expired', submissionCount: 1, rejectedSubmissionCount: 1, sessionId: null });
    expect(await em.findOne(Booking, { id: fixture.booking.id, ...activeOccupancy(fixture.clock.now()) })).toBeNull();
    expect(fixture.confirmations).toEqual([]);
  });
});
