import { describe, expect, it } from 'vitest';
import { Migration20261104225821_mentor_page } from './Migration20261104225821_mentor_page';

/** Statement-level guard; TC-MIGRATION runs the migration both ways against a real PostgreSQL. */
function statements(direction: 'up' | 'down'): string[] {
  const migration = new Migration20261104225821_mentor_page(undefined as never, undefined as never);
  migration[direction]();
  return migration.getQueries().map(String);
}

describe('Migration20261104225821_mentor_page', () => {
  it('keeps a stable name', () => {
    expect(new Migration20261104225821_mentor_page(undefined as never, undefined as never).name).toBe('Migration20261104225821_mentor_page');
  });

  it('widens mentor_profiles with a nullable unique slug, public page fields and checks', () => {
    expect(statements('up')).toEqual([
      'alter table "mentor_profiles" add "slug" varchar(60) null, add "public_work_url" text null, add "stack_tags" text[] not null default \'{}\', add "published_at" timestamptz null;',
      'alter table "mentor_profiles" add constraint "mentor_profiles_slug_unique" unique ("slug");',
      'alter table "mentor_profiles" add constraint "mentor_profiles_published_slug_check" check (published_at is null or slug is not null);',
      'alter table "mentor_profiles" add constraint "mentor_profiles_stack_tags_check" check (stack_tags <@ array[\'typescript\',\'react\',\'python\',\'ai-agents\']::text[] and array_position(stack_tags, null) is null);',
    ]);
  });

  it('drops the constraints and columns on down', () => {
    expect(statements('down')).toEqual([
      'alter table "mentor_profiles" drop constraint "mentor_profiles_slug_unique";',
      'alter table "mentor_profiles" drop constraint "mentor_profiles_published_slug_check";',
      'alter table "mentor_profiles" drop constraint "mentor_profiles_stack_tags_check";',
      'alter table "mentor_profiles" drop column "slug", drop column "public_work_url", drop column "stack_tags", drop column "published_at";',
    ]);
  });
});
