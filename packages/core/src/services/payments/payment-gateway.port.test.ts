import { expect, it } from 'vitest';
import { CheckoutNotCreatedError } from './payment-gateway.port';
it('recognizes the definitive rejection brand across module copies and rejects unrelated values', () => {
  expect(new CheckoutNotCreatedError('rejected')).toMatchObject({ status: 503 });
  for (const value of [42, null, new Error('timeout')]) expect(CheckoutNotCreatedError[Symbol.hasInstance](value)).toBe(false);
  expect(CheckoutNotCreatedError[Symbol.hasInstance]({ [Symbol.for('devmentor.checkout-not-created')]: true })).toBe(true);
});
