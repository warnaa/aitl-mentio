import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { config, proxy } from './proxy';
import { REQUEST_PATH_HEADER } from './lib/request-path';

/**
 * The proxy runs for real against a `NextRequest`; what reaches the page is the
 * `x-middleware-request-*` override Next applies to the forwarded request.
 */
function forwardedPath(url: string, init?: ConstructorParameters<typeof NextRequest>[1]): string | null {
  const response = proxy(new NextRequest(url, init));
  return response.headers.get(`x-middleware-request-${REQUEST_PATH_HEADER}`);
}

describe('proxy', () => {
  it('forwards the requested path and query to the page guards', () => {
    expect(forwardedPath('https://devmentor.test/admin/users?page=2&q=a%20b')).toBe(
      '/admin/users?page=2&q=a%20b',
    );
  });

  it('forwards a bare path without a trailing "?"', () => {
    expect(forwardedPath('https://devmentor.test/home')).toBe('/home');
  });

  it('overwrites a client-sent value, so a client cannot choose the path', () => {
    expect(
      forwardedPath('https://devmentor.test/mentor', { headers: { [REQUEST_PATH_HEADER]: '//evil.example' } }),
    ).toBe('/mentor');
  });

  it('passes the other request headers through and continues the request', () => {
    const response = proxy(new NextRequest('https://devmentor.test/home', { headers: { cookie: 'a=b' } }));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-middleware-request-cookie')).toBe('a=b');
  });

  it('matches every page but skips API routes and static assets', () => {
    expect(config.matcher).toEqual(['/((?!api/|_next/static/|_next/image|favicon.ico).*)']);
  });
});

describe('proxy Content-Security-Policy', () => {
  function policies(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
    const response = proxy(new NextRequest(url, init));
    return {
      enforced: response.headers.get('content-security-policy'),
      forwarded: response.headers.get('x-middleware-request-content-security-policy'),
    };
  }

  function nonceOf(policy: string | null): string | undefined {
    return policy?.match(/'nonce-([^']+)'/)?.[1];
  }

  it.each(['/', '/sign-in', '/register', '/home', '/admin/users'])(
    'enforces a nonce policy on %s and forwards the same policy so Next stamps its scripts',
    (path) => {
      const { enforced, forwarded } = policies(`https://devmentor.test${path}`);
      expect(enforced).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/]{22}==' 'strict-dynamic'/);
      expect(enforced).toContain("object-src 'none'");
      expect(enforced).toContain("base-uri 'self'");
      expect(forwarded).toBe(enforced);
    },
  );

  it('uses a fresh nonce for every request', () => {
    const first = nonceOf(policies('https://devmentor.test/').enforced);
    const second = nonceOf(policies('https://devmentor.test/').enforced);
    expect(first).toBeDefined();
    expect(second).not.toBe(first);
  });

  it('overwrites a client-sent policy, so a client cannot choose the nonce', () => {
    const { forwarded } = policies('https://devmentor.test/', {
      headers: { 'content-security-policy': "script-src 'nonce-attacker'" },
    });
    expect(forwarded).not.toContain('attacker');
    expect(nonceOf(forwarded)).toBeDefined();
  });

  it('keeps the path forwarding on public pages too', () => {
    expect(forwardedPath('https://devmentor.test/sign-in?returnTo=%2Fhome')).toBe('/sign-in?returnTo=%2Fhome');
  });
});
