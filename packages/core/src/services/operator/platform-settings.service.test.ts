import { expect, it } from 'vitest';
import { PlatformSettingsService } from './platform-settings.service';
const bounds = { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } };
const service = (currency: unknown, policy: unknown) => new PlatformSettingsService({ env: { PLATFORM_CURRENCY: currency, PLATFORM_PRICE_BOUNDS: policy } });
it('returns authoritative approved bounds by duration without sharing mutable state', () => {
  const instance = service('PLN', JSON.stringify(bounds));
  expect(instance.get()).toEqual({ currency: 'PLN', priceBounds: bounds });
  expect(instance.boundsFor(25)).toEqual(bounds.p25); expect(instance.boundsFor(50)).toEqual(bounds.p50);
  instance.get().priceBounds.p25.minCents = 1; expect(instance.boundsFor(25).minCents).toBe(8000);
});
it('fails closed on absent, malformed, partial, noninteger, inverted, zero or unsupported settings', () => {
  for (const value of [undefined, '', 'bad', '{}', 'null', JSON.stringify({ ...bounds, p50: undefined }), JSON.stringify({ ...bounds, p25: { minCents: 0, maxCents: 1 } }), JSON.stringify({ ...bounds, p25: { minCents: 2, maxCents: 1 } }), JSON.stringify({ ...bounds, p25: { minCents: 0.5, maxCents: 1 } }), JSON.stringify({ ...bounds, p25: { minCents: 1, maxCents: 2147483648 } })]) expect(() => service('PLN', value).get()).toThrow('Platform price settings are unavailable.');
  for (const currency of [undefined, '', 'USD', 'JPY']) expect(() => service(currency, JSON.stringify(bounds)).get()).toThrow();
});
