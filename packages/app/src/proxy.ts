import { NextResponse, type NextRequest, type ProxyConfig } from 'next/server';
import { REQUEST_PATH_HEADER } from './lib/request-path';

/**
 * Forwards the requested path to the page guards as the `x-devmentor-path` request
 * header, so a signed-out visit to `/admin/users` returns to `/admin/users` after
 * sign-in. Without it the admin layout (which sees no pathname) redirects first with
 * its fixed `/admin`, and Next lets the layout's redirect win over the page's.
 *
 * This is **not** an auth boundary: it never reads the session or refuses a request.
 * Enforcement stays in the page guards (`lib/session`) and the services, which must hold
 * even if the matcher drifts or the proxy is skipped. Any incoming value of the header
 * is overwritten, so a client cannot choose it; it only feeds a post-sign-in redirect
 * that `safeReturnTo` validates anyway.
 *
 * Next strips its internal `_rsc` query from `nextUrl` before the proxy runs, so a
 * client-side navigation forwards the same path as a full page load.
 */
export function proxy(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(REQUEST_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

/** Only the signed-in surfaces; `/admin/:path*` also matches `/admin` itself. */
export const config: ProxyConfig = {
  matcher: ['/admin/:path*', '/home/:path*', '/mentor/:path*', '/sessions/:path*'],
};
