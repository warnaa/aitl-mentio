import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { User } from '../auth/user.entity';
import { PaymentAttempt } from './payment-attempt.entity';

const p = defineEntity.properties;

/** Append-only operator decisions, not an editable status/comment field. */
export const PaymentResolution = defineSingletonEntity('PaymentResolution', () => defineEntity({
  name: 'PaymentResolution',
  tableName: 'payment_resolutions',
  properties: {
    ...baseProperties,
    attempt: () => p.manyToOne(PaymentAttempt).deleteRule('no action'),
    actor: () => p.manyToOne(User).deleteRule('no action'),
    action: p.string().check("action in ('confirm', 'release')"),
    reason: p.string().length(500),
    sessionId: p.string(),
    paymentIntentId: p.string().nullable(),
  },
}));

export type IPaymentResolution = InferEntity<typeof PaymentResolution>;
