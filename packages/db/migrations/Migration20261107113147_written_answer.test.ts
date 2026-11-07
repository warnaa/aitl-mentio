import { expect, it } from 'vitest';
import { Migration20261107113147_written_answer as Migration } from './Migration20261107113147_written_answer';

it('adds the written answer columns and the notification kind, and reverses only those', () => {
  const up = new Migration(undefined as never, undefined as never);
  expect(up.name).toBe('Migration20261107113147_written_answer');
  up.up();
  const sql = up.getQueries().join('\n');
  expect(sql).toContain('add "written_answer" text null, add "written_answer_at" timestamptz null');
  expect(sql).toContain('check ((written_answer is null) = (written_answer_at is null))');
  expect(sql).toContain('check (char_length(written_answer) <= 20000)');
  expect(sql).toContain("check (kind in ('booking_confirmed', 'answer_posted'))");
  expect(sql).not.toContain('bookings_currency_check');
  expect(sql).not.toContain('session_messages');

  const down = new Migration(undefined as never, undefined as never);
  down.down();
  const reverse = down.getQueries();
  // The new kind's rows go before the check narrows, so the narrower check can be added.
  expect(reverse[0]).toBe(`delete from "notifications" where "kind" = 'answer_posted';`);
  expect(reverse.join('\n')).toContain("check (kind in ('booking_confirmed'))");
  expect(reverse.at(-1)).toBe('alter table "bookings" drop column "written_answer", drop column "written_answer_at";');
  expect(reverse.join('\n')).not.toContain('bookings_currency_check');
});
