import { apiHandler, jsonOk, requireRole, requireSession } from '@devmentor/core';
import { withPaymentRequestScope as withRequestScope } from '../../../../lib/payments/scope';
export const dynamic = 'force-dynamic';
export const GET = apiHandler(req => withRequestScope(req, async cradle => {
  requireRole(await requireSession(req, cradle), 'operator');
  return jsonOk(await cradle.paymentService.listReview());
}));
