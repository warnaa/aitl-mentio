import { Migration } from '@mikro-orm/migrations';

export class Migration20261107171237_session_notes extends Migration {

  override name = 'Migration20261107171237_session_notes';

  override up(): void | Promise<void> {
    this.addSql(`create table "session_notes" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "booking_id" uuid not null, "version" int not null, "revision" int not null, "body" text not null, "status" varchar(32) not null, "decline_comment" text null, "sent_at" timestamptz null, "decided_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "session_notes" add constraint "session_notes_booking_version_unique" unique ("booking_id", "version");`);



    this.addSql(`alter table "notifications" drop constraint "notifications_kind_check";`);
    this.addSql(`alter table "notifications" add constraint "notifications_kind_check" check (kind in ('booking_confirmed', 'answer_posted', 'note_awaiting_approval'));`);

    this.addSql(`alter table "session_notes" add constraint "session_notes_booking_id_foreign" foreign key ("booking_id") references "bookings" ("id") on delete no action;`);
    this.addSql(`alter table "session_notes" add constraint "session_notes_body_check" check (char_length(btrim(body)) between 1 and 20000);`);
    this.addSql(`alter table "session_notes" add constraint "session_notes_state_check" check ((status = 'draft' and sent_at is null and decided_at is null and decline_comment is null) or (status = 'awaiting_approval' and sent_at is not null and decided_at is null and decline_comment is null) or (status = 'approved' and sent_at is not null and decided_at is not null and decline_comment is null) or (status = 'declined' and sent_at is not null and decided_at is not null and decline_comment is not null and char_length(btrim(decline_comment)) between 1 and 2000));`);
    this.addSql(`alter table "session_notes" add constraint "session_notes_version_check" check (version >= 1);`);
    this.addSql(`alter table "session_notes" add constraint "session_notes_revision_check" check (revision >= 1);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`delete from "notifications" where "kind" = 'note_awaiting_approval';`);
    this.addSql(`drop table if exists "session_notes" cascade;`);


    this.addSql(`alter table "notifications" drop constraint "notifications_kind_check";`);
    this.addSql(`alter table "notifications" add constraint "notifications_kind_check" check (kind in ('booking_confirmed', 'answer_posted'));`);

  }

}
