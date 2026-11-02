import { errors } from 'jose';
import { describe, expect, it } from 'vitest';
import { ServiceUnavailableError } from '../../http/errors';
import { signingKeys, signJwt, verifyJwt } from './jwt';

const SECRET = 'current-secret-current-secret-32';
const PREVIOUS = 'previous-secret-previous-secret!';
const OTHER = 'unrelated-secret-unrelated-secr!';
const encode = (value: string) => new TextEncoder().encode(value);

const issuedAt = new Date('2026-11-02T10:00:00.000Z');
const expiresAt = new Date('2026-11-02T11:00:00.000Z');
const during = new Date('2026-11-02T10:30:00.000Z');

describe('signingKeys', () => {
  it('fails closed with a 503 when SESSION_SECRET is unset', () => {
    expect(() => signingKeys({})).toThrow(ServiceUnavailableError);
    expect(() => signingKeys({ SESSION_SECRET_PREVIOUS: PREVIOUS })).toThrow(ServiceUnavailableError);
  });

  it('signs with the current secret and verifies with it alone when no previous is set', () => {
    const keys = signingKeys({ SESSION_SECRET: SECRET });

    expect(keys.current).toEqual(encode(SECRET));
    expect(keys.verify).toEqual([encode(SECRET)]);
  });

  it('accepts the previous secret on verify, after the current one', () => {
    const keys = signingKeys({ SESSION_SECRET: SECRET, SESSION_SECRET_PREVIOUS: PREVIOUS });

    expect(keys.current).toEqual(encode(SECRET));
    expect(keys.verify).toEqual([encode(SECRET), encode(PREVIOUS)]);
  });
});

describe('signJwt / verifyJwt', () => {
  const claims = { audience: 'aud-a', subject: 'subject-1', issuedAt, expiresAt };

  it('round-trips the registered claims and any extra payload', async () => {
    const token = await signJwt({ ...claims, payload: { extra: 7 } }, encode(SECRET));

    const payload = await verifyJwt(token, [encode(SECRET)], {
      audience: 'aud-a',
      currentDate: during,
      requiredClaims: ['extra'],
    });

    expect(payload).toEqual({
      aud: 'aud-a',
      sub: 'subject-1',
      iat: issuedAt.getTime() / 1000,
      exp: expiresAt.getTime() / 1000,
      extra: 7,
    });
  });

  it('pins the HS256 algorithm in the header', async () => {
    const token = await signJwt(claims, encode(SECRET));
    const header = JSON.parse(Buffer.from(token.split('.')[0]!, 'base64url').toString());

    expect(header).toEqual({ alg: 'HS256', typ: 'JWT' });
  });

  it('falls through to a later key only on a signature mismatch', async () => {
    const token = await signJwt(claims, encode(PREVIOUS));

    await expect(
      verifyJwt(token, [encode(SECRET), encode(PREVIOUS)], { audience: 'aud-a', currentDate: during }),
    ).resolves.toMatchObject({ sub: 'subject-1' });
  });

  it('throws the signature failure when no key verifies', async () => {
    const token = await signJwt(claims, encode(OTHER));

    await expect(
      verifyJwt(token, [encode(SECRET), encode(PREVIOUS)], { audience: 'aud-a', currentDate: during }),
    ).rejects.toBeInstanceOf(errors.JWSSignatureVerificationFailed);
  });

  it('does not retry another key when the signature verified but a claim failed', async () => {
    const token = await signJwt(claims, encode(SECRET));

    await expect(
      verifyJwt(token, [encode(SECRET), encode(PREVIOUS)], { audience: 'aud-b', currentDate: during }),
    ).rejects.toBeInstanceOf(errors.JWTClaimValidationFailed);
    await expect(
      verifyJwt(token, [encode(SECRET)], { audience: 'aud-a', currentDate: expiresAt }),
    ).rejects.toBeInstanceOf(errors.JWTExpired);
  });

  it('requires the listed extra claims', async () => {
    const token = await signJwt(claims, encode(SECRET));

    await expect(
      verifyJwt(token, [encode(SECRET)], { audience: 'aud-a', currentDate: during, requiredClaims: ['sv'] }),
    ).rejects.toThrow(/missing required "sv" claim/);
  });
});
