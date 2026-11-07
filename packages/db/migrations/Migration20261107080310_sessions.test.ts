import { expect, it } from 'vitest';
import { Migration20261107080310_sessions as Migration } from './Migration20261107080310_sessions';

it('adds the session messages table and reverses only that addition', () => {
  const up = new Migration(undefined as never, undefined as never);
  expect(up.name).toBe('Migration20261107080310_sessions');
  up.up();
  const sql = up.getQueries().join('\n');
  expect(sql).toContain('create table "session_messages"');
  expect(sql).toContain('"body" text not null');
  expect(sql).toContain('session_messages_booking_created_index" on "session_messages" ("booking_id", "created_at", "id")');
  expect(sql).toContain('char_length(body) between 1 and 4000');
  expect(sql.match(/on delete no action/g)).toHaveLength(2);
  expect(sql).not.toContain('bookings_currency_check');
  const down = new Migration(undefined as never, undefined as never);
  down.down();
  expect(down.getQueries()).toEqual(['drop table if exists "session_messages" cascade;']);
});
