import { Booking, LockMode, MentorProfile, Slot, User, type EntityManager, type IBooking } from '@devmentor/db';
import { requireRole, type Session } from '../../http/auth';
import { parseWith } from '../../http/body';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../http/errors';
import type { Clock } from '../../time/clock';
import { bookingCreateSchema, type BookingCreate } from '../../validators/bookings/booking-create.schema';
import { mentorOfferReady } from '../mentors/readiness';
import type { PricePolicy } from '../operator/platform-settings.service';
import { activeOccupancy, HOLD_MINUTES, MIN_LEAD_MINUTES, MINUTE_MS, overlappingInterval } from './occupancy';

export function toBookingDto(booking: IBooking) {
  return {
    id: booking.id, slotId: booking.slot.id, mentorProfileId: booking.mentorProfile.id,
    lengthMinutes: booking.lengthMinutes, priceCents: booking.priceCents, currency: booking.currency,
    status: booking.status, startsAt: booking.startsAt.toISOString(), expiresAt: booking.expiresAt!.toISOString(),
  };
}
export type BookingDto = ReturnType<typeof toBookingDto>;

export interface BookingServiceDeps {
  em: EntityManager;
  session: Promise<Session | null>;
  clock: Clock;
  platformSettingsService: { get(): Promise<PricePolicy> };
}

export class BookingService {
  constructor(private readonly deps: BookingServiceDeps) {}

  async start(input: BookingCreate) {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    const { userId } = requireRole(session, 'mentee');
    const data = parseWith(bookingCreateSchema, input);
    // This read only discovers the lock owner; every invariant is rechecked after locking.
    const offered = await this.deps.em.findOne(Slot, { id: data.slotId, removedAt: null });
    if (!offered) throw new NotFoundError('Slot not found');
    // Read before the transaction, so it never waits for a second pooled connection while this
    // one holds the mentor and slot locks.
    const settings = await this.deps.platformSettingsService.get();
    return this.deps.em.fork().transactional(async em => {
      const mentorProfile = await em.findOne(MentorProfile, { id: offered.mentorProfile.id }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
      if (!mentorProfile) throw new NotFoundError('Mentor profile not found');
      const slot = await em.findOne(Slot, { id: data.slotId, mentorProfile: mentorProfile.id, removedAt: null }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
      if (!slot) throw new NotFoundError('Slot not found');
      const now = this.deps.clock.now();
      await em.nativeUpdate(Booking, { mentorProfile: mentorProfile.id, status: 'pending', paymentPending: false, expiresAt: { $lte: now } }, { status: 'expired', updatedAt: now });
      const occupant = await em.findOne(Booking, { slot: slot.id, ...activeOccupancy(now) }, { refresh: true });
      if (occupant) {
        if (occupant.status === 'pending' && occupant.mentee.id === userId && occupant.lengthMinutes === data.lengthMinutes) {
          return { booking: toBookingDto(occupant), created: false };
        }
        throw new ConflictError('This time is already reserved. Choose another time.');
      }
      if (slot.startsAt.getTime() - now.getTime() < MIN_LEAD_MINUTES * MINUTE_MS) {
        throw new ValidationError('Choose a time at least two hours ahead.', { slotId: ['Sessions need at least two hours of notice.'] });
      }
      mentorOfferReady.assert({ ...mentorProfile, settings, hasFutureSlots: true }, 'This mentor is not bookable right now.');
      const overlapping = await em.findOne(Booking, { mentorProfile: mentorProfile.id, $and: [activeOccupancy(now), overlappingInterval(slot.startsAt, data.lengthMinutes)] });
      if (overlapping) throw new ConflictError('This duration overlaps another reserved session. Choose another time or duration.');
      const booking = em.create(Booking, {
        slot, mentee: em.getReference(User, userId), mentorProfile,
        lengthMinutes: data.lengthMinutes,
        priceCents: (data.lengthMinutes === 25 ? mentorProfile.price25Cents : mentorProfile.price50Cents)!,
        currency: settings.currency, status: 'pending', startsAt: slot.startsAt,
        bookedAt: null, expiresAt: new Date(now.getTime() + HOLD_MINUTES * MINUTE_MS),
        stripeCheckoutSessionId: null, stripePaymentIntentId: null, paidAt: null, amountPaidCents: null, paymentPending: false, createdAt: now, updatedAt: now,
      });
      em.persist(booking);
      await em.flush();
      return { booking: toBookingDto(booking), created: true };
    });
  }
}
