import { apiHandler, jsonOk, parseJsonBody, parseWith, requireRole, requireSession, type RateLimitPolicy } from '@devmentor/core';
import { bookingCancelSchema } from '@devmentor/core/validators/bookings/booking-cancel.schema';
import { paymentIdSchema } from '@devmentor/core/validators/payments/payment.schema';
import { withPaymentRequestScope as withRequestScope } from '../../../../../lib/payments/scope';

export const dynamic = 'force-dynamic';
/** Operational request protection; a mentee has no reason to cancel often. */
const CANCEL_POLICY: RateLimitPolicy = { scope: 'cancel', kind: 'account', limit: 10, windowMs: 10 * 60_000 };

/** E03-S05: the mentee cancels their confirmed session. CSRF is enforced by `apiHandler`. */
export const POST = apiHandler((req, ctx) => withRequestScope(req, async cradle => {
  const session = requireRole(await requireSession(req, cradle), 'mentee');
  await cradle.rateLimiter.consumeFor(CANCEL_POLICY, session.userId);
  const id = parseWith(paymentIdSchema, (await ctx.params).id);
  const input = await parseJsonBody(req, bookingCancelSchema);
  return jsonOk(await cradle.bookingCancellationService.cancel(id, input));
}));
