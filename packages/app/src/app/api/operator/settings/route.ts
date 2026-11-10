import { apiHandler, jsonOk, readJsonBody, requireRole, requireSession, withRequestScope, type Cradle, type PlatformSettingsView } from '@devmentor/core';

export const dynamic = 'force-dynamic';

/** The settings with the mentors whose stored prices they would flag (prices are never changed). */
async function snapshot(cradle: Cradle, settings: PlatformSettingsView) {
  return { settings, outOfBounds: await cradle.mentorProfileService.listOutOfBounds(settings) };
}

/** E05-S02: the operator's price bounds and platform fee. Operators only; `apiHandler` enforces CSRF on PUT. */
export const GET = apiHandler(req => withRequestScope(req, async cradle => {
  requireRole(await requireSession(req, cradle), 'operator');
  return jsonOk(await snapshot(cradle, await cradle.platformSettingsService.getForOperator()));
}));

export const PUT = apiHandler(req => withRequestScope(req, async cradle => {
  requireRole(await requireSession(req, cradle), 'operator');
  return jsonOk(await snapshot(cradle, await cradle.platformSettingsService.update(await readJsonBody(req))));
}));
