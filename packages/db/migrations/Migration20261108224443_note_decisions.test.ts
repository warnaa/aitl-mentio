import { expect, it } from 'vitest';
import { Migration20261108224443_note_decisions as Migration } from './Migration20261108224443_note_decisions';

const queries = (direction: 'up' | 'down') => {
  const migration = new Migration(undefined as never, undefined as never);
  void migration[direction]();
  return migration.getQueries().map(String);
};

it('makes note notifications version-aware, backfills sent notes and touches nothing else', () => {
  expect(new Migration(undefined as never, undefined as never).name).toBe('Migration20261108224443_note_decisions');
  const up = queries('up');
  const sql = up.join('\n');
  expect(sql).toContain(`set "note_version" = 1 where "kind" = 'note_awaiting_approval'`);
  expect(sql).toContain('notifications_user_kind_booking_version_unique');
  expect(sql).toContain("'note_approved', 'note_declined'");
  expect(up.findIndex(q => q.includes('set "note_version"'))).toBeLessThan(up.findIndex(q => q.includes('notifications_note_version_check')));
  for (const unrelated of ['bookings_currency_check', 'session_messages', 'session_notes']) expect(sql).not.toContain(unrelated);
});

it('removes rows the old identity cannot hold before restoring it', () => {
  const down = queries('down');
  expect(down[0]).toBe(`delete from "notifications" where "kind" in ('note_approved', 'note_declined') or "note_version" > 1;`);
  expect(down.join('\n')).toContain('unique ("user_id", "kind", "booking_id");');
  expect(down.join('\n')).toContain("check (kind in ('booking_confirmed', 'answer_posted', 'note_awaiting_approval'))");
});
