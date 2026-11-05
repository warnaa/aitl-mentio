import { expect, it } from 'vitest';
import { Migration20261105065903_availability_slots as Migration } from './Migration20261105065903_availability_slots';

it('creates the owner-indexed, partial-unique slot table and reverses both additions', () => {
  const up = new Migration(undefined as never, undefined as never);
  expect(up.name).toBe('Migration20261105065903_availability_slots');
  up.up();
  expect(up.getQueries().join('\n')).toContain('where removed_at is null');
  expect(up.getQueries().join('\n')).toContain('on delete cascade');
  const down = new Migration(undefined as never, undefined as never);
  down.down();
  expect(down.getQueries().join('\n')).toContain('drop table if exists "slots"');
  expect(down.getQueries().join('\n')).toContain('drop column "last_published_availability_at"');
});
