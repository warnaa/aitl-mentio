import { decodeJwt } from 'jose';
import { describe, expect, it } from 'vitest';
import { BadRequestError, ServiceUnavailableError } from '../../http/errors';
import {
  EMAIL_VERIFY_PURPOSE,
  EMAIL_VERIFY_TTL_SECONDS,
  EmailVerificationService,
  VERIFY_EMAIL_PATH,
} from './email-verification.service';
import { TokenService } from './token.service';

const SECRET = 's'.repeat(40);
let now = new Date('2026-11-03T10:00:00.000Z');
const tokens = new TokenService({ env: { SESSION_SECRET: SECRET }, clock: { now: () => now } } as never);
const service = new EmailVerificationService({ tokenService: tokens, env: { APP_URL: 'https://devmentor.example' } });
const user = { id: 'user-1', sessionVersion: 2 };

const tokenOf = (link: string) => new URL(link).searchParams.get('token')!;

describe('EmailVerificationService', () => {
  it('links to the verify route with a token that reads back to the user, version and returnTo', async () => {
    const link = await service.link(user, '/mentor');

    expect(link.startsWith(`https://devmentor.example${VERIFY_EMAIL_PATH}?token=`)).toBe(true);
    await expect(service.read(tokenOf(link))).resolves.toEqual({ userId: 'user-1', version: 2, returnTo: '/mentor' });
  });

  it('omits returnTo when there is none', async () => {
    await expect(service.read(tokenOf(await service.link(user)))).resolves.toEqual({ userId: 'user-1', version: 2 });
  });

  it('is an email-verify purpose token valid for 24 hours, carrying no credential material', async () => {
    const token = tokenOf(await service.link(user));
    const claims = decodeJwt(token);

    expect(claims.aud).toBe(EMAIL_VERIFY_PURPOSE);
    expect(claims.exp! - claims.iat!).toBe(EMAIL_VERIFY_TTL_SECONDS);
    expect(JSON.parse(claims.sub!)).toEqual({ userId: 'user-1', version: 2 });
    expect(JSON.stringify(claims)).not.toMatch(/password|hash|scrypt/i);
  });

  it('refuses an expired link', async () => {
    const token = tokenOf(await service.link(user));
    now = new Date(now.getTime() + (EMAIL_VERIFY_TTL_SECONDS + 1) * 1000);
    try {
      await expect(service.read(token)).rejects.toBeInstanceOf(BadRequestError);
    } finally {
      now = new Date('2026-11-03T10:00:00.000Z');
    }
  });

  it('refuses a token minted for another purpose, and a tampered one', async () => {
    const state = await tokens.signPurposeToken({ purpose: 'oauth-state', subject: JSON.stringify({ userId: 'u', version: 0 }), ttlSeconds: 600 });
    await expect(service.read(state)).rejects.toBeInstanceOf(BadRequestError);

    const token = tokenOf(await service.link(user));
    await expect(service.read(`${token.slice(0, -2)}xx`)).rejects.toBeInstanceOf(BadRequestError);
  });

  it.each([
    ['not JSON', 'user-1'],
    ['the wrong shape', JSON.stringify({ userId: 'user-1' })],
    ['a negative version', JSON.stringify({ userId: 'user-1', version: -1 })],
  ])('refuses a correctly signed token whose subject is %s', async (_label, subject) => {
    const token = await tokens.signPurposeToken({ purpose: EMAIL_VERIFY_PURPOSE, subject, ttlSeconds: 60 });
    await expect(service.read(token)).rejects.toThrow(new BadRequestError('This link is invalid or has expired'));
  });

  it('fails closed with a 503 when SESSION_SECRET is not configured', async () => {
    const unconfigured = new EmailVerificationService({
      tokenService: new TokenService({ env: {}, clock: { now: () => now } } as never),
      env: { APP_URL: 'https://devmentor.example' },
    });
    await expect(unconfigured.link(user)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('writes a plain message with the name, the link and what to do if it was not you', () => {
    const mail = service.message('grace@devmentor.test', 'Grace Hopper', 'https://devmentor.example/api/auth/verify-email?token=t');

    expect(mail.to).toBe('grace@devmentor.test');
    expect(mail.subject).toBe('Confirm your DevMentor email address');
    expect(mail.text).toContain('Hi Grace Hopper,');
    expect(mail.text).toContain('\nhttps://devmentor.example/api/auth/verify-email?token=t\n');
    expect(mail.text).toContain('If you did not create a DevMentor account, ignore this email');
  });
});
