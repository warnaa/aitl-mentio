import { apiHandler, jsonOk, parseJsonBody, parseWith, requireRole, requireSession, withRequestScope, type RateLimitPolicy } from '@devmentor/core';
import { bookingPersonaSchema } from '@devmentor/core/validators/payments/payment.schema';
import { bookingCreateSchema } from '@devmentor/core/validators/bookings/booking-create.schema';
import { withPaymentRequestScope } from '../../../lib/payments/scope';

export const dynamic = 'force-dynamic';
export const GET = apiHandler(req => withPaymentRequestScope(req, async cradle => {
  await requireSession(req, cradle);
  const role = parseWith(bookingPersonaSchema, new URL(req.url).searchParams.get('role') ?? undefined);
  return jsonOk(await cradle.paymentService.listMine(role));
}));
/** Operational request protection; this is not a product quota on concurrent bookings. */
const ATTEMPT_POLICY: RateLimitPolicy = { scope: 'bookings', kind: 'account', limit: 20, windowMs: 10 * 60_000 };

export const POST = apiHandler(req => withRequestScope(req, async cradle => {
  const session = requireRole(await requireSession(req, cradle), 'mentee');
  await cradle.rateLimiter.consumeFor(ATTEMPT_POLICY, session.userId);
  const input = await parseJsonBody(req, bookingCreateSchema);
  const result = await cradle.bookingService.start(input);
  return jsonOk(result.booking, result.created ? 201 : 200);
}));
