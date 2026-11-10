import { Migration } from '@mikro-orm/migrations';

/**
 * Operator-set price bounds and platform fee (E05-S02, #50). Additive: no row is inserted, so
 * the app keeps serving `PLATFORM_PRICE_BOUNDS` and a 20 % fee until an operator saves.
 * Hand-trimmed: `migration:create` also rewrote unrelated `bookings`, `session_notes` and
 * `session_messages` checks, which this migration must not touch.
 */
export class Migration20261109224703_platform_settings extends Migration {

  override name = 'Migration20261109224703_platform_settings';

  override up(): void | Promise<void> {
    this.addSql(`create table "platform_settings" ("id" smallint primary key, "price25_min_cents" int not null, "price25_max_cents" int not null, "price50_min_cents" int not null, "price50_max_cents" int not null, "fee_percent" smallint not null default 20, "currency" varchar(3) not null, "version" int not null default 0, "updated_by_id" uuid null, "updated_at" timestamptz not null);`);
    this.addSql(`alter table "platform_settings" add constraint "platform_settings_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on delete set null;`);
    this.addSql(`alter table "platform_settings" add constraint "platform_settings_singleton_check" check (id = 1);`);
    this.addSql(`alter table "platform_settings" add constraint "platform_settings_price25_check" check (price25_min_cents > 0 and price25_min_cents <= price25_max_cents);`);
    this.addSql(`alter table "platform_settings" add constraint "platform_settings_price50_check" check (price50_min_cents > 0 and price50_min_cents <= price50_max_cents);`);
    this.addSql(`alter table "platform_settings" add constraint "platform_settings_fee_check" check (fee_percent between 0 and 100);`);
    this.addSql(`alter table "platform_settings" add constraint "platform_settings_currency_check" check (currency = 'PLN');`);
  }

  override down(): void | Promise<void> {
    // Drops the operator's saved values; the app falls back to PLATFORM_PRICE_BOUNDS and a 20 % fee.
    this.addSql(`drop table if exists "platform_settings";`);
  }

}
