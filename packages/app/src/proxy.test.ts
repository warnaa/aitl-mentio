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

  it('matches only the signed-in surfaces', () => {
    expect(config.matcher).toEqual(['/admin/:path*', '/home/:path*', '/mentor/:path*']);
  });
});
