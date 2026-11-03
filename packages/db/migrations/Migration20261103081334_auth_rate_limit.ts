import { Migration } from '@mikro-orm/migrations';

/**
 * E01 Slice 4 — `auth_rate_limits`, the fixed-window counters behind core's
 * `RateLimiter` (primitives spec B8). Generated with
 * `npm run db:migration:create -- --name auth-rate-limit`.
 *
 * A natural text primary key and no `baseProperties` columns, by design; the index on
 * `window_start` serves the purge of expired windows on every call. `down` drops the
 * table — counters are disposable, so nothing is lost but in-flight windows.
 */
export class Migration20261103081334_auth_rate_limit extends Migration {

  override name = 'Migration20261103081334_auth_rate_limit';

  override up(): void | Promise<void> {
    this.addSql(`create table "auth_rate_limits" ("key" text not null, "window_start" timestamptz not null, "count" int not null, primary key ("key"));`);
    this.addSql(`create index "auth_rate_limits_window_start_index" on "auth_rate_limits" ("window_start");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "auth_rate_limits" cascade;`);
  }

}
