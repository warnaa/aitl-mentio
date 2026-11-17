// Next's internal matcher, so `source` is resolved exactly as Next resolves it. If an
// upgrade moves it, `security-headers.integration.test.ts` still guards the behaviour.
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { describe, expect, it, vi } from 'vitest';
import { securityHeaders } from './security-headers';

// `next.config.ts` loads the repo-root `.env` on import; the wiring test must not.
vi.mock('./repo-env', () => ({ loadRepoEnv: () => undefined }));

/** The headers Next would send for `pathname`, applying rules in order (last one wins). */
function headersFor(rules: ReturnType<typeof securityHeaders>, pathname: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rule of rules) {
    if (getPathMatch(rule.source)(pathname) === false) continue;
    for (const { key, value } of rule.headers) result[key.toLowerCase()] = value;
  }
  return result;
}

// Public, auth, signed-in, admin and API surfaces, including the bare root.
const PATHS = ['/', '/sign-in', '/register', '/home', '/admin/users', '/sessions/abc/note', '/m/some-mentor', '/api/health'];

describe('securityHeaders (issue #84, ZAP 10020)', () => {
  it.each(PATHS)('denies framing of %s', (pathname) => {
    expect(headersFor(securityHeaders(), pathname)['x-frame-options']).toBe('DENY');
  });

  it('leaves the Content-Security-Policy to the single enforced CSP (#83)', () => {
    const keys = securityHeaders().flatMap((rule) => rule.headers.map(({ key }) => key.toLowerCase()));
    expect(keys).not.toContain('content-security-policy');
  });

  it('is what next.config.ts serves', async () => {
    const { default: nextConfig } = await import('../../next.config');
    const rules = await nextConfig.headers?.();
    expect(rules).toBeDefined();
    for (const pathname of PATHS) {
      expect(headersFor(rules ?? [], pathname)['x-frame-options']).toBe('DENY');
    }
  });
});
