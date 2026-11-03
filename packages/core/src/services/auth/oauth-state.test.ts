import { describe, expect, it } from 'vitest';
import {
  clearOAuthStateCookie,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_PATH,
  OAUTH_STATE_PURPOSE,
  OAUTH_STATE_TTL_SECONDS,
  oauthStateCookie,
  readOAuthStateCookie,
} from './oauth-state';

describe('OAuth state constants', () => {
  it('names the cookie, purpose and lifetime, scoped to the callback', () => {
    expect(OAUTH_STATE_COOKIE_NAME).toBe('devmentor_oauth_state');
    expect(OAUTH_STATE_PURPOSE).toBe('oauth-state');
    expect(OAUTH_STATE_TTL_SECONDS).toBe(600);
    expect(OAUTH_STATE_COOKIE_PATH).toBe('/api/auth/github/callback');
  });
});

describe('oauthStateCookie', () => {
  it.each(['development', 'test'] as const)('is HttpOnly, SameSite=Lax, ten minutes, without Secure when NODE_ENV=%s', (NODE_ENV) => {
    expect(oauthStateCookie('signed.state', { NODE_ENV })).toBe(
      'devmentor_oauth_state=signed.state; Path=/api/auth/github/callback; Max-Age=600; HttpOnly; SameSite=Lax',
    );
  });

  it('adds Secure in production and is never SameSite=Strict', () => {
    const cookie = oauthStateCookie('signed.state', { NODE_ENV: 'production' });
    expect(cookie).toMatch(/; HttpOnly; SameSite=Lax; Secure$/);
    expect(cookie).not.toMatch(/Strict/);
  });
});

describe('clearOAuthStateCookie', () => {
  it('expires the cookie on the same path', () => {
    expect(clearOAuthStateCookie({ NODE_ENV: 'development' })).toBe(
      'devmentor_oauth_state=; Path=/api/auth/github/callback; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax',
    );
    expect(clearOAuthStateCookie({ NODE_ENV: 'production' })).toMatch(/; Max-Age=0; HttpOnly; SameSite=Lax; Secure$/);
  });
});

describe('readOAuthStateCookie', () => {
  it('reads only the state cookie', () => {
    expect(readOAuthStateCookie('devmentor_session=s; devmentor_oauth_state=abc')).toBe('abc');
    expect(readOAuthStateCookie('devmentor_session=s')).toBeNull();
    expect(readOAuthStateCookie(null)).toBeNull();
  });
});
