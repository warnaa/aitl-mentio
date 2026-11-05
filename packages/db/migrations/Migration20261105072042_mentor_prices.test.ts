import { expect, it } from 'vitest';
import { Migration20261105072042_mentor_prices as Migration } from './Migration20261105072042_mentor_prices';
it('adds nullable positive integer prices and reverses both columns and checks', () => {
  const migration = new Migration(undefined as never, undefined as never);
  expect(migration.name).toBe('Migration20261105072042_mentor_prices'); migration.up();
  expect(migration.getQueries().join('\n')).toContain('"price_25_cents" int null'); expect(migration.getQueries().join('\n')).toContain('check (price_50_cents > 0)');
  const down = new Migration(undefined as never, undefined as never); down.down();
  expect(down.getQueries().join('\n')).toContain('drop column "price_25_cents", drop column "price_50_cents"');
});
