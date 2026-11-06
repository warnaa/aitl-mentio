import { expect, it } from 'vitest';
import { PaymentAttempt } from '@devmentor/db';
import { paymentAttempt, postCheckout, withPaymentFixture } from './fixtures/payment';

it('PAYMENTS-015 gives concurrent Checkout retries one provider session and one fixed deadline', async () => {
  await withPaymentFixture('015', async fixture => {
    const responses = await Promise.all(Array.from({ length: 4 }, () => postCheckout(fixture)));
    expect(responses.map(response => response.status)).toEqual([200, 200, 200, 200]);
    const bodies = await Promise.all(responses.map(response => response.json()));
    expect(new Set(bodies.map(body => body.data.url)).size).toBe(1);
    expect(new Set(bodies.map(body => body.data.expiresAt)).size).toBe(1);
    expect(await fixture.em.count(PaymentAttempt, { booking: fixture.booking.id })).toBe(1);
    const attempt = await paymentAttempt(fixture);
    expect(attempt).toMatchObject({ state: 'open', booking: { id: fixture.booking.id } });
    expect(attempt.sessionId).toBeTruthy();
    expect(bodies[0].data.expiresAt).toBe(attempt.expiresAt.toISOString());
  });
});
