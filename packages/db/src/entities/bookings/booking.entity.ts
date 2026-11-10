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
      // The written answer (E04-S02) and its latest save time exist together or not at all.
      { name: 'bookings_written_answer_pair_check', expression: '(written_answer is null) = (written_answer_at is null)' },
      { name: 'bookings_written_answer_length_check', expression: 'char_length(written_answer) <= 20000' },
      // E03-S06 (R10): the fee in force at confirmation and the mentor's share, recorded together,
      // never changed afterwards, and always summing to the price. Every paid booking carries one.
      { name: 'bookings_fee_snapshot_pair_check', expression: '(fee_percent_applied is null) = (platform_fee_cents is null) and (platform_fee_cents is null) = (mentor_share_cents is null)' },
      { name: 'bookings_fee_snapshot_values_check', expression: 'fee_percent_applied is null or (fee_percent_applied between 0 and 100 and platform_fee_cents >= 0 and mentor_share_cents >= 0 and platform_fee_cents + mentor_share_cents = price_cents)' },
      { name: 'bookings_paid_fee_snapshot_check', expression: 'paid_at is null or fee_percent_applied is not null' },
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
      // One plain-text answer per session, written by the booking's mentor; replaceable, no history.
      writtenAnswer: p.text().nullable(),
      writtenAnswerAt: p.datetime().nullable(),
      feePercentApplied: p.smallint().nullable(),
      platformFeeCents: p.integer().nullable(),
      mentorShareCents: p.integer().nullable(),
    },
  }),
);

export type IBooking = InferEntity<typeof Booking>;
