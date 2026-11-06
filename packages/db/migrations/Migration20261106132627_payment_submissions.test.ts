import { expect, it } from 'vitest';
import { Migration20261106132627_payment_submissions as Migration } from './Migration20261106132627_payment_submissions';
it('preserves definitive creation rejection evidence in both migration directions', () => {
  const up = new Migration(undefined as never, undefined as never); up.up();
  expect(up.name).toBe('Migration20261106132627_payment_submissions');
  expect(up.getQueries().join('\n')).toContain('"submission_count" int not null default 0');
  expect(up.getQueries().join('\n')).toContain('"rejected_submission_count" int not null default 0');
  const down = new Migration(undefined as never, undefined as never); down.down();
  expect(down.getQueries().join('\n')).toContain('drop column "submission_count", drop column "rejected_submission_count"');
});
