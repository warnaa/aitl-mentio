import { Migration } from '@mikro-orm/migrations';

export class Migration20261104225821_mentor_page extends Migration {
  override name = 'Migration20261104225821_mentor_page';

  override up(): void | Promise<void> {
    this.addSql(
      `alter table "mentor_profiles" add "slug" varchar(60) null, add "public_work_url" text null, add "stack_tags" text[] not null default '{}', add "published_at" timestamptz null;`,
    );
    this.addSql(
      `alter table "mentor_profiles" add constraint "mentor_profiles_slug_unique" unique ("slug");`,
    );
    this.addSql(
      `alter table "mentor_profiles" add constraint "mentor_profiles_published_slug_check" check (published_at is null or slug is not null);`,
    );
    this.addSql(
      `alter table "mentor_profiles" add constraint "mentor_profiles_stack_tags_check" check (stack_tags <@ array['typescript','react','python','ai-agents']::text[] and array_position(stack_tags, null) is null);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "mentor_profiles" drop constraint "mentor_profiles_slug_unique";`);
    this.addSql(`alter table "mentor_profiles" drop constraint "mentor_profiles_published_slug_check";`);
    this.addSql(`alter table "mentor_profiles" drop constraint "mentor_profiles_stack_tags_check";`);
    this.addSql(
      `alter table "mentor_profiles" drop column "slug", drop column "public_work_url", drop column "stack_tags", drop column "published_at";`,
    );
  }
}
