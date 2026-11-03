import { vi } from 'vitest';

/*
 * Shared seam for workflow-route tests: `@devmentor/core` stays real (apiHandler, the
 * schemas, clientIp, safeReturnTo, homeFor, the error classes) except `withRequestScope`,
 * which hands the route this controllable cradle. Each test file mocks core with
 * `mockCoreRequestScope()`.
 */
export const cradle = {
  env: { TRUSTED_PROXY_HOPS: 1 },
  userService: {
    registerWithPassword: vi.fn(),
    authenticateWithPassword: vi.fn(),
    verifyEmail: vi.fn(),
  },
  sessionService: { issue: vi.fn(async () => ({ cookie: 'devmentor_session=signed; Path=/; HttpOnly; SameSite=Lax' })) },
  emailVerification: { read: vi.fn() },
};

export async function mockCoreRequestScope(importOriginal: () => Promise<typeof import('@devmentor/core')>) {
  return {
    ...(await importOriginal()),
    withRequestScope: vi.fn(async (_req: Request, fn: (scope: typeof cradle) => unknown) => fn(cradle)),
  };
}

/** A JSON POST as `apiCall` sends it: CSRF header included unless `csrf: false`. */
export function postJson(path: string, body: unknown, { csrf = true, forwardedFor }: { csrf?: boolean; forwardedFor?: string } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (csrf) headers.set('x-devmentor-request', '1');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);
  return new Request(`http://devmentor.test${path}`, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
