import { expect, it, vi } from 'vitest';
it('parses and caches the approved CLI configuration and rejects malformed assignments', async () => {
  vi.resetModules();
  const { getDbEnv } = await import('./env');
  const env = getDbEnv({} as NodeJS.ProcessEnv);
  expect(env.PLATFORM_CURRENCY).toBe('PLN'); expect(JSON.parse(env.PLATFORM_PRICE_BOUNDS).p25.minCents).toBe(8000);
  expect(getDbEnv()).toBe(env);
  for (const input of [{ PLATFORM_CURRENCY: 'USD' }, { PLATFORM_PRICE_BOUNDS: '' }]) {
    vi.resetModules(); const fresh = (await import('./env')).getDbEnv;
    expect(() => fresh(input as unknown as NodeJS.ProcessEnv)).toThrow();
  }
});
