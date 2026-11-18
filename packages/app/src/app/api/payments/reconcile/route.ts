import { apiHandler, jsonOk, requireRole, requireSession } from '@devmentor/core';
import { reconcileAll } from '../../../../lib/payments/reconcile';
import { withPaymentRequestScope as withRequestScope } from '../../../../lib/payments/scope';
export const dynamic = 'force-dynamic';
export const POST = apiHandler(req => withRequestScope(req, async cradle => {
  const session = requireRole(await requireSession(req, cradle), 'operator');
  await cradle.rateLimiter.consumeFor({ scope: 'payment-reconciliation', kind: 'account', limit: 5, windowMs: 60_000 }, session.userId);
  return jsonOk(await reconcileAll(cradle));
}));
