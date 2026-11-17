/**
 * The enforced Content-Security-Policy for every HTML page (issue #83, threat model
 * T34). `proxy.ts` builds it once per request with a fresh nonce and sets it on both
 * the forwarded request — Next reads the nonce from there and stamps it on its own
 * framework, page and inline scripts — and the response the browser enforces.
 *
 * Its own module, like `request-path`, so the proxy does not import `lib/session` and
 * through it the whole of `@devmentor/core`.
 *
 * Directives and their exceptions:
 * - `script-src` allows only scripts carrying this response's nonce; `'strict-dynamic'`
 *   lets those scripts load the chunks they import, so no origin list is needed and
 *   `'self'` is only a fallback for browsers without CSP Level 3. `'unsafe-eval'` is
 *   added in development only, where React uses `eval` for server error stacks.
 * - `style-src` keeps `'unsafe-inline'`: server-rendered `style` attributes (the
 *   `Progress` bar, Radix positioning) cannot carry a nonce. Style injection is the
 *   accepted residual; script execution is what the policy constrains.
 * - `img-src` adds `data:` and `blob:` for generated images; the app loads no
 *   third-party images, fonts or scripts. Stripe Checkout and GitHub OAuth are
 *   top-level navigations, which CSP does not restrict.
 * - `form-action 'self'`: every form submits through `fetch`, never a native post.
 * - No `frame-ancestors` (framing is issue #84; add it here so both stay one policy)
 *   and no `upgrade-insecure-requests`, which would break local HTTP runs.
 */
export const CONTENT_SECURITY_POLICY_HEADER = 'Content-Security-Policy';

/** A fresh, unpredictable nonce: 128 random bits, base64-encoded. */
export function createNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
}

export type ContentSecurityPolicyOptions = {
  nonce: string;
  /** `next dev` only; production never gets `'unsafe-eval'`. */
  development: boolean;
};

export function buildContentSecurityPolicy({ nonce, development }: ContentSecurityPolicyOptions): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(development ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}
