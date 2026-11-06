import type { IBooking } from '@devmentor/db';
import { SessionLengths } from '../../domain/vocabularies/session-lengths';

export const MINUTE_MS = 60_000;
/** D22 requires two hours' notice; the platform does not promise immediate help. */
export const MIN_LEAD_MINUTES = 120;
export const HOLD_MINUTES = 30;

export function activeOccupancy(now: Date) {
  return { $or: [
    { status: 'confirmed' as const },
    { status: 'pending' as const, expiresAt: { $gt: now } },
    { status: 'pending' as const, paymentPending: true },
  ] };
}

/** Half-open intervals permit back-to-back sessions, including across slot IDs. */
export function overlappingInterval(startsAt: Date, lengthMinutes: number) {
  return {
    startsAt: { $lt: new Date(startsAt.getTime() + lengthMinutes * MINUTE_MS) },
    $or: SessionLengths.values.map(length => ({
      lengthMinutes: length,
      startsAt: { $gt: new Date(startsAt.getTime() - length * MINUTE_MS) },
    })),
  };
}

export function viableLengths(startsAt: Date, bookings: Pick<IBooking, 'startsAt' | 'lengthMinutes'>[]) {
  return SessionLengths.values.filter(length => !bookings.some(booking =>
    startsAt.getTime() < booking.startsAt.getTime() + booking.lengthMinutes * MINUTE_MS &&
    booking.startsAt.getTime() < startsAt.getTime() + length * MINUTE_MS));
}
