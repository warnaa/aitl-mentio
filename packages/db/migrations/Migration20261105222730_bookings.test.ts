import { expect, it } from 'vitest';
import { Migration20261105222730_bookings as Migration } from './Migration20261105222730_bookings';

it('creates history-preserving bookings with active-only uniqueness and reverses the addition', () => {
  const up = new Migration(undefined as never, undefined as never);
  expect(up.name).toBe('Migration20261105222730_bookings');
  up.up();
  const sql = up.getQueries().join('\n');
  expect(sql).toContain('create table "bookings"');
  expect(sql).toContain("where status in ('pending', 'confirmed')");
  expect(sql).toContain('length_minutes in (25, 50)');
  expect(sql).toContain('price_cents > 0');
  expect(sql).toContain("currency = 'PLN'");
  expect(sql).toContain("status <> 'pending' or expires_at is not null");
  expect(sql).toContain('on delete no action');
  expect(sql).toContain('bookings_stripe_checkout_session_id_unique');
  const down = new Migration(undefined as never, undefined as never);
  down.down();
  expect(down.getQueries()).toEqual(['drop table if exists "bookings" cascade;']);
});
