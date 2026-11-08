import { expect, it } from 'vitest';
import { Migration20261107171237_session_notes as Migration } from './Migration20261107171237_session_notes';

it('creates private notes and widens only the notification check, reversibly removing new notifications first', () => {
  const up = new Migration(undefined as never, undefined as never);
  expect(up.name).toBe('Migration20261107171237_session_notes');
  up.up();
  const sql = up.getQueries().join('\n');
  for (const part of ['create table "session_notes"', 'session_notes_booking_version_unique', 'session_notes_state_check', 'version >= 1', 'revision >= 1', 'note_awaiting_approval']) expect(sql).toContain(part);
  expect(sql).not.toContain('bookings_currency_check');
  expect(sql).not.toContain('session_messages');
  const down = new Migration(undefined as never, undefined as never);
  down.down();
  expect(down.getQueries()[0]).toBe(`delete from "notifications" where "kind" = 'note_awaiting_approval';`);
  expect(down.getQueries().join('\n')).toContain("check (kind in ('booking_confirmed', 'answer_posted'))");
  expect(down.getQueries().join('\n')).toContain('drop table if exists "session_notes"');
});
