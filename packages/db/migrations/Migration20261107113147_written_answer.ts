import { Migration } from '@mikro-orm/migrations';

export class Migration20261107113147_written_answer extends Migration {

  override name = 'Migration20261107113147_written_answer';

  override up(): void | Promise<void> {
    this.addSql(`alter table "bookings" add "written_answer" text null, add "written_answer_at" timestamptz null;`);
    this.addSql(`alter table "bookings" add constraint "bookings_written_answer_pair_check" check ((written_answer is null) = (written_answer_at is null));`);
    this.addSql(`alter table "bookings" add constraint "bookings_written_answer_length_check" check (char_length(written_answer) <= 20000);`);

    this.addSql(`alter table "notifications" drop constraint "notifications_kind_check";`);
    this.addSql(`alter table "notifications" add constraint "notifications_kind_check" check (kind in ('booking_confirmed', 'answer_posted'));`);
  }

  override down(): void | Promise<void> {
    // Older code reads every notification as a booking confirmation: remove the new kind first.
    this.addSql(`delete from "notifications" where "kind" = 'answer_posted';`);
    this.addSql(`alter table "notifications" drop constraint "notifications_kind_check";`);
    this.addSql(`alter table "notifications" add constraint "notifications_kind_check" check (kind in ('booking_confirmed'));`);

    this.addSql(`alter table "bookings" drop constraint "bookings_written_answer_length_check";`);
    this.addSql(`alter table "bookings" drop constraint "bookings_written_answer_pair_check";`);
    this.addSql(`alter table "bookings" drop column "written_answer", drop column "written_answer_at";`);
  }

}
