import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { Booking } from '../bookings/booking.entity';

const p = defineEntity.properties;

export const PaymentAttempt = defineSingletonEntity('PaymentAttempt', () => defineEntity({
  name: 'PaymentAttempt',
  tableName: 'payment_attempts',
  indexes: [{ name: 'payment_attempts_reconciliation_index', properties: ['state', 'nextReconciliationAt'] }],
  properties: {
    ...baseProperties,
    booking: () => p.manyToOne(Booking).unique().deleteRule('no action'),
    idempotencyKey: p.string().unique(),
    sessionId: p.string().nullable().unique(),
    state: p.string().check("state in ('creating', 'open', 'confirmed', 'expired', 'review')"),
    expiresAt: p.datetime(),
    successUrl: p.string().length(2048),
    cancelUrl: p.string().length(2048),
    nextReconciliationAt: p.datetime(),
    diagnosticCode: p.string().nullable(),
    submissionCount: p.integer().default(0),
    rejectedSubmissionCount: p.integer().default(0),
  },
}));

export type IPaymentAttempt = InferEntity<typeof PaymentAttempt>;
