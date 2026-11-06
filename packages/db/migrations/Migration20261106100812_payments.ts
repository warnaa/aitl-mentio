import { Migration } from '@mikro-orm/migrations';

export class Migration20261106100812_payments extends Migration {

  override name = 'Migration20261106100812_payments';

  override up(): void | Promise<void> {
    this.addSql(`create table "processed_webhook_events" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "event_id" varchar(255) not null, "type" varchar(255) not null, "received_at" timestamptz not null, "booking_id" uuid null, "session_id" varchar(255) not null, "outcome" varchar(255) not null, primary key ("id"));`);
    this.addSql(`alter table "processed_webhook_events" add constraint "processed_webhook_events_event_id_unique" unique ("event_id");`);

    this.addSql(`create table "payment_attempts" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "booking_id" uuid not null, "idempotency_key" varchar(255) not null, "session_id" varchar(255) null, "state" varchar(255) not null, "expires_at" timestamptz not null, "success_url" varchar(2048) not null, "cancel_url" varchar(2048) not null, "next_reconciliation_at" timestamptz not null, "diagnostic_code" varchar(255) null, primary key ("id"));`);
    this.addSql(`alter table "payment_attempts" add constraint "payment_attempts_booking_id_unique" unique ("booking_id");`);
    this.addSql(`alter table "payment_attempts" add constraint "payment_attempts_idempotency_key_unique" unique ("idempotency_key");`);
    this.addSql(`alter table "payment_attempts" add constraint "payment_attempts_session_id_unique" unique ("session_id");`);
    this.addSql(`create index "payment_attempts_reconciliation_index" on "payment_attempts" ("state", "next_reconciliation_at");`);

    this.addSql(`create table "payment_resolutions" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "attempt_id" uuid not null, "actor_id" uuid not null, "action" varchar(255) not null, "reason" varchar(500) not null, "session_id" varchar(255) not null, "payment_intent_id" varchar(255) null, primary key ("id"));`);

    this.addSql(`alter table "bookings" drop constraint "bookings_currency_check";`);
    this.addSql(`alter table "bookings" add "stripe_payment_intent_id" varchar(255) null, add "paid_at" timestamptz null, add "amount_paid_cents" int null, add "payment_pending" boolean not null default false;`);
    this.addSql(`alter table "bookings" add constraint "bookings_stripe_payment_intent_id_unique" unique ("stripe_payment_intent_id");`);
    this.addSql(`alter table "bookings" add constraint "bookings_currency_check" check (currency = 'PLN');`);

    this.addSql(`alter table "processed_webhook_events" add constraint "processed_webhook_events_booking_id_foreign" foreign key ("booking_id") references "bookings" ("id") on delete no action;`);

    this.addSql(`alter table "payment_attempts" add constraint "payment_attempts_booking_id_foreign" foreign key ("booking_id") references "bookings" ("id") on delete no action;`);
    this.addSql(`alter table "payment_attempts" add constraint "payment_attempts_state_check" check (state in ('creating', 'open', 'confirmed', 'expired', 'review'));`);

    this.addSql(`alter table "payment_resolutions" add constraint "payment_resolutions_attempt_id_foreign" foreign key ("attempt_id") references "payment_attempts" ("id") on delete no action;`);
    this.addSql(`alter table "payment_resolutions" add constraint "payment_resolutions_actor_id_foreign" foreign key ("actor_id") references "users" ("id") on delete no action;`);
    this.addSql(`alter table "payment_resolutions" add constraint "payment_resolutions_action_check" check (action in ('confirm', 'release'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "payment_resolutions" drop constraint "payment_resolutions_attempt_id_foreign";`);

    this.addSql(`drop table if exists "processed_webhook_events" cascade;`);
    this.addSql(`drop table if exists "payment_attempts" cascade;`);
    this.addSql(`drop table if exists "payment_resolutions" cascade;`);

    this.addSql(`alter table "bookings" drop constraint "bookings_stripe_payment_intent_id_unique";`);
    this.addSql(`alter table "bookings" drop constraint "bookings_currency_check";`);
    this.addSql(`alter table "bookings" drop column "stripe_payment_intent_id", drop column "paid_at", drop column "amount_paid_cents", drop column "payment_pending";`);
    this.addSql(`alter table "bookings" add constraint "bookings_currency_check" check ("currency" in ('PLN'));`);
  }

}
