import { describe, expect, it, vi } from 'vitest';
import {
  GithubAccountConflictError,
  GithubEmailUnverifiedError,
  ServiceUnavailableError,
  UnverifiedAccountLinkError,
  ValidationError,
} from '@devmentor/core';
import {
  redirectResponse,
  SIGN_IN_CANCELLED_PATH,
  SIGN_IN_CANCELLED_NOTICE,
  SIGN_IN_ERRORS,
  SIGN_IN_NOTICES,
  SIGN_IN_PATH,
  SIGN_IN_VERIFIED_NOTICE,
  SIGN_IN_VERIFIED_PATH,
  signInNotice,
  GITHUB_SIGN_IN_PATH,
  githubSignInHref,
  signInErrorFor,
  signInErrorPath,
  authRouteLogger,
} from './sign-in';

vi.stubEnv('LOG_LEVEL', 'silent');

const logger = () => ({ warn: vi.fn(), error: vi.fn() });

describe('sign-in paths', () => {
  it('builds the cancelled and error destinations on /sign-in', () => {
    expect(SIGN_IN_PATH).toBe('/sign-in');
    expect(SIGN_IN_CANCELLED_PATH).toBe('/sign-in?cancelled=1');
    expect(SIGN_IN_ERRORS).toEqual(['unavailable', 'state', 'email', 'unverified', 'conflict']);
    expect(signInErrorPath('state')).toBe('/sign-in?error=state');
    expect(signInErrorPath('verification-unavailable')).toBe('/sign-in?error=verification-unavailable');
    expect(SIGN_IN_VERIFIED_PATH).toBe('/sign-in?verified=1');
  });
});

describe('redirectResponse', () => {
  it('is a bodiless 302 to a relative location without cookies by default', async () => {
    const response = redirectResponse('/home');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/home');
    expect(response.headers.getSetCookie()).toEqual([]);
    await expect(response.text()).resolves.toBe('');
  });

  it('carries each cookie as its own Set-Cookie header', () => {
    const response = redirectResponse('https://github.com/login/oauth/authorize', ['a=1; Path=/', 'b=; Max-Age=0']);

    expect(response.headers.getSetCookie()).toEqual(['a=1; Path=/', 'b=; Max-Age=0']);
  });
});

describe('signInErrorFor', () => {
  it.each([
    [new GithubEmailUnverifiedError(), 'email'],
    [new UnverifiedAccountLinkError(), 'unverified'],
    [new GithubAccountConflictError(), 'conflict'],
  ] as const)('maps the expected refusal %s without logging', (error, reason) => {
    const log = logger();
    expect(signInErrorFor(error, log)).toBe(reason);
    expect(log.warn).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });

  it('maps ServiceUnavailableError to unavailable with a warning', () => {
    const log = logger();
    const error = new ServiceUnavailableError();
    expect(signInErrorFor(error, log)).toBe('unavailable');
    expect(log.warn).toHaveBeenCalledWith({ err: error }, 'GitHub sign-in unavailable');
  });

  it.each([new Error('boom'), new ValidationError(), 'not even an error'])(
    'maps anything unexpected (%s) to unavailable and logs it as an error',
    (error) => {
      const log = logger();
      expect(signInErrorFor(error, log)).toBe('unavailable');
      expect(log.error).toHaveBeenCalledWith({ err: error }, 'unexpected GitHub sign-in failure');
    },
  );
});

describe('authRouteLogger', () => {
  it('creates one logger and reuses it', () => {
    const first = authRouteLogger();
    expect(authRouteLogger()).toBe(first);
    expect(typeof first.warn).toBe('function');
  });
});

describe('signInNotice', () => {
  it('says a cancelled authorisation created no account', () => {
    expect(signInNotice({ cancelled: '1' })).toBe('Sign-in was cancelled. No account was created.');
    expect(SIGN_IN_CANCELLED_NOTICE).toBe('Sign-in was cancelled. No account was created.');
  });

  it('has copy for every reason the GitHub and verification routes send', () => {
    for (const reason of [...SIGN_IN_ERRORS, 'verification', 'verification-unavailable'] as const) {
      expect(signInNotice({ error: reason })).toBe(SIGN_IN_NOTICES[reason]);
      expect(SIGN_IN_NOTICES[reason]).not.toMatch(/[·•]/);
    }
  });

  it('keeps the meaning the spec gives each state', () => {
    expect(signInNotice({ error: 'unavailable' })).toMatch(/^GitHub sign-in is unavailable right now\. It may not be configured yet/);
    expect(signInNotice({ error: 'state' })).toMatch(/Sign in with GitHub again\.$/);
    expect(signInNotice({ error: 'email' })).toMatch(/no verified primary email address/);
    expect(signInNotice({ error: 'unverified' })).toMatch(/Open the verification link sent to that address first/);
    expect(signInNotice({ error: 'conflict' })).toMatch(/different GitHub account/);
    expect(signInNotice({ error: 'verification' })).toMatch(/^This verification link has expired or is not valid\. Register again/);
    expect(signInNotice({ error: 'verification-unavailable' })).toMatch(/^We could not confirm your email address right now\./);
  });

  it('confirms a verified address without a session, and lets an error win over it', () => {
    expect(signInNotice({ verified: '1' })).toBe(SIGN_IN_VERIFIED_NOTICE);
    expect(SIGN_IN_VERIFIED_NOTICE).toBe('Your email address is confirmed. Sign in to continue.');
    expect(signInNotice({ verified: '1', error: 'verification' })).toBe(SIGN_IN_NOTICES.verification);
    expect(signInNotice({ verified: 'yes' })).toBeNull();
  });

  it('prefers a known error over cancelled', () => {
    expect(signInNotice({ cancelled: '1', error: 'state' })).toBe(SIGN_IN_NOTICES.state);
  });

  it('ignores an unknown error, an inherited property name, and other cancelled values', () => {
    expect(signInNotice({ error: 'boom' })).toBeNull();
    expect(signInNotice({ error: 'toString' })).toBeNull();
    expect(signInNotice({ error: 'boom', cancelled: '1' })).toBe(SIGN_IN_CANCELLED_NOTICE);
    expect(signInNotice({ cancelled: 'true' })).toBeNull();
    expect(signInNotice({})).toBeNull();
  });
});

describe('githubSignInHref', () => {
  it('is the bare start route without a usable returnTo', () => {
    expect(GITHUB_SIGN_IN_PATH).toBe('/api/auth/github');
    expect(githubSignInHref(undefined)).toBe('/api/auth/github');
    expect(githubSignInHref('//evil.example')).toBe('/api/auth/github');
    expect(githubSignInHref('/api/users')).toBe('/api/auth/github');
  });

  it('carries a safe page path, encoded as one parameter', () => {
    expect(githubSignInHref('/admin/users?page=2&q=a')).toBe('/api/auth/github?returnTo=%2Fadmin%2Fusers%3Fpage%3D2%26q%3Da');
  });
});
