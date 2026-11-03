import { SignJWT, type JWTPayload } from 'jose';
import { describe, expect, it } from 'vitest';
import type { AppEnv } from '../../config/env';
import { ServiceUnavailableError } from '../../http/errors';
import type { Clock } from '../../time/clock';
import {
  clearSessionCookie,
  readSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  SessionService,
} from './session.service';
import { TokenService } from './token.service';

const SECRET = 'current-secret-current-secret-32';
const PREVIOUS = 'previous-secret-previous-secret!';
const NOW = new Date('2026-11-02T10:00:00.400Z');
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);
const user = { id: 'user-1', sessionVersion: 3 };

type Env = Pick<AppEnv, 'SESSION_SECRET' | 'SESSION_SECRET_PREVIOUS' | 'NODE_ENV'>;

const clockAt = (at: Date): Clock => ({ now: () => at });
const later = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);

function sessions(env: Partial<Env> = { SESSION_SECRET: SECRET }, at: Date = NOW): SessionService {
  return new SessionService({ env: { NODE_ENV: 'development', ...env }, clock: clockAt(at) });
}

/** The token out of a `Set-Cookie` value. */
const tokenOf = (cookie: string) => cookie.split(';')[0]!.slice(`${SESSION_COOKIE_NAME}=`.length);

async function issuedToken(service = sessions()): Promise<string> {
  return tokenOf((await service.issue(user)).cookie);
}

/** A validly signed session-audience token with an arbitrary payload. */
function craft(payload: JWTPayload, alg = 'HS256'): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setAudience('session')
    .setIssuedAt(NOW)
    .setExpirationTime(later(60))
    .sign(new TextEncoder().encode(SECRET));
}

describe('SessionService.issue', () => {
  it('signs { sub, sv, aud, iat, exp } for 24 hours from the injected clock, with no roles', async () => {
    const { cookie, expiresAt } = await sessions().issue(user);
    const payload = JSON.parse(Buffer.from(tokenOf(cookie).split('.')[1]!, 'base64url').toString());

    expect(payload).toEqual({
      sub: 'user-1',
      sv: 3,
      aud: 'session',
      iat: NOW_SECONDS,
      exp: NOW_SECONDS + SESSION_TTL_SECONDS,
    });
    expect(SESSION_TTL_SECONDS).toBe(86_400);
    expect(expiresAt).toEqual(new Date((NOW_SECONDS + 86_400) * 1000));
  });

  it('builds an HttpOnly, SameSite=Lax, Path=/ cookie without Secure outside production', async () => {
    const { cookie, expiresAt } = await sessions().issue(user);

    expect(cookie).toBe(
      `devmentor_session=${tokenOf(cookie)}; Path=/; Expires=${expiresAt.toUTCString()}; Max-Age=86400; HttpOnly; SameSite=Lax`,
    );
    expect(cookie).not.toMatch(/Secure/);
  });

  it.each(['development', 'test'] as const)('omits Secure when NODE_ENV=%s', async (NODE_ENV) => {
    const { cookie } = await sessions({ SESSION_SECRET: SECRET, NODE_ENV }).issue(user);

    expect(cookie).not.toMatch(/Secure/);
  });

  it('adds Secure in production', async () => {
    const { cookie } = await sessions({ SESSION_SECRET: SECRET, NODE_ENV: 'production' }).issue(user);

    expect(cookie).toMatch(/; HttpOnly; SameSite=Lax; Secure$/);
  });

  it('fails closed with a 503 when SESSION_SECRET is unset', async () => {
    await expect(sessions({}).issue(user)).rejects.toBeInstanceOf(ServiceUnavailableError);
    await expect(sessions({ SESSION_SECRET_PREVIOUS: PREVIOUS }).issue(user)).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });
});

describe('SessionService.verify', () => {
  it('round-trips an issued session', async () => {
    await expect(sessions().verify(await issuedToken())).resolves.toEqual({
      userId: 'user-1',
      sessionVersion: 3,
      issuedAt: new Date(NOW_SECONDS * 1000),
      expiresAt: new Date((NOW_SECONDS + 86_400) * 1000),
    });
  });

  it('accepts session version 0', async () => {
    const token = tokenOf((await sessions().issue({ id: 'user-1', sessionVersion: 0 })).cookie);

    await expect(sessions().verify(token)).resolves.toMatchObject({ sessionVersion: 0 });
  });

  it.each([null, undefined, ''])('returns null for an absent token (%j) without needing a secret', async (value) => {
    await expect(sessions({}).verify(value)).resolves.toBeNull();
  });

  it('rejects an expired session, and accepts it up to its last second', async () => {
    const token = await issuedToken();

    await expect(sessions(undefined, later(86_399)).verify(token)).resolves.not.toBeNull();
    await expect(sessions(undefined, later(86_400)).verify(token)).resolves.toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const [header, payload, signature] = (await issuedToken()).split('.');
    const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString());
    const forged = Buffer.from(JSON.stringify({ ...claims, sub: 'user-2' })).toString('base64url');

    await expect(sessions().verify(`${header}.${forged}.${signature}`)).resolves.toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const [header, payload, signature] = (await issuedToken()).split('.');
    const flipped = `${signature![0] === 'A' ? 'B' : 'A'}${signature!.slice(1)}`;

    await expect(sessions().verify(`${header}.${payload}.${flipped}`)).resolves.toBeNull();
  });

  it.each(['not-a-token', 'a.b.c', 'a.b', '...'])('rejects the malformed value %j', async (value) => {
    await expect(sessions().verify(value)).resolves.toBeNull();
  });

  it('rejects a purpose token presented as a session, on audience', async () => {
    const purposeToken = await new TokenService({
      env: { SESSION_SECRET: SECRET },
      clock: clockAt(NOW),
    }).signPurposeToken({ purpose: 'email-verification', subject: 'user-1', ttlSeconds: 3600 });

    await expect(sessions().verify(purposeToken)).resolves.toBeNull();
  });

  it('rejects a session-audience token without a session version', async () => {
    await expect(sessions().verify(await craft({ sub: 'user-1' }))).resolves.toBeNull();
  });

  it.each([
    ['a non-string subject', { sub: 42, sv: 0 }],
    ['an empty subject', { sub: '', sv: 0 }],
    ['a string session version', { sub: 'user-1', sv: '1' }],
    ['a fractional session version', { sub: 'user-1', sv: 1.5 }],
    ['a negative session version', { sub: 'user-1', sv: -1 }],
  ])('rejects a validly signed token with %s', async (_label, payload) => {
    await expect(sessions().verify(await craft(payload as JWTPayload))).resolves.toBeNull();
  });

  it('rejects a token signed with an algorithm outside the allowlist', async () => {
    await expect(sessions().verify(await craft({ sub: 'user-1', sv: 0 }, 'HS512'))).resolves.toBeNull();
  });

  it('verifies a token signed with SESSION_SECRET_PREVIOUS, but never issues with it', async () => {
    const rotated = sessions({ SESSION_SECRET: SECRET, SESSION_SECRET_PREVIOUS: PREVIOUS });
    const beforeRotation = await issuedToken(sessions({ SESSION_SECRET: PREVIOUS }));

    await expect(rotated.verify(beforeRotation)).resolves.toMatchObject({ userId: 'user-1' });

    const afterRotation = await issuedToken(rotated);
    await expect(sessions({ SESSION_SECRET: SECRET }).verify(afterRotation)).resolves.not.toBeNull();
    await expect(sessions({ SESSION_SECRET: PREVIOUS }).verify(afterRotation)).resolves.toBeNull();
  });

  it('fails closed with a 503 when a token is present but SESSION_SECRET is unset', async () => {
    const token = await issuedToken();

    await expect(sessions({ SESSION_SECRET_PREVIOUS: SECRET }).verify(token)).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });
});

describe('SessionService.verifyRequest', () => {
  it('verifies the session cookie among other cookies', async () => {
    const token = await issuedToken();
    const req = new Request('http://localhost/', {
      headers: { cookie: `theme=dark; ${SESSION_COOKIE_NAME}=${token}; other=1` },
    });

    await expect(sessions().verifyRequest(req)).resolves.toMatchObject({ userId: 'user-1' });
  });

  it('returns null for a request without a Cookie header', async () => {
    await expect(sessions({}).verifyRequest(new Request('http://localhost/'))).resolves.toBeNull();
  });
});

describe('SessionService.clear', () => {
  it('returns an already-expired cookie with the same flags', () => {
    expect(sessions().clear()).toBe(
      'devmentor_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax',
    );
  });

  it('adds Secure in production and needs no secret', () => {
    expect(sessions({ NODE_ENV: 'production' }).clear()).toMatch(/; Max-Age=0; HttpOnly; SameSite=Lax; Secure$/);
  });
});

describe('clearSessionCookie', () => {
  it('builds the same expiring cookie as SessionService.clear, without a service or secret', () => {
    expect(clearSessionCookie({ NODE_ENV: 'development' })).toBe(sessions().clear());
    expect(clearSessionCookie({ NODE_ENV: 'production' })).toBe(sessions({ NODE_ENV: 'production' }).clear());
    expect(clearSessionCookie({ NODE_ENV: 'production' })).toMatch(/; Secure$/);
  });
});

describe('readSessionCookie', () => {
  it.each([null, undefined, ''])('returns null for the absent header %j', (header) => {
    expect(readSessionCookie(header)).toBeNull();
  });

  it('returns the session value from a single-cookie header', () => {
    expect(readSessionCookie('devmentor_session=abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('finds it among other cookies, tolerating whitespace', () => {
    expect(readSessionCookie('a=1;  devmentor_session = abc ; b=2')).toBe('abc');
  });

  it('keeps any = inside the value', () => {
    expect(readSessionCookie('devmentor_session=a=b=')).toBe('a=b=');
  });

  it('returns null when only other cookies are present', () => {
    expect(readSessionCookie('theme=dark; xdevmentor_session=abc; devmentor_session_old=def')).toBeNull();
  });

  it('skips pairs without a separator', () => {
    expect(readSessionCookie('flag; devmentor_session=abc')).toBe('abc');
  });

  it('returns null for an empty session value', () => {
    expect(readSessionCookie('devmentor_session=; other=1')).toBeNull();
  });

  it('takes the first session cookie when several are sent', () => {
    expect(readSessionCookie('devmentor_session=first; devmentor_session=second')).toBe('first');
  });
});
