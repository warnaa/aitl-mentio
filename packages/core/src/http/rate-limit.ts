import { createHash } from 'node:crypto';
import type { EntityManager } from '@devmentor/db';
import type { Logger } from '../logger';
import type { Clock } from '../time/clock';
import { TooManyRequestsError } from './errors';

/** A fixed-window policy: at most `limit` attempts per `windowMs` for one key. */
export interface RateLimitPolicy {
  /** What is being limited, e.g. `sign-in` — the first part of the key. */
  scope: string;
  /** What identifies the caller: a client IP or an email address. */
  kind: 'ip' | 'email';
  limit: number;
  windowMs: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/*
 * The policies (primitives spec B8). Conservative and easy to loosen. Every attempt
 * counts — the counter is consumed before any credential work and never decremented.
 */
export const SIGN_IN_PER_IP: RateLimitPolicy = { scope: 'sign-in', kind: 'ip', limit: 10, windowMs: 15 * MINUTE };
export const SIGN_IN_PER_EMAIL: RateLimitPolicy = { scope: 'sign-in', kind: 'email', limit: 5, windowMs: 15 * MINUTE };
export const REGISTER_PER_IP: RateLimitPolicy = { scope: 'register', kind: 'ip', limit: 5, windowMs: HOUR };
/** Verification mails sent to one address — every registration attempt sends one. */
export const VERIFICATION_MAIL_PER_EMAIL: RateLimitPolicy = {
  scope: 'verification-mail',
  kind: 'email',
  limit: 3,
  windowMs: HOUR,
};

const POLICIES = [SIGN_IN_PER_IP, SIGN_IN_PER_EMAIL, REGISTER_PER_IP, VERIFICATION_MAIL_PER_EMAIL];
/** Rows older than the longest window can no longer limit anything. */
export const LONGEST_WINDOW_MS = Math.max(...POLICIES.map((policy) => policy.windowMs));

/**
 * The counter key for `identifier` under `policy`: `<scope>:<kind>:<sha256>`. The
 * identifier is trimmed and lower-cased first, so `A@x` and `a@x` share a bucket, and
 * hashed, so the table holds no email address or IP.
 */
export function rateLimitKey(policy: RateLimitPolicy, identifier: string): string {
  const digest = createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex');
  return `${policy.scope}:${policy.kind}:${digest}`;
}

/**
 * The client IP for rate limiting, or `null` when none can be trusted.
 *
 * A route handler's `Request` has no socket address, so the IP comes from
 * `x-forwarded-for`. Next's server fills that header with the socket address **only when
 * it is absent** (`base-server.js`: `x-forwarded-for ??= socket.remoteAddress`) and
 * never appends, so with no trusted proxy (`hops = 0`) a client-supplied value is
 * indistinguishable from Next's: nothing is trusted. With `hops` trusted proxies, each
 * appends the address it saw, so the client is the `hops`-th entry from the right.
 * Fewer entries than that means the chain is not what was configured: `null`.
 */
export function clientIp(headers: Headers, hops: number): string | null {
  if (hops < 1) {
    return null;
  }
  const entries = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  return entries[entries.length - hops] ?? null;
}

interface CounterRow {
  count: number;
  window_start: Date | string;
}

/** What the limiter needs from the request scope. */
export interface RateLimiterDeps {
  em: Pick<EntityManager, 'execute'>;
  clock: Clock;
  logger: Pick<Logger, 'warn'>;
}

let warnedNoClientIp = false;

/** Test seam: forget that the no-client-IP warning was logged. */
export function resetRateLimitWarnings(): void {
  warnedNoClientIp = false;
}

/**
 * PostgreSQL-backed fixed-window counters (primitives spec B8), shared by every app
 * instance and surviving restarts. Scoped: it uses the request's `em`.
 */
export class RateLimiter {
  private readonly em: Pick<EntityManager, 'execute'>;
  private readonly clock: Clock;
  private readonly logger: Pick<Logger, 'warn'>;

  constructor({ em, clock, logger }: RateLimiterDeps) {
    this.em = em;
    this.clock = clock;
    this.logger = logger;
  }

  /**
   * Count one attempt against `key` and refuse it once the window holds more than
   * `policy.limit`. One atomic statement: it purges every *other* expired window (a
   * row may not be modified twice in one statement, and this key's own expiry is the
   * `CASE` below), then inserts the key or bumps it, restarting a window that has
   * passed. The refused attempt is counted too.
   *
   * @throws TooManyRequestsError with the seconds until the window ends.
   */
  async consume(key: string, policy: RateLimitPolicy): Promise<void> {
    const now = this.clock.now();
    const windowCutoff = new Date(now.getTime() - policy.windowMs);
    const purgeCutoff = new Date(now.getTime() - LONGEST_WINDOW_MS);
    const [row] = (await this.em.execute(
      `with purged as (
         delete from auth_rate_limits where window_start <= ? and key <> ?
       )
       insert into auth_rate_limits as counter (key, window_start, count)
       values (?, ?, 1)
       on conflict (key) do update set
         count = case when counter.window_start <= ? then 1 else counter.count + 1 end,
         window_start = case when counter.window_start <= ? then excluded.window_start else counter.window_start end
       returning count, window_start`,
      [purgeCutoff, key, key, now, windowCutoff, windowCutoff],
    )) as CounterRow[];
    if (row!.count > policy.limit) {
      const windowEnds = new Date(row!.window_start).getTime() + policy.windowMs;
      throw new TooManyRequestsError((windowEnds - now.getTime()) / 1000);
    }
  }

  /**
   * `consume` for an identifier under `policy`. A `null` identifier — no trustworthy
   * client IP (see `clientIp`) — skips this key, logging one warning per process; the
   * per-email key still applies.
   */
  async consumeFor(policy: RateLimitPolicy, identifier: string | null): Promise<void> {
    if (identifier === null) {
      if (!warnedNoClientIp) {
        warnedNoClientIp = true;
        this.logger.warn(
          { scope: policy.scope },
          'no trusted client IP (TRUSTED_PROXY_HOPS=0 or a short x-forwarded-for); per-IP rate limits are skipped',
        );
      }
      return;
    }
    await this.consume(rateLimitKey(policy, identifier), policy);
  }
}
