import { Migration } from '@mikro-orm/migrations';

/**
 * E03-S06 (#44, R10): every paid booking records the platform fee in force at confirmation and
 * the mentor's share. Additive nullable columns; already-paid bookings are backfilled with the
 * current operator fee (20 % when no settings row exists — the only fee before E05-S02), then the
 * "paid implies snapshot" check is added. Hand-written: `migration:create` also rewrote unrelated
 * `platform_settings`, `session_notes`, `session_messages`, `notifications` and currency checks.
 */
export class Migration20261110103105_fee_split extends Migration {

  override name = 'Migration20261110103105_fee_split';

  override up(): void | Promise<void> {
    this.addSql(`alter table "bookings" add "fee_percent_applied" smallint null, add "platform_fee_cents" int null, add "mentor_share_cents" int null;`);
    this.addSql(`alter table "bookings" add constraint "bookings_fee_snapshot_pair_check" check ((fee_percent_applied is null) = (platform_fee_cents is null) and (platform_fee_cents is null) = (mentor_share_cents is null));`);
    this.addSql(`alter table "bookings" add constraint "bookings_fee_snapshot_values_check" check (fee_percent_applied is null or (fee_percent_applied between 0 and 100 and platform_fee_cents >= 0 and mentor_share_cents >= 0 and platform_fee_cents + mentor_share_cents = price_cents));`);
    this.addSql(`update "bookings" b set "fee_percent_applied" = f.fee, "platform_fee_cents" = ((b.price_cents::bigint * f.fee + 50) / 100)::int, "mentor_share_cents" = b.price_cents - ((b.price_cents::bigint * f.fee + 50) / 100)::int from (select coalesce((select "fee_percent" from "platform_settings" where "id" = 1), 20) as fee) f where b.paid_at is not null and b.fee_percent_applied is null;`);
    this.addSql(`alter table "bookings" add constraint "bookings_paid_fee_snapshot_check" check (paid_at is null or fee_percent_applied is not null);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "bookings" drop constraint if exists "bookings_paid_fee_snapshot_check";`);
    this.addSql(`alter table "bookings" drop constraint if exists "bookings_fee_snapshot_values_check";`);
    this.addSql(`alter table "bookings" drop constraint if exists "bookings_fee_snapshot_pair_check";`);
    this.addSql(`alter table "bookings" drop column if exists "fee_percent_applied", drop column if exists "platform_fee_cents", drop column if exists "mentor_share_cents";`);
  }

}
