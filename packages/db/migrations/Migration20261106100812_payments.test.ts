import { expect, it } from 'vitest';
import { Migration20261106100812_payments as Migration } from './Migration20261106100812_payments';

it('adds durable money identity, retries and operator audit records with a reversible migration', () => {
  const up = new Migration(undefined as never, undefined as never); up.up();
  expect(up.name).toBe('Migration20261106100812_payments');
  const sql = up.getQueries().join('\n');
  for (const table of ['payment_attempts', 'processed_webhook_events', 'payment_resolutions']) expect(sql).toContain(`create table "${table}"`);
  expect(sql).toContain('"payment_pending" boolean not null default false');
  expect(sql).toContain('bookings_stripe_payment_intent_id_unique');
  expect(sql).toContain('processed_webhook_events_event_id_unique');
  expect(sql).toContain('on delete no action');
  const down = new Migration(undefined as never, undefined as never); down.down();
  expect(down.getQueries().join('\n')).toContain('drop table if exists "payment_attempts"');
  expect(down.getQueries().join('\n')).toContain('drop column "payment_pending"');
});
