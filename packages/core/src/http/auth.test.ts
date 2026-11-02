import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readSessionCookie, SessionService } from '../services/auth/session.service';
import type { Clock } from '../time/clock';
import { ForbiddenError, ServiceUnavailableError, UnauthorizedError } from './errors';

const UserEntity = vi.hoisted(() => class User {});
vi.mock('@devmentor/db', () => ({ User: UserEntity }));

const {
  assertOwnership,
  CSRF_HEADER_NAME,
  loadSession,
  requireCsrfHeader,
  requireRole,
  requireSession,
  resolveRoles,
  ROLES,
} = await import('./auth');
type Session = import('./auth').Session;

const SECRET = 'current-secret-current-secret-32';
const NOW = new Date('2026-11-02T10:00:00.000Z');
const clockAt = (at: Date): Clock => ({ now: () => at });
const VERIFIED = new Date('2026-10-01T00:00:00.000Z');
const FOUNDER = 'founder@devmentor.test';

interface Row {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  roles: string[];
  sessionVersion: number;
}

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: 'user-1',
    email: 'grace@devmentor.test',
    emailVerifiedAt: VERIFIED,
    roles: ['mentee'],
    sessionVersion: 2,
    ...overrides,
  };
}

const sessionService = (at: Date = NOW, env: { SESSION_SECRET?: string } = { SESSION_SECRET: SECRET }) =>
  new SessionService({ env: { NODE_ENV: 'test', ...env }, clock: clockAt(at) });

const tokenOf = (cookie: string) => cookie.split(';')[0]!.slice('devmentor_session='.length);

async function tokenFor(user: { id: string; sessionVersion: number }, at: Date = NOW) {
  return tokenOf((await sessionService(at).issue(user)).cookie);
}

let stored: Row | null;
let operatorEmails: readonly string[];
const em = { findOne: vi.fn(async () => stored), nativeUpdate: vi.fn(async () => 1) };
const eventBus = { emit: vi.fn(async () => undefined) };

function deps(service = sessionService()) {
  return { sessionService: service, em, eventBus, env: { OPERATOR_EMAILS: operatorEmails } } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  stored = row();
  operatorEmails = [];
});

describe('role vocabulary re-exports', () => {
  it('re-exports ROLES and resolveRoles from the roles module', async () => {
    const roles = await import('../services/auth/roles');

    expect(ROLES).toBe(roles.ROLES);
    expect(resolveRoles).toBe(roles.resolveRoles);
  });
});

describe('loadSession', () => {
  it('is null without a token, without touching the database', async () => {
    await expect(loadSession(null, deps())).resolves.toBeNull();
    await expect(loadSession(undefined, deps())).resolves.toBeNull();
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it('is null when the Cookie header carries only other cookies', async () => {
    const token = readSessionCookie('theme=dark; locale=pl');

    await expect(loadSession(token, deps())).resolves.toBeNull();
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it('returns the live session for a valid token with one primary-key lookup', async () => {
    const token = await tokenFor(row());
    const cookie = `theme=dark; devmentor_session=${token}`;

    await expect(loadSession(readSessionCookie(cookie), deps())).resolves.toEqual({
      userId: 'user-1',
      roles: ['mentee'],
    });
    expect(em.findOne).toHaveBeenCalledTimes(1);
    expect(em.findOne).toHaveBeenCalledWith(UserEntity, { id: 'user-1' });
    expect(em.nativeUpdate).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('is null for an expired token', async () => {
    const token = await tokenFor(row(), new Date(NOW.getTime() - 25 * 60 * 60 * 1000));

    await expect(loadSession(token, deps())).resolves.toBeNull();
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it('is null for a tampered token', async () => {
    const token = await tokenFor(row());
    const [header, payload, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload!, 'base64url').toString()), sub: 'user-2' }),
    ).toString('base64url');

    await expect(loadSession(`${header}.${forged}.${signature}`, deps())).resolves.toBeNull();
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it('is null when the user no longer exists', async () => {
    const token = await tokenFor(row());
    stored = null;

    await expect(loadSession(token, deps())).resolves.toBeNull();
  });

  it('is null when the session version was bumped after the token was issued', async () => {
    const token = await tokenFor(row({ sessionVersion: 2 }));
    stored = row({ sessionVersion: 3 });

    await expect(loadSession(token, deps())).resolves.toBeNull();
  });

  it('returns combined stored roles', async () => {
    const token = await tokenFor(row());
    stored = row({ roles: ['mentor', 'mentee'] });

    await expect(loadSession(token, deps())).resolves.toEqual({
      userId: 'user-1',
      roles: ['mentee', 'mentor'],
    });
  });

  it('throws an internal error, not null, for an empty stored role set', async () => {
    const token = await tokenFor(row());
    stored = row({ roles: [] });

    const failure = loadSession(token, deps());

    await expect(failure).rejects.toThrow('User user-1 has no effective role (stored roles: [])');
    await expect(failure).rejects.not.toBeInstanceOf(UnauthorizedError);
  });

  it('falls back to mentee, not a 500, when a de-listed operator held nothing else', async () => {
    const token = await tokenFor(row());
    stored = row({ email: FOUNDER, roles: ['operator'] });

    await expect(loadSession(token, deps())).resolves.toEqual({ userId: 'user-1', roles: ['mentee'] });
    expect(em.nativeUpdate).toHaveBeenCalledWith(
      UserEntity,
      { id: 'user-1', sessionVersion: 2 },
      { roles: ['mentee'] },
    );
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: 'user-1',
      added: ['mentee'],
      removed: ['operator'],
    });
  });

  it('revokes operator on the next request once the email leaves the allowlist, reconciling the cache', async () => {
    const token = await tokenFor(row());
    stored = row({ email: FOUNDER, roles: ['mentor', 'operator'] });
    operatorEmails = [FOUNDER];
    await expect(loadSession(token, deps())).resolves.toMatchObject({ roles: ['mentor', 'operator'] });
    expect(em.nativeUpdate).not.toHaveBeenCalled();

    operatorEmails = [];

    await expect(loadSession(token, deps())).resolves.toEqual({ userId: 'user-1', roles: ['mentor'] });
    // The cache is rewritten without touching sessionVersion, so the same token stays live.
    expect(em.nativeUpdate).toHaveBeenCalledTimes(1);
    expect(em.nativeUpdate).toHaveBeenCalledWith(
      UserEntity,
      { id: 'user-1', sessionVersion: 2 },
      { roles: ['mentor'] },
    );
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: 'user-1',
      added: [],
      removed: ['operator'],
    });
  });

  it('grants operator on the next request once the email joins the allowlist, without a new token', async () => {
    const token = await tokenFor(row());
    stored = row({ email: FOUNDER, roles: ['mentee'] });
    await expect(loadSession(token, deps())).resolves.toMatchObject({ roles: ['mentee'] });

    operatorEmails = [FOUNDER];

    await expect(loadSession(token, deps())).resolves.toMatchObject({ roles: ['mentee', 'operator'] });
    expect(em.nativeUpdate).toHaveBeenCalledWith(
      UserEntity,
      { id: 'user-1', sessionVersion: 2 },
      { roles: ['mentee', 'operator'] },
    );
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: 'user-1',
      added: ['operator'],
      removed: [],
    });
  });

  it('fails with 503 when a cookie is present but SESSION_SECRET is not configured', async () => {
    const token = await tokenFor(row());

    await expect(loadSession(token, deps(sessionService(NOW, {})))).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });
});

describe('requireSession', () => {
  const req = new Request('http://devmentor.test/api/things');
  const session: Session = { userId: 'user-1', roles: ['mentee'] };

  it('returns the scope’s live session', async () => {
    await expect(requireSession(req, { session: Promise.resolve(session) })).resolves.toBe(session);
  });

  it('throws 401 when the scope has no session', async () => {
    await expect(requireSession(req, { session: Promise.resolve(null) })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('propagates an internal error from session resolution rather than answering 401', async () => {
    const corrupt = new Error('User user-1 has no effective role');

    await expect(requireSession(req, { session: Promise.reject(corrupt) })).rejects.toBe(corrupt);
  });
});

describe('requireRole', () => {
  const combined: Session = { userId: 'user-1', roles: ['mentee', 'mentor'] };

  it('returns the session when it holds the role', () => {
    expect(requireRole(combined, 'mentor')).toBe(combined);
    expect(requireRole(combined, 'mentee')).toBe(combined);
  });

  it('throws 403 when the role is missing', () => {
    expect(() => requireRole(combined, 'operator')).toThrow(ForbiddenError);
  });
});

describe('requireCsrfHeader', () => {
  const post = (headers: Record<string, string>) =>
    new Request('http://devmentor.test/api/things', { method: 'POST', headers });

  it('accepts the header apiCall sends', () => {
    expect(CSRF_HEADER_NAME).toBe('x-devmentor-request');
    expect(() => requireCsrfHeader(post({ 'x-devmentor-request': '1' }))).not.toThrow();
  });

  it('refuses a request without the header', () => {
    expect(() => requireCsrfHeader(post({}))).toThrow(ForbiddenError);
  });

  it('refuses a request with a different value', () => {
    expect(() => requireCsrfHeader(post({ 'x-devmentor-request': 'true' }))).toThrow(ForbiddenError);
  });
});

describe('assertOwnership', () => {
  const session: Session = { userId: 'user-1', roles: ['mentee'] };

  it('passes for the owner', () => {
    expect(() => assertOwnership(session, 'user-1')).not.toThrow();
  });

  it('throws 403 for anyone else', () => {
    expect(() => assertOwnership(session, 'user-2')).toThrow(ForbiddenError);
  });
});
