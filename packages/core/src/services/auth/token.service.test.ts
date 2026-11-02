import { errors, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { BadRequestError, ServiceUnavailableError } from '../../http/errors';
import type { Clock } from '../../time/clock';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

const SECRET = 'current-secret-current-secret-32';
const PREVIOUS = 'previous-secret-previous-secret!';
const NOW = new Date('2026-11-02T10:00:00.400Z');

function fixedClock(at: Date = NOW): Clock {
  return { now: () => at };
}

function tokens(env: { SESSION_SECRET?: string; SESSION_SECRET_PREVIOUS?: string }, at?: Date) {
  return new TokenService({ env, clock: fixedClock(at) });
}

const later = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);
const decode = (token: string) =>
  JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString()) as Record<string, unknown>;
const input = { purpose: 'email-verification', subject: 'user-1', ttlSeconds: 3600 };

async function expectInvalid(promise: Promise<unknown>, cause?: unknown): Promise<void> {
  const error = await promise.then(
    () => {
      throw new Error('expected the token to be rejected');
    },
    (rejection: unknown) => rejection,
  );
  expect(error).toBeInstanceOf(BadRequestError);
  expect(error).toMatchObject({ status: 400, message: 'This link is invalid or has expired' });
  if (cause) {
    expect((error as Error).cause).toBeInstanceOf(cause);
  }
}

describe('TokenService.signPurposeToken', () => {
  it('signs the purpose as aud, the subject as sub, and iat/exp from the injected clock', async () => {
    const token = await tokens({ SESSION_SECRET: SECRET }).signPurposeToken(input);

    expect(decode(token)).toEqual({
      aud: 'email-verification',
      sub: 'user-1',
      iat: Math.floor(NOW.getTime() / 1000),
      exp: Math.floor(NOW.getTime() / 1000) + 3600,
    });
  });

  it('fails closed with a 503 when SESSION_SECRET is unset', async () => {
    await expect(tokens({}).signPurposeToken(input)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it.each([0, -1, 1.5, Number.NaN])('refuses a ttlSeconds of %s', async (ttlSeconds) => {
    await expect(
      tokens({ SESSION_SECRET: SECRET }).signPurposeToken({ ...input, ttlSeconds }),
    ).rejects.toThrow(/ttlSeconds must be a positive integer/);
  });

  it.each(['', 'session'])('refuses the reserved purpose %j', async (purpose) => {
    await expect(
      tokens({ SESSION_SECRET: SECRET }).signPurposeToken({ ...input, purpose }),
    ).rejects.toThrow(/is not a valid purpose-token purpose/);
  });
});

describe('TokenService.verifyPurposeToken', () => {
  it('round-trips the subject', async () => {
    const service = tokens({ SESSION_SECRET: SECRET });
    const token = await service.signPurposeToken(input);

    await expect(service.verifyPurposeToken(token, 'email-verification')).resolves.toEqual({
      subject: 'user-1',
    });
  });

  it('round-trips an empty subject (an OAuth state with no return path)', async () => {
    const service = tokens({ SESSION_SECRET: SECRET });
    const token = await service.signPurposeToken({ purpose: 'oauth-state', subject: '', ttlSeconds: 600 });

    await expect(service.verifyPurposeToken(token, 'oauth-state')).resolves.toEqual({ subject: '' });
  });

  it('rejects a token minted for another purpose', async () => {
    const service = tokens({ SESSION_SECRET: SECRET });
    const token = await service.signPurposeToken(input);

    await expectInvalid(service.verifyPurposeToken(token, 'oauth-state'), errors.JWTClaimValidationFailed);
  });

  it('rejects a session cookie presented as a purpose token', async () => {
    const env = { SESSION_SECRET: SECRET, NODE_ENV: 'development' as const };
    const { cookie } = await new SessionService({ env, clock: fixedClock() }).issue({
      id: 'user-1',
      sessionVersion: 0,
    });
    const sessionToken = cookie.split(';')[0]!.split('=')[1]!;

    await expectInvalid(
      tokens(env).verifyPurposeToken(sessionToken, 'email-verification'),
      errors.JWTClaimValidationFailed,
    );
  });

  it('rejects an expired token, and accepts it up to its last second', async () => {
    const token = await tokens({ SESSION_SECRET: SECRET }).signPurposeToken(input);

    await expect(
      tokens({ SESSION_SECRET: SECRET }, later(3599)).verifyPurposeToken(token, 'email-verification'),
    ).resolves.toEqual({ subject: 'user-1' });
    await expectInvalid(
      tokens({ SESSION_SECRET: SECRET }, later(3600)).verifyPurposeToken(token, 'email-verification'),
      errors.JWTExpired,
    );
  });

  it('rejects a tampered signature', async () => {
    const service = tokens({ SESSION_SECRET: SECRET });
    const [header, payload, signature] = (await service.signPurposeToken(input)).split('.');
    const flipped = `${signature![0] === 'A' ? 'B' : 'A'}${signature!.slice(1)}`;

    await expectInvalid(
      service.verifyPurposeToken(`${header}.${payload}.${flipped}`, 'email-verification'),
      errors.JWSSignatureVerificationFailed,
    );
  });

  it('rejects a tampered payload', async () => {
    const service = tokens({ SESSION_SECRET: SECRET });
    const [header, payload, signature] = (await service.signPurposeToken(input)).split('.');
    const forged = Buffer.from(JSON.stringify({ ...decode(`.${payload}`), sub: 'user-2' })).toString(
      'base64url',
    );

    await expectInvalid(
      service.verifyPurposeToken(`${header}.${forged}.${signature}`, 'email-verification'),
      errors.JWSSignatureVerificationFailed,
    );
  });

  it.each(['', 'not-a-token', 'a.b.c'])('rejects the malformed value %j', async (value) => {
    await expectInvalid(tokens({ SESSION_SECRET: SECRET }).verifyPurposeToken(value, 'email-verification'));
  });

  it('rejects a token signed with an algorithm outside the allowlist', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS512' })
      .setAudience('email-verification')
      .setSubject('user-1')
      .setIssuedAt(NOW)
      .setExpirationTime(later(60))
      .sign(new TextEncoder().encode(SECRET));

    await expectInvalid(
      tokens({ SESSION_SECRET: SECRET }).verifyPurposeToken(token, 'email-verification'),
      errors.JOSEAlgNotAllowed,
    );
  });

  it('rejects a validly signed token whose subject is not a string', async () => {
    const token = await new SignJWT({ sub: 42 as unknown as string })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('email-verification')
      .setIssuedAt(NOW)
      .setExpirationTime(later(60))
      .sign(new TextEncoder().encode(SECRET));

    await expectInvalid(tokens({ SESSION_SECRET: SECRET }).verifyPurposeToken(token, 'email-verification'));
  });

  it('verifies a token signed with SESSION_SECRET_PREVIOUS', async () => {
    const before = await tokens({ SESSION_SECRET: PREVIOUS }).signPurposeToken(input);
    const rotated = tokens({ SESSION_SECRET: SECRET, SESSION_SECRET_PREVIOUS: PREVIOUS });

    await expect(rotated.verifyPurposeToken(before, 'email-verification')).resolves.toEqual({
      subject: 'user-1',
    });
    await expectInvalid(
      tokens({ SESSION_SECRET: SECRET }).verifyPurposeToken(before, 'email-verification'),
      errors.JWSSignatureVerificationFailed,
    );
  });

  it('fails closed with a 503 when SESSION_SECRET is unset', async () => {
    const token = await tokens({ SESSION_SECRET: SECRET }).signPurposeToken(input);

    await expect(
      tokens({ SESSION_SECRET_PREVIOUS: SECRET }).verifyPurposeToken(token, 'email-verification'),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it.each(['', 'session'])('refuses to verify for the reserved purpose %j', async (purpose) => {
    await expect(tokens({ SESSION_SECRET: SECRET }).verifyPurposeToken('x', purpose)).rejects.toThrow(
      /is not a valid purpose-token purpose/,
    );
  });
});
