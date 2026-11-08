import { jsonOk, readJsonBody, requireSession, withRequestScope } from '@devmentor/core';
import { noteHandler } from '../../route-handler';

export const dynamic = 'force-dynamic';
export const POST = noteHandler((req, ctx) => withRequestScope(req, async cradle => {
  await requireSession(req, cradle);
  return jsonOk(await cradle.sessionNoteService.send((await ctx.params).bookingId, await readJsonBody(req)));
}));
