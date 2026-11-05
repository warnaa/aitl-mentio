import { apiHandler, requireRole, requireSession, withRequestScope } from '@devmentor/core';
export const dynamic = 'force-dynamic';
export const GET = apiHandler((req) =>
  withRequestScope(req, async (cradle) => {
    requireRole(await requireSession(req, cradle), 'mentor');
    return cradle.invitationService.onboarding();
  }),
);
