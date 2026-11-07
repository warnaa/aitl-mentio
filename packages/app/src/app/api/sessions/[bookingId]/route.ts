import { apiHandler, jsonOk, requireSession, withRequestScope } from '@devmentor/core';

export const dynamic = 'force-dynamic';

/** The caller's view of one text session; the service answers 404 to anyone who is not a party. */
export const GET = apiHandler((req, ctx) => withRequestScope(req, async cradle => {
  await requireSession(req, cradle);
  return jsonOk(await cradle.textSessionService.getForParticipant((await ctx.params).bookingId));
}));
