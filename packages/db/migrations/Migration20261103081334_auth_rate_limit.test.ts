import { describe, expect, it } from 'vitest';
import { Migration20261103081334_auth_rate_limit } from './Migration20261103081334_auth_rate_limit';

/** Statement-level guard; TC-RATE-LIMIT-001 runs the table against a real PostgreSQL. */
function statements(direction: 'up' | 'down'): string[] {
  const migration = new Migration20261103081334_auth_rate_limit(undefined as never, undefined as never);
  migration[direction]();
  return migration.getQueries().map(String);
}

describe('Migration20261103081334_auth_rate_limit', () => {
  it('keeps a stable name', () => {
    expect(new Migration20261103081334_auth_rate_limit(undefined as never, undefined as never).name).toBe(
      'Migration20261103081334_auth_rate_limit',
    );
  });

  it('creates the counter table with a text primary key and the window_start index', () => {
    expect(statements('up')).toEqual([
      'create table "auth_rate_limits" ("key" text not null, "window_start" timestamptz not null, "count" int not null, primary key ("key"));',
      'create index "auth_rate_limits_window_start_index" on "auth_rate_limits" ("window_start");',
    ]);
  });

  it('drops the table on down', () => {
    expect(statements('down')).toEqual(['drop table if exists "auth_rate_limits" cascade;']);
  });
});
