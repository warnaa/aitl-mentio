import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { Booking } from '../bookings/booking.entity';

const p = defineEntity.properties;

/** Minimal event evidence; never stores raw payloads, bearer URLs or customer data. */
export const ProcessedWebhookEvent = defineSingletonEntity('ProcessedWebhookEvent', () => defineEntity({
  name: 'ProcessedWebhookEvent',
  tableName: 'processed_webhook_events',
  properties: {
    ...baseProperties,
    eventId: p.string().unique(),
    type: p.string(),
    receivedAt: p.datetime(),
    booking: () => p.manyToOne(Booking).nullable().deleteRule('no action'),
    sessionId: p.string(),
    outcome: p.string(),
  },
}));

export type IProcessedWebhookEvent = InferEntity<typeof ProcessedWebhookEvent>;
