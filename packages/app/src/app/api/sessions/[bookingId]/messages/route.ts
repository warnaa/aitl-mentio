import { apiHandler, jsonOk, readJsonBody, requireSession, withRequestScope } from '@devmentor/core';

export const dynamic = 'force-dynamic';

/** Posts one message as the caller; the service checks the party, the limit, the body and the window in that order. */
export const POST = apiHandler((req, ctx) => withRequestScope(req, async cradle => {
  await requireSession(req, cradle);
  return jsonOk(await cradle.textSessionService.postMessage((await ctx.params).bookingId, await readJsonBody(req)), 201);
}));
