import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooManyRequestsError } from './errors';
import {
  clientIp,
  LONGEST_WINDOW_MS,
  rateLimitKey,
  RateLimiter,
  REGISTER_PER_IP,
  resetRateLimitWarnings,
  SIGN_IN_PER_EMAIL,
  SIGN_IN_PER_IP,
  VERIFICATION_MAIL_PER_EMAIL,
  type RateLimitPolicy,
} from './rate-limit';

/*
 * The SQL itself (atomic upsert, window roll-over, purge) is exercised against real
 * PostgreSQL in tests/integration/rate-limit.integration.test.ts. Here `execute` is a
 * fake returning the row the statement would, so the limiter's own logic is covered.
 */
const NOW = new Date('2026-11-03T10:00:00.000Z');
const POLICY: RateLimitPolicy = { scope: 'test', kind: 'email', limit: 3, windowMs: 60_000 };

const execute = vi.fn();
const warn = vi.fn();
const limiter = () => new RateLimiter({ em: { execute } as never, clock: { now: () => NOW }, logger: { warn } });

function counterReturns(count: number, windowStart: Date | string = NOW) {
  execute.mockResolvedValueOnce([{ count, window_start: windowStart }]);
}

beforeEach(() => {
  execute.mockReset();
  warn.mockReset();
  resetRateLimitWarnings();
});

describe('policies', () => {
  it('match primitives spec B8', () => {
    expect(SIGN_IN_PER_IP).toMatchObject({ scope: 'sign-in', kind: 'ip', limit: 10, windowMs: 15 * 60_000 });
    expect(SIGN_IN_PER_EMAIL).toMatchObject({ scope: 'sign-in', kind: 'email', limit: 5, windowMs: 15 * 60_000 });
    expect(REGISTER_PER_IP).toMatchObject({ scope: 'register', kind: 'ip', limit: 5, windowMs: 60 * 60_000 });
    expect(VERIFICATION_MAIL_PER_EMAIL).toMatchObject({ kind: 'email', limit: 3, windowMs: 60 * 60_000 });
    expect(LONGEST_WINDOW_MS).toBe(60 * 60_000);
  });
});

describe('rateLimitKey', () => {
  it('is <scope>:<kind>:<sha256 hex> and holds no raw identifier', () => {
    const key = rateLimitKey(SIGN_IN_PER_EMAIL, 'grace@devmentor.test');
    expect(key).toMatch(/^sign-in:email:[0-9a-f]{64}$/);
    expect(key).not.toContain('grace');
    expect(key).not.toContain('devmentor');
  });

  it('puts differently cased and padded spellings in one bucket', () => {
    expect(rateLimitKey(SIGN_IN_PER_EMAIL, '  Grace@DevMentor.Test ')).toBe(rateLimitKey(SIGN_IN_PER_EMAIL, 'grace@devmentor.test'));
  });

  it('keeps per-IP and per-email keys apart, even for the same string', () => {
    expect(rateLimitKey(SIGN_IN_PER_IP, 'x')).not.toBe(rateLimitKey(SIGN_IN_PER_EMAIL, 'x'));
    expect(rateLimitKey(SIGN_IN_PER_IP, 'x')).not.toBe(rateLimitKey(REGISTER_PER_IP, 'x'));
  });
});

describe('clientIp', () => {
  const headers = (forwardedFor?: string) => new Headers(forwardedFor === undefined ? {} : { 'x-forwarded-for': forwardedFor });

  it('trusts nothing with 0 hops: Next fills the header only when absent, so a client can set it', () => {
    expect(clientIp(headers('203.0.113.7'), 0)).toBeNull();
    expect(clientIp(headers(), 0)).toBeNull();
  });

  it('takes the entry the one trusted proxy appended (rightmost) with 1 hop', () => {
    expect(clientIp(headers('198.51.100.1, 203.0.113.7'), 1)).toBe('203.0.113.7');
    expect(clientIp(headers('203.0.113.7'), 1)).toBe('203.0.113.7');
  });

  it('takes the second from the right with 2 hops, ignoring a forged prefix', () => {
    expect(clientIp(headers('6.6.6.6, 203.0.113.7, 10.0.0.2'), 2)).toBe('203.0.113.7');
  });

  it('tolerates spaces and empty entries', () => {
    expect(clientIp(headers(' 203.0.113.7 ,, 10.0.0.2 '), 2)).toBe('203.0.113.7');
  });

  it('is null when the chain is shorter than the configured hops, or missing', () => {
    expect(clientIp(headers('203.0.113.7'), 2)).toBeNull();
    expect(clientIp(headers(), 1)).toBeNull();
  });
});

describe('RateLimiter.consume', () => {
  it('passes under and at the limit', async () => {
    counterReturns(1);
    await expect(limiter().consume('test:email:a', POLICY)).resolves.toBeUndefined();
    counterReturns(3);
    await expect(limiter().consume('test:email:a', POLICY)).resolves.toBeUndefined();
  });

  it('refuses the attempt past the limit with the seconds left in the window', async () => {
    counterReturns(4, new Date(NOW.getTime() - 15_000)); // window started 15 s ago, lasts 60 s
    const error = await limiter().consume('test:email:a', POLICY).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(TooManyRequestsError);
    expect(error).toMatchObject({ status: 429, retryAfterSeconds: 45, headers: { 'Retry-After': '45' } });
  });

  it('reads a window_start the driver returns as a string', async () => {
    counterReturns(4, new Date(NOW.getTime() - 50_000).toISOString());
    await expect(limiter().consume('test:email:a', POLICY)).rejects.toMatchObject({ retryAfterSeconds: 10 });
  });

  it('runs one statement: purge other expired keys, then upsert this one, with clock-derived bounds', async () => {
    counterReturns(1);
    await limiter().consume('test:email:a', POLICY);

    expect(execute).toHaveBeenCalledOnce();
    const [sql, params] = execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/delete from auth_rate_limits where window_start <= \? and key <> \?/);
    expect(sql).toMatch(/on conflict \(key\) do update/);
    expect(sql).toMatch(/returning count, window_start/);
    expect(params).toEqual([
      new Date(NOW.getTime() - LONGEST_WINDOW_MS), // purge cutoff
      'test:email:a', // spared from the purge
      'test:email:a',
      NOW,
      new Date(NOW.getTime() - 60_000), // this policy's window cutoff (count reset)
      new Date(NOW.getTime() - 60_000), // … and window_start reset
    ]);
  });

  it('propagates a database failure instead of letting the attempt through', async () => {
    execute.mockRejectedValueOnce(new Error('database unreachable'));
    await expect(limiter().consume('test:email:a', POLICY)).rejects.toThrow('database unreachable');
  });
});

describe('RateLimiter.consumeFor', () => {
  it('consumes the hashed key for the identifier', async () => {
    counterReturns(1);
    await limiter().consumeFor(SIGN_IN_PER_EMAIL, 'grace@devmentor.test');
    expect((execute.mock.calls[0] as [string, unknown[]])[1][2]).toBe(rateLimitKey(SIGN_IN_PER_EMAIL, 'grace@devmentor.test'));
  });

  it('skips a null identifier without touching the database, warning once per process', async () => {
    await limiter().consumeFor(SIGN_IN_PER_IP, null);
    await limiter().consumeFor(REGISTER_PER_IP, null);

    expect(execute).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith({ scope: 'sign-in' }, expect.stringContaining('per-IP rate limits are skipped'));
  });
});
