import { describe, expect, it } from 'vitest';
import { Migration20261104000100_invitations } from './Migration20261104000100_invitations';

/** Statement-level guard; TC-MIGRATION runs the migration both ways against a real PostgreSQL. */
function statements(direction: 'up' | 'down'): string[] {
  const migration = new Migration20261104000100_invitations(undefined as never, undefined as never);
  migration[direction]();
  return migration.getQueries().map(String);
}

describe('Migration20261104000100_invitations', () => {
  it('keeps a stable name', () => {
    expect(new Migration20261104000100_invitations(undefined as never, undefined as never).name).toBe('Migration20261104000100_invitations');
  });

  it('creates invitations with its unique hash, unresolved-email index and checks, and the first deadline column', () => {
    expect(statements('up')).toEqual([
      'create table "invitations" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "email" varchar(255) not null, "token_hash" varchar(64) not null, "stack_tags" text[] not null, "expires_at" timestamptz not null, "accepted_at" timestamptz null, "accepted_by_id" uuid null, "publish_due_at" timestamptz null, "revoked_at" timestamptz null, "batch" varchar(64) null, primary key ("id"));',
      'alter table "invitations" add constraint "invitations_token_hash_unique" unique ("token_hash");',
      'create unique index "invitations_unresolved_email_unique" on "invitations" ("email") where accepted_at is null and revoked_at is null;',
      'alter table "mentor_profiles" add "initial_publish_due_at" timestamptz null;',
      'alter table "invitations" add constraint "invitations_accepted_by_id_foreign" foreign key ("accepted_by_id") references "users" ("id") on delete no action;',
      'alter table "invitations" add constraint "invitations_stack_tags_check" check (array_position(stack_tags, null) is null and stack_tags <@ array[\'typescript\', \'react\', \'python\', \'ai-agents\']::text[]);',
      'alter table "invitations" add constraint "invitations_accepted_at_check" check ((accepted_at is null) = (accepted_by_id is null));',
    ]);
  });

  it('drops the table and the deadline column on down', () => {
    expect(statements('down')).toEqual([
      'drop table if exists "invitations" cascade;',
      'alter table "mentor_profiles" drop column "initial_publish_due_at";',
    ]);
  });
});
