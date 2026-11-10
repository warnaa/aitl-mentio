import type { NextConfig } from 'next';

type HeaderRules = Awaited<ReturnType<NonNullable<NextConfig['headers']>>>;

/**
 * Response headers every route sends, wired into `next.config.ts` as `headers()`.
 *
 * `X-Frame-Options: DENY` stops any page — same-origin included — from rendering
 * DevMentor in a frame (clickjacking, ZAP alert 10020). No supported embedding
 * consumer exists; one would need a documented requirement and a narrower policy.
 * It lives in config rather than `proxy.ts` because the proxy matches only the
 * signed-in surfaces, while the public and auth pages need the same protection.
 *
 * Deliberately no `Content-Security-Policy` here: the single enforced CSP (#83) owns
 * `frame-ancestors 'none'`, which must agree with this header, never weaken it.
 */
export function securityHeaders(): HeaderRules {
  return [
    {
      source: '/:path*',
      headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
    },
  ];
}
