import { expect, it } from 'vitest';
import { Migration20261110103105_fee_split as Migration } from './Migration20261110103105_fee_split';

const queries = (direction: 'up' | 'down') => {
  const migration = new Migration(undefined as never, undefined as never);
  void migration[direction]();
  return migration.getQueries().map(String);
};

it('adds the fee snapshot, backfills paid bookings before requiring it, and touches nothing else', () => {
  expect(new Migration(undefined as never, undefined as never).name).toBe('Migration20261110103105_fee_split');
  const up = queries('up');
  const sql = up.join('\n');
  expect(sql).toContain('add "fee_percent_applied" smallint null, add "platform_fee_cents" int null, add "mentor_share_cents" int null');
  expect(sql).toContain('platform_fee_cents + mentor_share_cents = price_cents');
  expect(sql).toContain('coalesce((select "fee_percent" from "platform_settings" where "id" = 1), 20)');
  expect(sql).toContain('(b.price_cents::bigint * f.fee + 50) / 100');
  const backfill = up.findIndex(query => query.startsWith('update "bookings"'));
  const required = up.findIndex(query => query.includes('bookings_paid_fee_snapshot_check'));
  expect(backfill).toBeGreaterThan(0);
  expect(required).toBeGreaterThan(backfill);
  for (const unrelated of ['platform_settings_fee_check', 'bookings_currency_check', 'session_messages', 'session_notes', 'notifications']) expect(sql).not.toContain(unrelated);
});

it('rolls back only the snapshot columns and their checks', () => {
  const sql = queries('down').join('\n');
  expect(sql).toContain('drop constraint if exists "bookings_paid_fee_snapshot_check"');
  expect(sql).toContain('drop column if exists "fee_percent_applied"');
  expect(sql).not.toContain('platform_settings');
});
