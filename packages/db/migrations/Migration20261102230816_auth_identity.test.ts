import { describe, expect, it } from 'vitest';
import { Migration20261102230816_auth_identity } from './Migration20261102230816_auth_identity';

/**
 * Statement-level guard for the hand-edited parts of the migration. The schema effect
 * itself (up → down → up against a real PostgreSQL) is exercised by
 * `tests/integration/migrations.integration.test.ts`.
 */
function statements(direction: 'up' | 'down'): string[] {
  const migration = new Migration20261102230816_auth_identity(
    undefined as never,
    undefined as never,
  );
  migration[direction]();
  return migration.getQueries().map(String);
}

const IDENTITY_COLUMNS = [
  '"roles" text[] not null default \'{mentee}\'',
  '"github_id" varchar(64) null',
  '"github_login" varchar(64) null',
  '"avatar_url" text null',
  '"email_verified_at" timestamptz null',
  '"session_version" int not null default 0',
];

describe('Migration20261102230816_auth_identity', () => {
  it('keeps a stable name', () => {
    const migration = new Migration20261102230816_auth_identity(
      undefined as never,
      undefined as never,
    );
    expect(migration.name).toBe('Migration20261102230816_auth_identity');
  });

  it('adds every identity column with its type, nullability and default', () => {
    const [addColumns] = statements('up');

    for (const column of IDENTITY_COLUMNS) {
      expect(addColumns).toContain(`add ${column}`);
    }
  });

  it('makes github_id unique and constrains the roles array', () => {
    const up = statements('up').join('\n');

    expect(up).toContain('add constraint "users_github_id_unique" unique ("github_id")');
    expect(up).toContain('add constraint "users_roles_check" check (');
    expect(up).toContain('cardinality(roles) > 0');
    expect(up).toContain('array_ndims(roles) = 1');
    expect(up).toContain('array_position(roles, null) is null');
    expect(up).toContain("roles <@ array['mentee', 'mentor', 'operator']::text[]");
  });

  it('backfills email_verified_at for every existing row, after the columns exist', () => {
    const up = statements('up');

    expect(up.at(-1)).toBe(
      'update "users" set "email_verified_at" = now() where "email_verified_at" is null;',
    );
  });

  it('reverts by dropping both constraints and all six columns', () => {
    const down = statements('down');

    expect(down).toEqual([
      'alter table "users" drop constraint "users_github_id_unique";',
      'alter table "users" drop constraint "users_roles_check";',
      'alter table "users" drop column "roles", drop column "github_id", drop column "github_login", drop column "avatar_url", drop column "email_verified_at", drop column "session_version";',
    ]);
  });
});
