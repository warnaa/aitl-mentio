import { Booking, PaymentAttempt, type IBooking } from '@devmentor/db';
import type { CheckoutSession, PaymentEvent } from '../../../packages/core/src/services/payments/payment-gateway.port';
import { postBooking, withBookingFixture, type BookingFixture, type BookingPayload } from './booking';

/** Explicitly synthetic provider marker; accepted only by the isolated mock adapter. */
export const MOCK_PAYMENT_SIGNATURE = 'devmentor-mock-payment';

export interface PaymentFixture extends BookingFixture {
  booking: BookingPayload;
}

export interface CheckoutPayload {
  bookingId: string;
  url: string;
  expiresAt: string;
}

export const postCheckout = (fixture: PaymentFixture, headers = fixture.first, bookingId = fixture.booking.id) =>
  fetch(`${fixture.base}/api/bookings/${bookingId}/checkout`, {
    method: 'POST', headers, body: '{}',
  });

export async function paymentAttempt(fixture: PaymentFixture) {
  return fixture.em.fork().findOneOrFail(PaymentAttempt, { booking: fixture.booking.id });
}

/** Normalized provider evidence, never an untrusted browser-supplied booking mutation. */
export async function paymentEvent(
  fixture: PaymentFixture,
  eventId: string,
  overrides: Partial<CheckoutSession> = {},
  type = 'checkout.session.completed',
): Promise<PaymentEvent> {
  const attempt = await paymentAttempt(fixture);
  if (!attempt.sessionId) throw new Error('Checkout fixture has no attached provider session');
  return {
    id: eventId,
    type,
    session: {
      id: attempt.sessionId,
      url: null,
      bookingId: fixture.booking.id,
      attemptId: attempt.id,
      amountCents: fixture.booking.priceCents,
      currency: fixture.booking.currency,
      paymentIntentId: `pi_fixture_${attempt.id}`,
      paid: true,
      status: 'complete',
      livemode: false,
      refundedCents: 0,
      ...overrides,
    },
  };
}

export const postPaymentEvent = (fixture: PaymentFixture, event: PaymentEvent, signature = MOCK_PAYMENT_SIGNATURE) =>
  fetch(`${fixture.base}/api/payments/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': signature },
    body: JSON.stringify(event),
  });

export const storedBooking = (fixture: PaymentFixture): Promise<IBooking> =>
  fixture.em.fork().findOneOrFail(Booking, { id: fixture.booking.id });

/** Each case owns a fresh mentor, two mentees, slot and unpaid API reservation. */
export async function withPaymentFixture(caseId: string, run: (fixture: PaymentFixture) => Promise<void>) {
  await withBookingFixture(`payment-${caseId}`, async fixture => {
    const response = await postBooking(fixture);
    if (response.status !== 201) throw new Error(`Payment reservation fixture answered ${response.status}`);
    const booking = (await response.json()).data as BookingPayload;
    await run({ ...fixture, booking });
  });
}
