import { Migration } from '@mikro-orm/migrations';

export class Migration20261105222730_bookings extends Migration {

  override name = 'Migration20261105222730_bookings';

  override up(): void | Promise<void> {
    this.addSql(`create table "bookings" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "slot_id" uuid not null, "mentee_id" uuid not null, "mentor_profile_id" uuid not null, "length_minutes" int not null, "price_cents" int not null, "currency" varchar(3) not null, "status" varchar(16) not null, "starts_at" timestamptz not null, "booked_at" timestamptz null, "expires_at" timestamptz null, "stripe_checkout_session_id" varchar(255) null, primary key ("id"));`);
    this.addSql(`alter table "bookings" add constraint "bookings_stripe_checkout_session_id_unique" unique ("stripe_checkout_session_id");`);
    this.addSql(`create index "bookings_mentor_start_index" on "bookings" ("mentor_profile_id", "starts_at");`);
    this.addSql(`create unique index "bookings_active_slot_unique" on "bookings" ("slot_id") where status in ('pending', 'confirmed');`);

    this.addSql(`alter table "bookings" add constraint "bookings_slot_id_foreign" foreign key ("slot_id") references "slots" ("id") on delete no action;`);
    this.addSql(`alter table "bookings" add constraint "bookings_mentee_id_foreign" foreign key ("mentee_id") references "users" ("id") on delete no action;`);
    this.addSql(`alter table "bookings" add constraint "bookings_mentor_profile_id_foreign" foreign key ("mentor_profile_id") references "mentor_profiles" ("id") on delete no action;`);
    this.addSql(`alter table "bookings" add constraint "bookings_pending_expiry_check" check (status <> 'pending' or expires_at is not null);`);
    this.addSql(`alter table "bookings" add constraint "bookings_length_minutes_check" check (length_minutes in (25, 50));`);
    this.addSql(`alter table "bookings" add constraint "bookings_price_cents_check" check (price_cents > 0);`);
    this.addSql(`alter table "bookings" add constraint "bookings_currency_check" check (currency = 'PLN');`);
    this.addSql(`alter table "bookings" add constraint "bookings_status_check" check (status in ('pending', 'confirmed', 'cancelled', 'expired'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "bookings" cascade;`);
  }

}
