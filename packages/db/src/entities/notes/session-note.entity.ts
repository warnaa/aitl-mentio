import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { Booking } from '../bookings/booking.entity';

const p = defineEntity.properties;

/** Private revision of a booking's session note. Sent bodies are immutable in the service. */
export const SessionNote = defineSingletonEntity('SessionNote', () => defineEntity({
  name: 'SessionNote',
  tableName: 'session_notes',
  uniques: [{ name: 'session_notes_booking_version_unique', properties: ['booking', 'version'] }],
  checks: [
    { name: 'session_notes_body_check', expression: 'char_length(btrim(body)) between 1 and 20000' },
    { name: 'session_notes_state_check', expression: "(status = 'draft' and sent_at is null and decided_at is null and decline_comment is null) or (status = 'awaiting_approval' and sent_at is not null and decided_at is null and decline_comment is null) or (status = 'approved' and sent_at is not null and decided_at is not null and decline_comment is null) or (status = 'declined' and sent_at is not null and decided_at is not null and decline_comment is not null and char_length(btrim(decline_comment)) between 1 and 2000)" },
  ],
  properties: {
    ...baseProperties,
    booking: () => p.manyToOne(Booking).deleteRule('no action'),
    version: p.integer().check('version >= 1'),
    revision: p.integer().check('revision >= 1'),
    body: p.text(),
    status: p.string().length(32),
    declineComment: p.text().nullable(),
    sentAt: p.datetime().nullable(),
    decidedAt: p.datetime().nullable(),
  },
}));

export type ISessionNote = InferEntity<typeof SessionNote>;
