/**
 * Hand-rolled cookie helpers. `core` cannot use Next's cookie API and the project takes
 * no `cookie` package, so the few cookies the app sets are parsed and built here.
 */

export interface CookieAttributes {
  path: string;
  /** `0` removes the cookie. */
  maxAgeSeconds: number;
  /** Optional `Expires`, for clients that ignore `Max-Age`. */
  expiresAt?: Date;
  /** Add `Secure`. Plain-HTTP `npm run dev` on localhost could not store a Secure cookie. */
  secure: boolean;
}

/**
 * Build a `Set-Cookie` header value. Every cookie this app sets is `HttpOnly` and
 * `SameSite=Lax`. `Strict` is deliberately not offered: the session and the OAuth state
 * are both read on a cross-site top-level navigation back from GitHub, where a `Strict`
 * cookie is not sent.
 */
export function serializeCookie(name: string, value: string, attributes: CookieAttributes): string {
  const parts = [`${name}=${value}`, `Path=${attributes.path}`];
  if (attributes.expiresAt) {
    parts.push(`Expires=${attributes.expiresAt.toUTCString()}`);
  }
  parts.push(`Max-Age=${attributes.maxAgeSeconds}`, 'HttpOnly', 'SameSite=Lax');
  if (attributes.secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

/**
 * Read cookie `name` out of a `Cookie` request header. Returns `null` when the header is
 * absent or carries no non-empty value for `name`. Parsing only: the value is untrusted.
 */
export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const pair of cookieHeader.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1 || pair.slice(0, separator).trim() !== name) {
      continue;
    }
    const value = pair.slice(separator + 1).trim();
    return value === '' ? null : value;
  }
  return null;
}
