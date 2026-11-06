import { apiHandler, jsonOk, requireRole, requireSession, withRequestScope } from '@devmentor/core';
export const dynamic = 'force-dynamic';
export const GET = apiHandler(req => withRequestScope(req, async cradle => {
  requireRole(await requireSession(req, cradle), 'operator');
  return jsonOk(await cradle.paymentReportService.get());
}));
