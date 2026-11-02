/**
 * An origin that can never be real, used only to resolve a candidate path. Anything
 * that resolves to a different origin was trying to leave the site.
 */
const PROBE_ORIGIN = 'http://devmentor.invalid';

/** Paths that are never pages: route handlers answer JSON, `_next` serves assets. */
const NON_PAGE_PREFIXES = ['/api', '/_next'];

function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Validate a `returnTo` value before redirecting to it. Only a same-origin relative
 * **page** path is accepted: it starts with a single `/` (not `//host` or `/\host`),
 * carries no scheme, and is not under `/api/` or `/_next/`. Anything else yields
 * `fallback`, which the caller supplies and must already be safe.
 *
 * The accepted path is returned in its normalised form (`pathname + search + hash`),
 * so dot segments and percent-encoded characters cannot smuggle a path into `/api/`.
 */
export function safeReturnTo(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return fallback;
  }

  // Browsers strip tabs and newlines while parsing, so `/\t/evil.example` would become
  // `//evil.example`. The URL parser does the same, and the origin check catches it.
  if (url.origin !== PROBE_ORIGIN) {
    return fallback;
  }
  // Compare the decoded path, so `/%61pi/users` cannot pass as a page.
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname).toLowerCase();
  } catch {
    return fallback;
  }
  if (NON_PAGE_PREFIXES.some((prefix) => isUnder(pathname, prefix))) {
    return fallback;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
