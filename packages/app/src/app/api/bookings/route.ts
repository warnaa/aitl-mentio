import { apiHandler, jsonOk, parseJsonBody, requireRole, requireSession, withRequestScope, type RateLimitPolicy } from '@devmentor/core';
import { bookingCreateSchema } from '@devmentor/core/validators/bookings/booking-create.schema';

export const dynamic = 'force-dynamic';
/** Operational request protection; this is not a product quota on concurrent bookings. */
const ATTEMPT_POLICY: RateLimitPolicy = { scope: 'bookings', kind: 'account', limit: 20, windowMs: 10 * 60_000 };

export const POST = apiHandler(req => withRequestScope(req, async cradle => {
  const session = requireRole(await requireSession(req, cradle), 'mentee');
  await cradle.rateLimiter.consumeFor(ATTEMPT_POLICY, session.userId);
  const input = await parseJsonBody(req, bookingCreateSchema);
  const result = await cradle.bookingService.start(input);
  return jsonOk(result.booking, result.created ? 201 : 200);
}));
