import { Migration } from '@mikro-orm/migrations';

export class Migration20261108224443_note_decisions extends Migration {

  override name = 'Migration20261108224443_note_decisions';

  override up(): void | Promise<void> {
    this.addSql(`alter table "notifications" drop constraint "notifications_user_kind_booking_unique";`);
    this.addSql(`alter table "notifications" drop constraint "notifications_kind_check";`);
    this.addSql(`alter table "notifications" add "note_version" int not null default 0;`);
    // Before this migration only version 1 of a note could be sent.
    this.addSql(`update "notifications" set "note_version" = 1 where "kind" = 'note_awaiting_approval';`);
    this.addSql(`alter table "notifications" add constraint "notifications_user_kind_booking_version_unique" unique ("user_id", "kind", "booking_id", "note_version");`);
    this.addSql(`alter table "notifications" add constraint "notifications_note_version_check" check ((kind like 'note_%' and note_version >= 1) or (kind not like 'note_%' and note_version = 0));`);
    this.addSql(`alter table "notifications" add constraint "notifications_kind_check" check (kind in ('booking_confirmed', 'answer_posted', 'note_awaiting_approval', 'note_approved', 'note_declined'));`);
  }

  override down(): void | Promise<void> {
    // The old identity holds one row per user, kind and booking, so later-version rows must go first.
    this.addSql(`delete from "notifications" where "kind" in ('note_approved', 'note_declined') or "note_version" > 1;`);
    this.addSql(`alter table "notifications" drop constraint "notifications_user_kind_booking_version_unique";`);
    this.addSql(`alter table "notifications" drop constraint "notifications_note_version_check";`);
    this.addSql(`alter table "notifications" drop constraint "notifications_kind_check";`);
    this.addSql(`alter table "notifications" drop column "note_version";`);
    this.addSql(`alter table "notifications" add constraint "notifications_user_kind_booking_unique" unique ("user_id", "kind", "booking_id");`);
    this.addSql(`alter table "notifications" add constraint "notifications_kind_check" check (kind in ('booking_confirmed', 'answer_posted', 'note_awaiting_approval'));`);
  }

}
