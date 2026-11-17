import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { defineSingletonEntity } from '../define';
import { User } from '../auth/user.entity';

const p = defineEntity.properties;

/** The one row id: there is exactly one platform settings row, created by the first operator save. */
export const PLATFORM_SETTINGS_ID = 1;

/**
 * Operator-set price bounds (integer minor units, inclusive) and the platform fee (whole percent).
 * While no row exists the service falls back to `PLATFORM_PRICE_BOUNDS` and a 20 % fee; `version`
 * guards concurrent operator saves.
 */
export const PlatformSettings = defineSingletonEntity('PlatformSettings', () => defineEntity({
  name: 'PlatformSettings',
  tableName: 'platform_settings',
  checks: [
    { name: 'platform_settings_singleton_check', expression: 'id = 1' },
    { name: 'platform_settings_price25_check', expression: 'price25_min_cents > 0 and price25_min_cents <= price25_max_cents' },
    { name: 'platform_settings_price50_check', expression: 'price50_min_cents > 0 and price50_min_cents <= price50_max_cents' },
    { name: 'platform_settings_fee_check', expression: 'fee_percent between 0 and 100' },
    { name: 'platform_settings_currency_check', expression: "currency = 'PLN'" },
  ],
  properties: {
    id: p.smallint().primary(),
    price25MinCents: p.integer().fieldName('price25_min_cents'),
    price25MaxCents: p.integer().fieldName('price25_max_cents'),
    price50MinCents: p.integer().fieldName('price50_min_cents'),
    price50MaxCents: p.integer().fieldName('price50_max_cents'),
    feePercent: p.smallint().default(20),
    currency: p.string().length(3),
    version: p.integer().default(0),
    updatedBy: () => p.manyToOne(User).nullable().deleteRule('set null'),
    updatedAt: p.datetime(),
  },
}));

export type IPlatformSettings = InferEntity<typeof PlatformSettings>;
