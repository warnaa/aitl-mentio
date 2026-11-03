/**
 * The request header `proxy.ts` sets to the requested `pathname + search` on the
 * signed-in surfaces, so a guarded **layout** (which Next gives no pathname) can send a
 * signed-out visitor to `/sign-in?returnTo=<the page they asked for>`.
 *
 * Its own module so the proxy does not import `lib/session` (and through it the whole
 * of `@devmentor/core`). Any client-sent value is overwritten by the proxy, and the
 * guards still pass whatever they read through `safeReturnTo`.
 */
export const REQUEST_PATH_HEADER = 'x-devmentor-path';
