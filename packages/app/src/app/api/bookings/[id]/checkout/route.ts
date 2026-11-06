import { apiHandler, jsonOk, parseWith, requireRole, requireSession } from '@devmentor/core';
import { withPaymentRequestScope as withRequestScope } from '../../../../../lib/payments/scope';
import { paymentIdSchema } from '@devmentor/core/validators/payments/payment.schema';

export const dynamic = 'force-dynamic';
export const POST = apiHandler((req, ctx) => withRequestScope(req, async cradle => {
  const session = requireRole(await requireSession(req, cradle), 'mentee');
  await cradle.rateLimiter.consumeFor({ scope: 'checkout', kind: 'account', limit: 20, windowMs: 600_000 }, session.userId);
  const id = parseWith(paymentIdSchema, (await ctx.params).id);
  return jsonOk(await cradle.paymentService.startCheckout(id));
}));
