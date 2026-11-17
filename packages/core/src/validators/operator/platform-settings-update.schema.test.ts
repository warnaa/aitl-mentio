import { expect, it } from 'vitest';
import { platformSettingsFieldsSchema, platformSettingsUpdateSchema } from './platform-settings-update.schema';

const valid = { price25Min: '80.00', price25Max: '600', price50Min: '160.5', price50Max: '1200.00', feePercent: 20, version: 3 };
const issues = (input: unknown) => {
  const result = platformSettingsUpdateSchema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map(issue => [issue.path.join('.'), issue.message]));
};

it('turns major-unit decimals into integer cents and strips currency or storage injection', () => {
  expect(platformSettingsUpdateSchema.parse({ ...valid, currency: 'USD', updatedBy: 'x', priceBounds: {} })).toEqual({
    priceBounds: { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16050, maxCents: 120000 } },
    feePercent: 20,
    version: 3,
  });
});

it('accepts the fee edges and equal minimum and maximum', () => {
  for (const feePercent of [0, 100]) expect(platformSettingsUpdateSchema.safeParse({ ...valid, feePercent }).success).toBe(true);
  expect(platformSettingsUpdateSchema.safeParse({ ...valid, price25Min: '600', price25Max: '600.00' }).success).toBe(true);
});

it('refuses a minimum above its maximum, keyed to the maximum', () => {
  expect(issues({ ...valid, price25Min: '601' })).toEqual({ price25Max: 'The maximum must be at least the minimum (PLN 601.00).' });
  expect(issues({ ...valid, price50Min: '1200.01' })).toHaveProperty('price50Max');
});

it('refuses a fee outside 0–100 or not a whole percent', () => {
  for (const feePercent of [101, -1, 20.5, '20', null]) expect(issues({ ...valid, feePercent })).toHaveProperty('feePercent');
});

it('refuses zero, oversized and malformed amounts and a missing version', () => {
  expect(issues({ ...valid, price25Min: '0' })).toHaveProperty('price25Min', 'Enter an amount above zero.');
  expect(issues({ ...valid, price50Max: '99999999.99' })).toHaveProperty('price50Max', 'This amount is too large.');
  for (const bad of ['80.001', '-80', '1e3', '', ' 80', 80]) expect(issues({ ...valid, price25Max: bad })).toHaveProperty('price25Max');
  expect(issues({ ...valid, version: undefined })).toHaveProperty('version');
  expect(issues({ ...valid, version: -1 })).toHaveProperty('version');
});

it('validates the client form fields with the same rules, without a version', () => {
  const fields = { price25Min: valid.price25Min, price25Max: valid.price25Max, price50Min: valid.price50Min, price50Max: valid.price50Max, feePercent: valid.feePercent };
  expect(platformSettingsFieldsSchema.parse({ ...fields, version: 9 })).toEqual(fields);
  expect(platformSettingsFieldsSchema.safeParse({ ...fields, price50Min: '1300' }).success).toBe(false);
  const missingFee = platformSettingsFieldsSchema.safeParse({ ...fields, feePercent: undefined });
  expect(missingFee.success ? null : missingFee.error.issues[0]!.message).toBe('Enter a whole percent from 0 to 100.');
});
