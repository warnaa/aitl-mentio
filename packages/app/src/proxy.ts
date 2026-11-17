import { NextResponse, type NextRequest, type ProxyConfig } from 'next/server';
import { getEnv } from '@devmentor/core/config';
import {
  CONTENT_SECURITY_POLICY_HEADER,
  buildContentSecurityPolicy,
  createNonce,
} from './lib/content-security-policy';
import { REQUEST_PATH_HEADER } from './lib/request-path';

/**
 * Runs before every page and does two things to the request:
 *
 * 1. Sets the enforced Content-Security-Policy with a fresh nonce
 *    (`lib/content-security-policy`). The policy goes on the forwarded request, where
 *    Next reads the nonce and stamps it on its scripts, and on the response, where the
 *    browser enforces it. A client-sent policy header is overwritten, so a client
 *    cannot choose the nonce. Pages render per request (the root layout awaits
 *    `connection()`), so no prerendered HTML is served with a nonce-less script.
 * 2. Forwards the requested path to the page guards as the `x-devmentor-path` request
 *    header, so a signed-out visit to `/admin/users` returns to `/admin/users` after
 *    sign-in. Without it the admin layout (which sees no pathname) redirects first with
 *    its fixed `/admin`, and Next lets the layout's redirect win over the page's.
 *
 * This is **not** an auth boundary: it never reads the session or refuses a request.
 * Enforcement stays in the page guards (`lib/session`) and the services, which must hold
 * even if the matcher drifts or the proxy is skipped. Any incoming value of the path
 * header is overwritten, so a client cannot choose it; it only feeds a post-sign-in
 * redirect that `safeReturnTo` validates anyway.
 *
 * Next strips its internal `_rsc` query from `nextUrl` before the proxy runs, so a
 * client-side navigation forwards the same path as a full page load.
 */
export function proxy(request: NextRequest): NextResponse {
  const policy = buildContentSecurityPolicy({
    nonce: createNonce(),
    development: getEnv().NODE_ENV === 'development',
  });

  const headers = new Headers(request.headers);
  headers.set(REQUEST_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  headers.set(CONTENT_SECURITY_POLICY_HEADER, policy);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set(CONTENT_SECURITY_POLICY_HEADER, policy);
  return response;
}

/**
 * Every page, public and signed-in. API routes answer JSON or redirects, and static
 * assets and optimised images are not documents, so they skip the proxy.
 */
export const config: ProxyConfig = {
  matcher: ['/((?!api/|_next/static/|_next/image|favicon.ico).*)'],
};
