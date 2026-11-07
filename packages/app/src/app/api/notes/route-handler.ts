import { apiHandler, type ApiRouteHandler, type RouteLogic } from '@devmentor/core';

/** Apply to failures too: no private note response belongs in a shared or browser cache. */
export function noteHandler(logic: RouteLogic): ApiRouteHandler {
  const handler = apiHandler(logic);
  return async (req, ctx) => {
    const response = await handler(req, ctx);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
}
