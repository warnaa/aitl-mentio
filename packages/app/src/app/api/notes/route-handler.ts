import { apiHandler, isAppError, type ApiRouteHandler, type RouteLogic } from '@devmentor/core';

/** Apply to failures too: no private note response belongs in a shared or browser cache. */
export function noteHandler(logic: RouteLogic): ApiRouteHandler {
  const handler = apiHandler(async (req, ctx) => {
    try { return await logic(req, ctx); }
    catch (error) {
      if (isAppError(error)) throw error;
      // Driver errors can contain bound text or a failing row. Keep it out of the shared logger.
      throw new Error('Session note operation failed');
    }
  });
  return async (req, ctx) => {
    const response = await handler(req, ctx);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
}
