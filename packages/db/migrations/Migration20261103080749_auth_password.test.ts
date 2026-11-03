import { describe, expect, it } from 'vitest';
import { Migration20261103080749_auth_password } from './Migration20261103080749_auth_password';

/**
 * Statement-level guard. The schema effect (up → down → up against a real PostgreSQL)
 * is exercised by `tests/integration/migrations.integration.test.ts` (TC-MIGRATION-002).
 */
function statements(direction: 'up' | 'down'): string[] {
  const migration = new Migration20261103080749_auth_password(undefined as never, undefined as never);
  migration[direction]();
  return migration.getQueries().map(String);
}

describe('Migration20261103080749_auth_password', () => {
  it('keeps a stable name', () => {
    expect(new Migration20261103080749_auth_password(undefined as never, undefined as never).name).toBe(
      'Migration20261103080749_auth_password',
    );
  });

  it('adds a nullable text password_hash and nothing else', () => {
    expect(statements('up')).toEqual(['alter table "users" add "password_hash" text null;']);
  });

  it('drops exactly that column on down', () => {
    expect(statements('down')).toEqual(['alter table "users" drop column "password_hash";']);
  });
});
