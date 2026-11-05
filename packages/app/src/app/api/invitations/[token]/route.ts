import { apiHandler, withRequestScope } from '@devmentor/core';
export const dynamic = 'force-dynamic';
export const GET = apiHandler(async (req, { params }) => {
  const { token } = await params;
  return withRequestScope(req, ({ invitationService }) => invitationService.lookup(String(token)));
});
