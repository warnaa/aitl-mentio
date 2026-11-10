import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, createNonce } from './content-security-policy';

function directives(policy: string): Map<string, string> {
  return new Map(
    policy.split('; ').map((directive) => {
      const [name, ...sources] = directive.split(' ');
      return [name!, sources.join(' ')];
    }),
  );
}

describe('buildContentSecurityPolicy', () => {
  it('restricts scripts to this response\'s nonce and blocks plugins and base hijacking', () => {
    const policy = directives(buildContentSecurityPolicy({ nonce: 'abc123', development: false }));
    expect(policy.get('default-src')).toBe("'self'");
    expect(policy.get('script-src')).toBe("'self' 'nonce-abc123' 'strict-dynamic'");
    expect(policy.get('object-src')).toBe("'none'");
    expect(policy.get('base-uri')).toBe("'self'");
    expect(policy.get('form-action')).toBe("'self'");
    expect(policy.get('img-src')).toBe("'self' data: blob:");
    expect(policy.get('connect-src')).toBe("'self'");
  });

  it('never allows eval or inline scripts in production', () => {
    const scriptSrc = directives(buildContentSecurityPolicy({ nonce: 'n', development: false })).get('script-src');
    expect(scriptSrc).not.toContain('unsafe-eval');
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toMatch(/https?:|\*/);
  });

  it('allows eval in development only, for React\'s server error stacks', () => {
    const scriptSrc = directives(buildContentSecurityPolicy({ nonce: 'n', development: true })).get('script-src');
    expect(scriptSrc).toBe("'self' 'nonce-n' 'strict-dynamic' 'unsafe-eval'");
  });

  it('leaves framing and HTTPS upgrades to their own decisions', () => {
    const policy = directives(buildContentSecurityPolicy({ nonce: 'n', development: false }));
    expect(policy.has('frame-ancestors')).toBe(false);
    expect(policy.has('upgrade-insecure-requests')).toBe(false);
  });
});

describe('createNonce', () => {
  it('returns 128 random bits, base64-encoded, different every call', () => {
    const nonces = new Set(Array.from({ length: 50 }, createNonce));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) {
      expect(Buffer.from(nonce, 'base64')).toHaveLength(16);
    }
  });
});
