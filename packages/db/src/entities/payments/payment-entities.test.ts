import { MikroORM } from '@mikro-orm/postgresql';
import { expect, it } from 'vitest';
import { entities, PaymentAttempt, PaymentResolution, ProcessedWebhookEvent } from '../index';

it('discovers durable attempts, minimal webhook evidence and append-only operator decisions', async () => {
  const orm = await MikroORM.init({ entities, clientUrl: 'postgresql://unused:unused@127.0.0.1:1/unused' });
  try {
    const sql = await orm.schema.getCreateSchemaSQL({ wrap: false });
    for (const entity of [PaymentAttempt, PaymentResolution, ProcessedWebhookEvent]) expect(entities).toContain(entity);
    for (const name of ['payment_attempts_booking_id_unique', 'payment_attempts_idempotency_key_unique', 'payment_attempts_session_id_unique', 'processed_webhook_events_event_id_unique', 'payment_attempts_reconciliation_index', 'bookings_stripe_payment_intent_id_unique']) expect(sql).toContain(name);
    expect(sql).toContain("state in ('creating', 'open', 'confirmed', 'expired', 'review')");
    expect(sql).toContain("action in ('confirm', 'release')");
    expect(sql).toContain('"payment_pending" boolean not null default false');
    expect(orm.getMetadata().get(PaymentAttempt).properties.booking.deleteRule).toBe('no action');
    expect(orm.getMetadata().get(ProcessedWebhookEvent).properties.booking.nullable).toBe(true);
    expect(orm.getMetadata().get(PaymentResolution).properties.actor.deleteRule).toBe('no action');
  } finally { await orm.close(); }
});
