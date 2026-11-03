import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { defineSingletonEntity } from '../define';

const p = defineEntity.properties;

/**
 * One fixed-window rate-limit counter (primitives spec B8), written only by core's
 * `RateLimiter` through a raw `INSERT … ON CONFLICT` — the entity exists so the table
 * is owned by migrations and the snapshot, not to be loaded.
 *
 * The **one entity without `baseProperties`**: a counter keyed by a natural text key has
 * no use for a uuid id or created/updated timestamps, and they would be dead weight on
 * a hot path. `key` is `<scope>:<kind>:<sha256>`, so it holds no email address or IP.
 * `window_start` is indexed for the inline purge of expired windows.
 */
export const AuthRateLimit = defineSingletonEntity('AuthRateLimit', () =>
  defineEntity({
    name: 'AuthRateLimit',
    tableName: 'auth_rate_limits',
    properties: {
      key: p.text().primary(),
      windowStart: p.datetime().index('auth_rate_limits_window_start_index'),
      count: p.integer(),
    },
  }),
);

export type IAuthRateLimit = InferEntity<typeof AuthRateLimit>;
