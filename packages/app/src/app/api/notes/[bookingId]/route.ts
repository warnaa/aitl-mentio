import { jsonOk, readJsonBody, requireSession, withRequestScope } from '@devmentor/core';
import { noteHandler } from '../route-handler';

export const dynamic = 'force-dynamic';
export const GET = noteHandler((req, ctx) => withRequestScope(req, async cradle => {
  await requireSession(req, cradle);
  return jsonOk(await cradle.sessionNoteService.getForParticipant((await ctx.params).bookingId));
}));
export const PUT = noteHandler((req, ctx) => withRequestScope(req, async cradle => {
  await requireSession(req, cradle);
  return jsonOk(await cradle.sessionNoteService.saveDraft((await ctx.params).bookingId, await readJsonBody(req)));
}));
