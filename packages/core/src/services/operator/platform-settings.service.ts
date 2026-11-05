import { z } from 'zod';
import { ServiceUnavailableError } from '../../http/errors';
import { MAX_CENTS } from '../../money/money';

const boundsSchema = z.object({ minCents: z.number().int().positive().max(MAX_CENTS), maxCents: z.number().int().positive().max(MAX_CENTS) }).strict().refine(value => value.minCents <= value.maxCents);
const settingsSchema = z.object({ currency: z.literal('PLN'), priceBounds: z.object({ p25: boundsSchema, p50: boundsSchema }).strict() });
export type PlatformSettings = z.infer<typeof settingsSchema>;
/** No fallback here: defaults belong to the validated env, never missing injected policy. */
export class PlatformSettingsService {
  constructor(private readonly deps: { env: { PLATFORM_CURRENCY?: unknown; PLATFORM_PRICE_BOUNDS?: unknown } }) {}
  get(): PlatformSettings {
    let priceBounds: unknown;
    try { priceBounds = JSON.parse(this.deps.env.PLATFORM_PRICE_BOUNDS as string); }
    catch { throw new ServiceUnavailableError('Platform price settings are unavailable.'); }
    const parsed = settingsSchema.safeParse({ currency: this.deps.env.PLATFORM_CURRENCY, priceBounds });
    if (!parsed.success) throw new ServiceUnavailableError('Platform price settings are unavailable.');
    return parsed.data;
  }
  boundsFor(minutes: 25 | 50) {
    const settings = this.get();
    return minutes === 25 ? settings.priceBounds.p25 : settings.priceBounds.p50;
  }
}
