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
  SIGN_IN_ERRORS,
  SIGN_IN_PATH,
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
