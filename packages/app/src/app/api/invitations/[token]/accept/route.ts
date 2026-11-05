import { apiHandler, jsonOk, requireSession, withRequestScope } from '@devmentor/core';
export const dynamic = 'force-dynamic';
export const POST = apiHandler(async (req, { params }) => {
  const { token } = await params;
  return withRequestScope(req, async (cradle) => {
    await requireSession(req, cradle);
    const accepted = await cradle.invitationService.accept(String(token));
    const { cookie } = await cradle.sessionService.issue({
      id: accepted.userId,
      sessionVersion: accepted.sessionVersion,
    });
    const response = jsonOk({ roles: accepted.roles, publishDueAt: accepted.publishDueAt });
    response.headers.append('set-cookie', cookie);
    return response;
  });
});
