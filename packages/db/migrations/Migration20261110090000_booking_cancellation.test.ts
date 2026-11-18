import { expect, it } from 'vitest';
import { Migration20261110090000_booking_cancellation as Migration } from './Migration20261110090000_booking_cancellation';

const queries = (direction: 'up' | 'down') => {
  const migration = new Migration(undefined as never, undefined as never);
  void migration[direction]();
  return migration.getQueries().map(String);
};

it('adds cancellation and refund state, backfills existing cancelled rows before the pairing check, and touches nothing else', () => {
  expect(new Migration(undefined as never, undefined as never).name).toBe('Migration20261110090000_booking_cancellation');
  const up = queries('up');
  const sql = up.join('\n');
  for (const column of ['"cancelled_at" timestamptz null', `"refund_status" varchar(16) not null default 'none'`, '"stripe_refund_id" varchar(255) null', '"refund_next_attempt_at" timestamptz null']) {
    expect(sql).toContain(column);
  }
  expect(up.findIndex(q => q.includes('set "cancelled_at" = "updated_at"'))).toBeLessThan(up.findIndex(q => q.includes('bookings_cancelled_at_check')));
  expect(sql).toContain('bookings_stripe_refund_id_unique');
  expect(sql).toContain("'note_declined', 'booking_cancelled'");
  for (const unrelated of ['bookings_currency_check', 'session_messages', 'session_notes', 'payment_attempts']) expect(sql).not.toContain(unrelated);
});

it('removes rows the old notification kinds cannot hold before restoring the check, then drops the columns', () => {
  const down = queries('down');
  expect(down[0]).toBe(`delete from "notifications" where "kind" = 'booking_cancelled';`);
  expect(down.join('\n')).toContain("check (kind in ('booking_confirmed', 'answer_posted', 'note_awaiting_approval', 'note_approved', 'note_declined'))");
  expect(down.at(-1)).toContain('drop column "cancelled_at"');
});
