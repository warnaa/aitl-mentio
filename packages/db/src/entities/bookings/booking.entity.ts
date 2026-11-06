import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { Slot } from '../availability/slot.entity';
import { User } from '../auth/user.entity';
import { MentorProfile } from '../mentors/mentor-profile.entity';

const p = defineEntity.properties;

/** Historical snapshots survive release of a reservation; only active rows occupy a slot. */
export const Booking = defineSingletonEntity('Booking', () =>
  defineEntity({
    name: 'Booking',
    tableName: 'bookings',
    checks: [
      { name: 'bookings_pending_expiry_check', expression: "status <> 'pending' or expires_at is not null" },
    ],
    indexes: [
      { name: 'bookings_mentor_start_index', properties: ['mentorProfile', 'startsAt'] },
      {
        name: 'bookings_active_slot_unique',
        expression: 'create unique index "bookings_active_slot_unique" on "bookings" ("slot_id") where status in (\'pending\', \'confirmed\')',
      },
    ],
    properties: {
      ...baseProperties,
      slot: () => p.manyToOne(Slot).deleteRule('no action'),
      mentee: () => p.manyToOne(User).deleteRule('no action'),
      mentorProfile: () => p.manyToOne(MentorProfile).deleteRule('no action'),
      lengthMinutes: p.integer().check('length_minutes in (25, 50)'),
      priceCents: p.integer().check('price_cents > 0'),
      currency: p.string().length(3).check("currency = 'PLN'"),
      status: p.string().length(16).check("status in ('pending', 'confirmed', 'cancelled', 'expired')"),
      startsAt: p.datetime(),
      bookedAt: p.datetime().nullable(),
      expiresAt: p.datetime().nullable(),
      stripeCheckoutSessionId: p.string().nullable().unique(),
      stripePaymentIntentId: p.string().nullable().unique(),
      paidAt: p.datetime().nullable(),
      amountPaidCents: p.integer().nullable(),
      // Updated atomically with the attempt. Lazy hold expiry must never release unresolved money.
      paymentPending: p.boolean().default(false),
    },
  }),
);

export type IBooking = InferEntity<typeof Booking>;
