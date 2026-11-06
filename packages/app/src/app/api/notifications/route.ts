import { apiHandler, jsonOk, parseJsonBody, requireSession, withRequestScope } from '@devmentor/core';
import { notificationReadSchema } from '@devmentor/core/validators/notifications/notification-read.schema';

export const dynamic = 'force-dynamic';

/** The caller's own notifications; the scope is the live session, never a client-supplied id. */
export const GET = apiHandler(req => withRequestScope(req, async cradle => {
  await requireSession(req, cradle);
  return jsonOk(await cradle.notificationService.listMine());
}));

/** Marks the caller's own notifications read; ids that are not theirs change nothing. */
export const POST = apiHandler(req => withRequestScope(req, async cradle => {
  await requireSession(req, cradle);
  return jsonOk(await cradle.notificationService.markRead(await parseJsonBody(req, notificationReadSchema)));
}));
