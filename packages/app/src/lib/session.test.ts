import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role, RoleSet, Session } from '@devmentor/core';

/**
 * The guards' seam with Next: `cookies()` and `redirect()` are mocked, and `redirect`
 * throws a sentinel the way the real one throws its control-flow error. The live session
 * check is core's (tested there); here `withSessionCookieScope` hands back a canned cradle.
 */
class RedirectSentinel extends Error {
  constructor(readonly location: string) {
    super(`redirect ${location}`);
  }
}

const next = vi.hoisted(() => ({
  cookieValue: undefined as string | undefined,
  get: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      next.get(name);
      return next.cookieValue === undefined ? undefined : { name, value: next.cookieValue };
    },
  })),
}));
vi.mock('next/navigation', () => ({ redirect: next.redirect }));

const scope = vi.hoisted(() => ({
  session: Promise.resolve(null) as Promise<Session | null>,
  withSessionCookieScope: vi.fn(),
}));
vi.mock('@devmentor/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@devmentor/core')>()),
  withSessionCookieScope: scope.withSessionCookieScope,
}));

const { SESSION_COOKIE_NAME, ROLE_HOMES } = await import('@devmentor/core');
const { getPageSession, homeFor, requirePageRole, requirePageSession, signInRedirectPath } =
  await import('./session');

function signedInAs(...roles: RoleSet): Session {
  const session: Session = { userId: 'user-1', roles };
  next.cookieValue = 'signed-token';
  scope.session = Promise.resolve(session);
  return session;
}

async function redirectOf(action: Promise<unknown>): Promise<string> {
  const error = await action.then(
    () => {
      throw new Error('expected a redirect');
    },
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(RedirectSentinel);
  return (error as RedirectSentinel).location;
}

beforeEach(() => {
  next.cookieValue = undefined;
  next.get.mockReset();
  next.redirect.mockReset();
  next.redirect.mockImplementation((location: string) => {
    throw new RedirectSentinel(location);
  });
  scope.session = Promise.resolve(null);
  scope.withSessionCookieScope.mockReset();
  scope.withSessionCookieScope.mockImplementation(
    (_token: string, fn: (cradle: { session: Promise<Session | null> }) => unknown) =>
      Promise.resolve(fn({ session: scope.session })),
  );
});

describe('getPageSession', () => {
  it('returns null without a cookie and never builds a scope (no database round trip)', async () => {
    await expect(getPageSession()).resolves.toBeNull();
    expect(next.get).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
    expect(scope.withSessionCookieScope).not.toHaveBeenCalled();
  });

  it('treats an empty cookie value as no cookie', async () => {
    next.cookieValue = '';
    await expect(getPageSession()).resolves.toBeNull();
    expect(scope.withSessionCookieScope).not.toHaveBeenCalled();
  });

  it('resolves the cookie value through the live session scope', async () => {
    const session = signedInAs('mentee');
    await expect(getPageSession()).resolves.toBe(session);
    expect(scope.withSessionCookieScope).toHaveBeenCalledWith('signed-token', expect.any(Function));
  });

  it('returns null for a cookie the live check rejects (tampered, expired, stale version)', async () => {
    next.cookieValue = 'tampered-token';
    await expect(getPageSession()).resolves.toBeNull();
  });

  it('propagates an infrastructure failure instead of reporting "signed out"', async () => {
    next.cookieValue = 'signed-token';
    scope.withSessionCookieScope.mockRejectedValue(new Error('database unreachable'));
    await expect(getPageSession()).rejects.toThrow('database unreachable');
  });
});

describe('requirePageSession', () => {
  it('redirects a visitor without a session to sign-in with the encoded returnTo', async () => {
    await expect(redirectOf(requirePageSession('/admin/users?page=2&q=a b'))).resolves.toBe(
      '/sign-in?returnTo=%2Fadmin%2Fusers%3Fpage%3D2%26q%3Da%20b',
    );
    expect(next.redirect).toHaveBeenCalledOnce();
  });

  it('redirects a dead session (cookie present, live check null) the same way', async () => {
    next.cookieValue = 'expired-token';
    await expect(redirectOf(requirePageSession('/home'))).resolves.toBe('/sign-in?returnTo=%2Fhome');
  });

  it('returns the live session without redirecting', async () => {
    const session = signedInAs('mentor');
    await expect(requirePageSession('/mentor')).resolves.toBe(session);
    expect(next.redirect).not.toHaveBeenCalled();
  });

  it('does not redirect when the check itself fails — the error page renders instead', async () => {
    next.cookieValue = 'signed-token';
    scope.withSessionCookieScope.mockRejectedValue(new Error('SESSION_SECRET is not configured'));
    await expect(requirePageSession('/home')).rejects.toThrow('SESSION_SECRET is not configured');
    expect(next.redirect).not.toHaveBeenCalled();
  });
});

describe('requirePageRole', () => {
  it('sends a signed-out visitor to sign-in, not to a home', async () => {
    await expect(redirectOf(requirePageRole('operator', '/admin'))).resolves.toBe(
      '/sign-in?returnTo=%2Fadmin',
    );
  });

  it('sends a mentee who opens a mentor screen to /home (edge case 19)', async () => {
    signedInAs('mentee');
    await expect(redirectOf(requirePageRole('mentor', '/mentor'))).resolves.toBe('/home');
  });

  it('refuses /admin to a mentor, sending them to /mentor (edge case 20)', async () => {
    signedInAs('mentor');
    await expect(redirectOf(requirePageRole('operator', '/admin/users'))).resolves.toBe('/mentor');
  });

  it('refuses a mentor-only screen to an operator, sending them to /admin', async () => {
    signedInAs('operator');
    await expect(redirectOf(requirePageRole('mentee', '/home'))).resolves.toBe('/admin');
  });

  it('returns the session when the required role is present', async () => {
    const session = signedInAs('operator');
    await expect(requirePageRole('operator', '/admin')).resolves.toBe(session);
    expect(next.redirect).not.toHaveBeenCalled();
  });

  it('admits a combined role set to each surface it holds', async () => {
    const session = signedInAs('mentee', 'mentor', 'operator');
    for (const [role, path] of [['mentee', '/home'], ['mentor', '/mentor'], ['operator', '/admin']] as const) {
      await expect(requirePageRole(role, path)).resolves.toBe(session);
    }
    expect(next.redirect).not.toHaveBeenCalled();
  });

  it('sends a combined mentee/mentor away from /admin to /mentor, not /home', async () => {
    signedInAs('mentee', 'mentor');
    await expect(redirectOf(requirePageRole('operator', '/admin'))).resolves.toBe('/mentor');
  });
});

describe('homeFor as the guards use it', () => {
  const roleForHome = (home: string): Role => {
    const role = (Object.keys(ROLE_HOMES) as Role[]).find((candidate) => ROLE_HOMES[candidate] === home);
    if (!role) throw new Error(`no role has the home ${home}`);
    return role;
  };
  const roleSets: RoleSet[] = [
    ['mentee'],
    ['mentor'],
    ['operator'],
    ['mentee', 'mentor'],
    ['mentee', 'operator'],
    ['mentor', 'operator'],
    ['mentee', 'mentor', 'operator'],
  ];

  it('applies the operator → mentor → mentee priority', () => {
    expect(roleSets.map(homeFor)).toEqual([
      '/home',
      '/mentor',
      '/admin',
      '/mentor',
      '/admin',
      '/admin',
      '/admin',
    ]);
  });

  it.each(roleSets)('never loops: the wrong-role redirect lands on a page this role set may open (%j)', async (...roles) => {
    const session = signedInAs(...(roles as unknown as RoleSet));
    const home = homeFor(session.roles);
    await expect(requirePageRole(roleForHome(home), home)).resolves.toBe(session);
  });
});

describe('signInRedirectPath', () => {
  it('encodes the path into a single returnTo parameter', () => {
    expect(signInRedirectPath('/home')).toBe('/sign-in?returnTo=%2Fhome');
    expect(signInRedirectPath('/a?x=1#y')).toBe('/sign-in?returnTo=%2Fa%3Fx%3D1%23y');
  });
});
