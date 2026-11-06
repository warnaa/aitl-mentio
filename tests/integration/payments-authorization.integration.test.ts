import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { PaymentAttempt, User } from '@devmentor/db';
import { postCheckout, withPaymentFixture } from './fixtures/payment';

it('PAYMENTS-014 denies unsigned wrong-role CSRF-less and foreign-owner Checkout without writes', async () => {
  await withPaymentFixture('014', async fixture => {
    expect((await postCheckout(fixture, { 'x-devmentor-request': '1', 'content-type': 'application/json' })).status).toBe(401);
    expect((await postCheckout(fixture, { cookie: fixture.first.cookie! })).status).toBe(403);
    await fixture.em.nativeUpdate(User, { id: fixture.mentorId }, { roles: ['mentor'] });
    expect((await postCheckout(fixture, fixture.mentor)).status).toBe(403);
    const foreign = await postCheckout(fixture, fixture.second);
    const missing = await postCheckout(fixture, fixture.second, randomUUID());
    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    expect((await foreign.json()).error).toEqual((await missing.json()).error);
    expect(await fixture.em.count(PaymentAttempt, { booking: fixture.booking.id })).toBe(0);
  });
});
