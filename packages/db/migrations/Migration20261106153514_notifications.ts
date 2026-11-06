import { Migration } from '@mikro-orm/migrations';

export class Migration20261106153514_notifications extends Migration {

  override name = 'Migration20261106153514_notifications';

  override up(): void | Promise<void> {
    this.addSql(`create table "notifications" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "booking_id" uuid not null, "kind" varchar(32) not null, "read_at" timestamptz null, "email_sent_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "notifications_user_created_index" on "notifications" ("user_id", "created_at");`);
    this.addSql(`alter table "notifications" add constraint "notifications_user_kind_booking_unique" unique ("user_id", "kind", "booking_id");`);

    this.addSql(`alter table "notifications" add constraint "notifications_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete no action;`);
    this.addSql(`alter table "notifications" add constraint "notifications_booking_id_foreign" foreign key ("booking_id") references "bookings" ("id") on delete no action;`);
    this.addSql(`alter table "notifications" add constraint "notifications_kind_check" check (kind in ('booking_confirmed'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "notifications" cascade;`);
  }

}
