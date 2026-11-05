import { expect, it } from 'vitest';
import { mentorPricesUpdateSchema } from './mentor-prices-update.schema';
it('requires both raw decimals and strips all policy/storage/owner injection', () => {
  expect(mentorPricesUpdateSchema.parse({ price25: '80.00', price50: '160', currency: 'USD', price25Cents: 1, priceBounds: {} })).toEqual({ price25: '80.00', price50: '160' });
  for (const input of [{ price25: '80' }, { price25: '80.001', price50: '160' }, { price25: '999999999999', price50: '160' }]) expect(mentorPricesUpdateSchema.safeParse(input).success).toBe(false);
});
