import { expect, it } from 'vitest';
import { Migration20261109224703_platform_settings as Migration } from './Migration20261109224703_platform_settings';

const queries = (direction: 'up' | 'down') => {
  const migration = new Migration(undefined as never, undefined as never);
  void migration[direction]();
  return migration.getQueries().map(String);
};

it('creates the guarded singleton settings table, inserts no row and touches nothing else', () => {
  expect(new Migration(undefined as never, undefined as never).name).toBe('Migration20261109224703_platform_settings');
  const sql = queries('up').join('\n');
  expect(sql).toContain('create table "platform_settings"');
  for (const check of ['check (id = 1)', 'price25_min_cents > 0 and price25_min_cents <= price25_max_cents', 'price50_min_cents > 0 and price50_min_cents <= price50_max_cents', 'fee_percent between 0 and 100', "currency = 'PLN'"]) expect(sql).toContain(check);
  expect(sql).toContain('"fee_percent" smallint not null default 20');
  expect(sql).toContain('on delete set null');
  expect(sql).not.toMatch(/insert into/i);
  for (const unrelated of ['bookings_currency_check', 'session_messages', 'session_notes']) expect(sql).not.toContain(unrelated);
});

it('rolls back by dropping only the new table', () => {
  expect(queries('down')).toEqual(['drop table if exists "platform_settings";']);
});
