import { apiHandler, jsonOk, readJsonBody, requireSession, withRequestScope } from '@devmentor/core';

export const dynamic = 'force-dynamic';

/** Saves the written answer as the booking's mentor; the service checks the party, the role, the limit, the body and the window. */
export const PUT = apiHandler((req, ctx) => withRequestScope(req, async cradle => {
  await requireSession(req, cradle);
  return jsonOk(await cradle.textSessionService.postAnswer((await ctx.params).bookingId, await readJsonBody(req)));
}));
