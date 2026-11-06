import { expect, it } from 'vitest';
import { Booking, PaymentAttempt, PaymentResolution } from '@devmentor/db';
import { withPaymentDatabaseFixture } from './fixtures/payment-database';

it('PAYMENTS-010 refuses a stale paid callback after an authoritative full refund and audits operator release', async () => {
  await withPaymentDatabaseFixture('010', async fixture => {
    await fixture.service().startCheckout(fixture.booking.id);
    const attempt = await fixture.em.fork().findOneOrFail(PaymentAttempt, { booking: fixture.booking.id });
    const stalePaid = await fixture.gateway.simulateCheckoutCompleted(attempt.sessionId!);
    fixture.gateway.authoritativeSession = { ...stalePaid.session!, refundedCents: 8000 };
    expect(await fixture.service().handleEvent(stalePaid)).toEqual({ outcome: 'review' });
    expect(await fixture.em.fork().findOneOrFail(Booking, { id: fixture.booking.id })).toMatchObject({ status: 'pending', paymentPending: true, paidAt: null });
    await expect(fixture.service().resolveReview(attempt.id, { action: 'release', reason: 'Verified completed refund' })).rejects.toMatchObject({ code: 'forbidden' });

    const operator = fixture.service({ userId: fixture.operatorId, roles: ['operator'] });
    expect(await operator.resolveReview(attempt.id, { action: 'release', reason: 'Verified completed full provider refund' })).toEqual({ status: 'expired' });
    expect(await fixture.em.fork().findOneOrFail(Booking, { id: fixture.booking.id })).toMatchObject({ status: 'expired', paymentPending: false, paidAt: null });
    const audit = await fixture.em.find(PaymentResolution, { attempt: attempt.id });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: 'release', reason: 'Verified completed full provider refund', actor: { id: fixture.operatorId } });
    expect(fixture.confirmations).toEqual([]);
  });
});
