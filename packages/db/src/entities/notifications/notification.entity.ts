import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { User } from '../auth/user.entity';
import { Booking } from '../bookings/booking.entity';

const p = defineEntity.properties;

/**
 * One in-product message to one participant about one booking: its confirmation, or its
 * written answer arriving. The unique index makes a replayed event idempotent; `emailSentAt` guards the
 * email. For `booking_confirmed` it is set after the provider accepted it; for `answer_posted` it
 * is a claim set just before sending and cleared if the send throws, so a crash between the claim
 * and the send leaves that email unsent (at most once, never twice).
 */
export const Notification = defineSingletonEntity('Notification', () =>
  defineEntity({
    name: 'Notification',
    tableName: 'notifications',
    indexes: [{ name: 'notifications_user_created_index', properties: ['user', 'createdAt'] }],
    uniques: [{ name: 'notifications_user_kind_booking_unique', properties: ['user', 'kind', 'booking'] }],
    properties: {
      ...baseProperties,
      user: () => p.manyToOne(User).deleteRule('no action'),
      booking: () => p.manyToOne(Booking).deleteRule('no action'),
      kind: p.string().length(32).check("kind in ('booking_confirmed', 'answer_posted')"),
      readAt: p.datetime().nullable(),
      emailSentAt: p.datetime().nullable(),
    },
  }),
);

export type INotification = InferEntity<typeof Notification>;
