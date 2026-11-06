import { expect, it } from 'vitest';
import { Migration20261106153514_notifications as Migration } from './Migration20261106153514_notifications';

it('adds the idempotent notifications table and reverses only that addition', () => {
  const up = new Migration(undefined as never, undefined as never);
  expect(up.name).toBe('Migration20261106153514_notifications');
  up.up();
  const sql = up.getQueries().join('\n');
  expect(sql).toContain('create table "notifications"');
  expect(sql).toContain('notifications_user_kind_booking_unique" unique ("user_id", "kind", "booking_id")');
  expect(sql).toContain('notifications_user_created_index');
  expect(sql).toContain("kind in ('booking_confirmed')");
  expect(sql).toContain('"read_at" timestamptz null');
  expect(sql).toContain('"email_sent_at" timestamptz null');
  expect(sql.match(/on delete no action/g)).toHaveLength(2);
  expect(sql).not.toContain('bookings_currency_check');
  const down = new Migration(undefined as never, undefined as never);
  down.down();
  expect(down.getQueries()).toEqual(['drop table if exists "notifications" cascade;']);
});
