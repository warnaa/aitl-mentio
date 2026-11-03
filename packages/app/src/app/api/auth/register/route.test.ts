import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cradle, postJson } from '../../../../test/request-scope';

vi.mock('@devmentor/core', async (importOriginal) =>
  (await import('../../../../test/request-scope')).mockCoreRequestScope(importOriginal as never),
);

const { ConflictError, ServiceUnavailableError, TooManyRequestsError } = await import('@devmentor/core');
const route = await import('./route');

const body = { displayName: 'Grace Hopper', email: 'Grace@DevMentor.Test', password: 'correct horse battery', returnTo: '/mentor' };
const register = (payload: unknown = body, options?: Parameters<typeof postJson>[2]) =>
  route.POST(postJson('/api/auth/register', payload, options), undefined as never);

beforeEach(() => {
  vi.clearAllMocks();
  cradle.userService.registerWithPassword.mockResolvedValue({ email: 'grace@devmentor.test' });
});

describe('POST /api/auth/register', () => {
  it('is a dynamic route exposing POST only', () => {
    expect(route.dynamic).toBe('force-dynamic');
    expect(Object.keys(route).sort()).toEqual(['POST', 'dynamic']);
  });

  it('registers the parsed input with the trusted client IP and sets no cookie', async () => {
    const response = await register(body, { forwardedFor: '6.6.6.6, 203.0.113.7' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { email: 'grace@devmentor.test' } });
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(cradle.userService.registerWithPassword).toHaveBeenCalledExactlyOnceWith(
      { displayName: 'Grace Hopper', email: 'grace@devmentor.test', password: 'correct horse battery', returnTo: '/mentor' },
      { clientIp: '203.0.113.7' }, // TRUSTED_PROXY_HOPS=1: the rightmost entry
    );
  });

  it('refuses a request without the CSRF header before registering anything (edge case 23)', async () => {
    const response = await register(body, { csrf: false });

    expect(response.status).toBe(403);
    expect(cradle.userService.registerWithPassword).not.toHaveBeenCalled();
  });

  it('answers 422 with field errors for invalid input, registering nothing', async () => {
    const response = await register({ ...body, password: 'short', email: 'nope' });

    expect(response.status).toBe(422);
    const payload = (await response.json()) as { error: { code: string; fieldErrors: Record<string, string[]> } };
    expect(payload.error.code).toBe('validation_failed');
    expect(Object.keys(payload.error.fieldErrors).sort()).toEqual(['email', 'password']);
    expect(cradle.userService.registerWithPassword).not.toHaveBeenCalled();
  });

  it('answers 400 for a body that is not JSON', async () => {
    expect((await register('{oops')).status).toBe(400);
  });

  it('passes a 409 through with its message', async () => {
    cradle.userService.registerWithPassword.mockRejectedValueOnce(new ConflictError('This email address signs in with GitHub.'));
    const response = await register();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: 'conflict', message: 'This email address signs in with GitHub.' },
    });
  });

  it('answers a tripped limit with 429, Retry-After and retryAfterSeconds', async () => {
    cradle.userService.registerWithPassword.mockRejectedValueOnce(new TooManyRequestsError(1800));
    const response = await register();

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('1800');
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: { code: 'rate_limited', retryAfterSeconds: 1800 } });
  });

  it('answers 503 when the verification mail cannot be sent', async () => {
    cradle.userService.registerWithPassword.mockRejectedValueOnce(new ServiceUnavailableError());
    expect((await register()).status).toBe(503);
  });
});
