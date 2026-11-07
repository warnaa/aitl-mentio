import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { User } from '../auth/user.entity';
import { Booking } from '../bookings/booking.entity';

const p = defineEntity.properties;

/**
 * One line of plain text a party posted in a booking's text session. The booking is the
 * conversation (one to one), so there is no session table: the open/ended window is derived
 * from the booking's start and length. Rows are never edited or deleted by the product.
 */
export const SessionMessage = defineSingletonEntity('SessionMessage', () =>
  defineEntity({
    name: 'SessionMessage',
    tableName: 'session_messages',
    checks: [{ name: 'session_messages_body_length_check', expression: 'char_length(body) between 1 and 4000' }],
    indexes: [{ name: 'session_messages_booking_created_index', properties: ['booking', 'createdAt', 'id'] }],
    properties: {
      ...baseProperties,
      booking: () => p.manyToOne(Booking).deleteRule('no action'),
      author: () => p.manyToOne(User).deleteRule('no action'),
      body: p.text(),
    },
  }),
);

export type ISessionMessage = InferEntity<typeof SessionMessage>;
