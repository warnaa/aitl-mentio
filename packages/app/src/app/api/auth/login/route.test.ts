import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cradle, postJson } from '../../../../test/request-scope';

vi.mock('@devmentor/core', async (importOriginal) =>
  (await import('../../../../test/request-scope')).mockCoreRequestScope(importOriginal as never),
);

const { EmailNotVerifiedError, INVALID_CREDENTIALS_MESSAGE, TooManyRequestsError, UnauthorizedError } = await import('@devmentor/core');
const route = await import('./route');

const body = { email: 'grace@devmentor.test', password: 'correct horse battery' };
const login = (payload: unknown = body, options?: Parameters<typeof postJson>[2]) =>
  route.POST(postJson('/api/auth/login', payload, options), undefined as never);

beforeEach(() => {
  vi.clearAllMocks();
  cradle.userService.authenticateWithPassword.mockResolvedValue({ userId: 'user-1', sessionVersion: 7, roles: ['mentee'] });
});

describe('POST /api/auth/login', () => {
  it('is a dynamic route exposing POST only', () => {
    expect(route.dynamic).toBe('force-dynamic');
    expect(Object.keys(route).sort()).toEqual(['POST', 'dynamic']);
  });

  it('signs in: sets the session cookie for the live version and answers the role home', async () => {
    const response = await login();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { redirectTo: '/home' } });
    expect(response.headers.getSetCookie()).toEqual(['devmentor_session=signed; Path=/; HttpOnly; SameSite=Lax']);
    expect(cradle.sessionService.issue).toHaveBeenCalledExactlyOnceWith({ id: 'user-1', sessionVersion: 7 });
    expect(cradle.userService.authenticateWithPassword).toHaveBeenCalledWith(body, { clientIp: null });
  });

  it('answers the combined mentor/operator its own home', async () => {
    cradle.userService.authenticateWithPassword.mockResolvedValueOnce({ userId: 'u', sessionVersion: 0, roles: ['mentor', 'operator'] });
    await expect((await login()).json()).resolves.toEqual({ ok: true, data: { redirectTo: '/admin' } });
  });

  it('honours a safe returnTo and replaces an unsafe one with the home (edge case 22)', async () => {
    await expect((await login({ ...body, returnTo: '/mentor?tab=slots' })).json()).resolves.toMatchObject({ data: { redirectTo: '/mentor?tab=slots' } });
    await expect((await login({ ...body, returnTo: '//evil.example' })).json()).resolves.toMatchObject({ data: { redirectTo: '/home' } });
    await expect((await login({ ...body, returnTo: '/api/users' })).json()).resolves.toMatchObject({ data: { redirectTo: '/home' } });
  });

  it('answers the generic 401 and sets no cookie for wrong credentials (edge case 13)', async () => {
    cradle.userService.authenticateWithPassword.mockRejectedValueOnce(new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE));
    const response = await login();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: { code: 'unauthorized', message: INVALID_CREDENTIALS_MESSAGE } });
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(cradle.sessionService.issue).not.toHaveBeenCalled();
  });

  it('refuses an unverified address with 403 email_unverified and no cookie (edge case 15)', async () => {
    cradle.userService.authenticateWithPassword.mockRejectedValueOnce(new EmailNotVerifiedError());
    const response = await login();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'email_unverified' } });
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it('answers a tripped limit with 429 and Retry-After, and no cookie', async () => {
    cradle.userService.authenticateWithPassword.mockRejectedValueOnce(new TooManyRequestsError(600));
    const response = await login();

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('600');
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it('refuses a request without the CSRF header — login CSRF — before checking anything', async () => {
    expect((await login(body, { csrf: false })).status).toBe(403);
    expect(cradle.userService.authenticateWithPassword).not.toHaveBeenCalled();
  });

  it('answers 422 for an empty password without checking it', async () => {
    expect((await login({ ...body, password: '' })).status).toBe(422);
    expect(cradle.userService.authenticateWithPassword).not.toHaveBeenCalled();
  });
});
