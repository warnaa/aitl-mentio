import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cradle } from '../../../../test/request-scope';

vi.mock('@devmentor/core', async (importOriginal) =>
  (await import('../../../../test/request-scope')).mockCoreRequestScope(importOriginal as never),
);

const { BadRequestError, ServiceUnavailableError } = await import('@devmentor/core');
const route = await import('./route');
const { authRouteLogger } = await import('../../../../lib/sign-in');

const open = (query = '?token=signed-token') =>
  route.GET(new Request(`http://devmentor.test/api/auth/verify-email${query}`), undefined as never);
const claims = { userId: 'user-1', version: 2 };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  cradle.emailVerification.read.mockResolvedValue(claims);
  cradle.userService.verifyEmail.mockResolvedValue({ status: 'verified', userId: 'user-1', sessionVersion: 2, roles: ['mentee'] });
});

function expectRedirect(response: Response, location: string) {
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe(location);
}

describe('GET /api/auth/verify-email', () => {
  it('is a dynamic route exposing GET only', () => {
    expect(route.dynamic).toBe('force-dynamic');
    expect(Object.keys(route).sort()).toEqual(['GET', 'dynamic']);
  });

  it('verifies, issues a session and lands on the role home', async () => {
    const response = await open();

    expectRedirect(response, '/home');
    expect(response.headers.getSetCookie()).toEqual(['devmentor_session=signed; Path=/; HttpOnly; SameSite=Lax']);
    expect(cradle.emailVerification.read).toHaveBeenCalledWith('signed-token');
    expect(cradle.userService.verifyEmail).toHaveBeenCalledWith(claims);
    expect(cradle.sessionService.issue).toHaveBeenCalledWith({ id: 'user-1', sessionVersion: 2 });
  });

  it('lands on the link’s returnTo through safeReturnTo', async () => {
    cradle.userService.verifyEmail.mockResolvedValueOnce({ status: 'verified', userId: 'u', sessionVersion: 0, roles: ['mentor'], returnTo: '/mentor?x=1' });
    expectRedirect(await open(), '/mentor?x=1');

    cradle.userService.verifyEmail.mockResolvedValueOnce({ status: 'verified', userId: 'u', sessionVersion: 0, roles: ['mentor'], returnTo: '//evil.example' });
    expectRedirect(await open(), '/mentor');
  });

  it('sends an already-verified link to sign-in with the confirmation, issuing no session (edge case 16)', async () => {
    cradle.userService.verifyEmail.mockResolvedValueOnce({ status: 'already-verified' });
    const response = await open();

    expectRedirect(response, '/sign-in?verified=1');
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(cradle.sessionService.issue).not.toHaveBeenCalled();
  });

  it.each([
    ['no token', ''],
    ['an empty token', '?token='],
  ])('redirects %s to /sign-in?error=verification without reading anything', async (_label, query) => {
    expectRedirect(await open(query), '/sign-in?error=verification');
    expect(cradle.emailVerification.read).not.toHaveBeenCalled();
  });

  it('redirects an invalid or expired token to /sign-in?error=verification, never a JSON envelope', async () => {
    cradle.emailVerification.read.mockRejectedValueOnce(new BadRequestError('This link is invalid or has expired'));
    const response = await open();

    expectRedirect(response, '/sign-in?error=verification');
    expect(response.headers.get('content-type')).toBeNull();
    expect(cradle.userService.verifyEmail).not.toHaveBeenCalled();
  });

  it('redirects a superseded link (refused by the service) the same way', async () => {
    cradle.userService.verifyEmail.mockRejectedValueOnce(new BadRequestError('This link is invalid or has expired'));
    expectRedirect(await open(), '/sign-in?error=verification');
  });

  it('logs anything unexpected and redirects to /sign-in?error=verification-unavailable', async () => {
    const failure = new ServiceUnavailableError();
    cradle.emailVerification.read.mockRejectedValueOnce(failure);
    const error = vi.spyOn(authRouteLogger(), 'error').mockImplementation(() => undefined);

    expectRedirect(await open(), '/sign-in?error=verification-unavailable');
    expect(error).toHaveBeenCalledWith({ err: failure }, 'email verification failed');
  });
});
