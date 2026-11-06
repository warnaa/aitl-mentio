import { apiHandler, jsonOk, parseJsonBody, parseWith, requireRole, requireSession } from '@devmentor/core';
import { withPaymentRequestScope as withRequestScope } from '../../../../../lib/payments/scope';
import { paymentIdSchema, paymentResolutionSchema } from '@devmentor/core/validators/payments/payment.schema';
export const dynamic = 'force-dynamic';
export const POST = apiHandler((req, ctx) => withRequestScope(req, async cradle => {
  requireRole(await requireSession(req, cradle), 'operator');
  const id = parseWith(paymentIdSchema, (await ctx.params).id);
  return jsonOk(await cradle.paymentService.resolveReview(id, await parseJsonBody(req, paymentResolutionSchema)));
}));
