import { Migration } from '@mikro-orm/migrations';

export class Migration20261110090000_booking_cancellation extends Migration {

  override name = 'Migration20261110090000_booking_cancellation';

  override up(): void | Promise<void> {
    this.addSql(`alter table "bookings" add "cancelled_at" timestamptz null, add "refund_status" varchar(16) not null default 'none', add "stripe_refund_id" varchar(255) null, add "refund_next_attempt_at" timestamptz null;`);
    // No writer produced 'cancelled' before E03-S05; any such row (a fixture or a hand edit) takes its last update as the cancellation time.
    this.addSql(`update "bookings" set "cancelled_at" = "updated_at" where "status" = 'cancelled';`);
    this.addSql(`alter table "bookings" add constraint "bookings_stripe_refund_id_unique" unique ("stripe_refund_id");`);
    this.addSql(`alter table "bookings" add constraint "bookings_refund_status_check" check ("refund_status" in ('none', 'pending', 'refunded', 'failed'));`);
    this.addSql(`alter table "bookings" add constraint "bookings_cancelled_at_check" check ((status = 'cancelled') = (cancelled_at is not null));`);
    this.addSql(`alter table "bookings" add constraint "bookings_refund_state_check" check (refund_status = 'none' or status = 'cancelled');`);
    this.addSql(`alter table "notifications" drop constraint "notifications_kind_check";`);
    this.addSql(`alter table "notifications" add constraint "notifications_kind_check" check (kind in ('booking_confirmed', 'answer_posted', 'note_awaiting_approval', 'note_approved', 'note_declined', 'booking_cancelled'));`);
  }

  override down(): void | Promise<void> {
    // Refund evidence lives in these columns: settle pending refunds and export cancelled bookings before reverting.
    this.addSql(`delete from "notifications" where "kind" = 'booking_cancelled';`);
    this.addSql(`alter table "notifications" drop constraint "notifications_kind_check";`);
    this.addSql(`alter table "notifications" add constraint "notifications_kind_check" check (kind in ('booking_confirmed', 'answer_posted', 'note_awaiting_approval', 'note_approved', 'note_declined'));`);
    this.addSql(`alter table "bookings" drop constraint "bookings_refund_state_check";`);
    this.addSql(`alter table "bookings" drop constraint "bookings_cancelled_at_check";`);
    this.addSql(`alter table "bookings" drop constraint "bookings_refund_status_check";`);
    this.addSql(`alter table "bookings" drop constraint "bookings_stripe_refund_id_unique";`);
    this.addSql(`alter table "bookings" drop column "cancelled_at", drop column "refund_status", drop column "stripe_refund_id", drop column "refund_next_attempt_at";`);
  }

}
