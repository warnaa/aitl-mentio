import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';
import type { AppEnv } from '../../config/env';
import { ServiceUnavailableError } from '../../http/errors';

/*
 * scrypt at OWASP's recommended parameters (E01 spec, primitives B9). `node:crypto`'s
 * scrypt runs on the libuv threadpool, not the main thread, and adds no dependency —
 * unlike `bcryptjs`, whose pure-JS rounds would stall the whole Next server.
 */

/** CPU/memory cost N = 2¹⁷: OWASP's scrypt recommendation. */
export const SCRYPT_COST = 2 ** 17;
/** Block size r = 8. */
export const SCRYPT_BLOCK_SIZE = 8;
/** Parallelism p = 1. */
export const SCRYPT_PARALLELISM = 1;
/** Derived key length, in bytes. */
export const SCRYPT_KEY_BYTES = 64;
/** Random salt length, in bytes. */
export const SCRYPT_SALT_BYTES = 16;
/**
 * scrypt needs 128·N·r bytes — 128 MiB at these parameters — and Node refuses anything
 * above its default `maxmem` of 32 MiB, so the call would throw without this. Twice the
 * requirement leaves headroom for Node's own bookkeeping.
 */
export const SCRYPT_MAXMEM = 2 * 128 * SCRYPT_COST * SCRYPT_BLOCK_SIZE;

const SCHEME = 'scrypt';

const OPTIONS: ScryptOptions = {
  N: SCRYPT_COST,
  r: SCRYPT_BLOCK_SIZE,
  p: SCRYPT_PARALLELISM,
  maxmem: SCRYPT_MAXMEM,
};

const derive = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyBytes: number,
  options: ScryptOptions,
) => Promise<Buffer>;

const isPowerOfTwo = (value: number) => value > 1 && (value & (value - 1)) === 0;

/** A parsed `scrypt$N$r$p$salt$key` hash. */
interface ParsedHash {
  options: ScryptOptions;
  salt: Buffer;
  key: Buffer;
}

/**
 * Parse a stored hash. Its parameters travel with it, so raising the constants later
 * keeps every existing hash verifiable. Anything malformed is `null` — never verifies.
 */
function parse(stored: string): ParsedHash | null {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== SCHEME) {
    return null;
  }
  const [N, r, p] = parts.slice(1, 4).map(Number) as [number, number, number];
  const salt = Buffer.from(parts[4]!, 'base64');
  const key = Buffer.from(parts[5]!, 'base64');
  const positive = [N, r, p].every((value) => Number.isSafeInteger(value) && value > 0);
  // scrypt throws on an N that is not a power of two; refuse it here instead of a 500.
  if (!positive || !isPowerOfTwo(N) || salt.length === 0 || key.length === 0) {
    return null;
  }
  return { options: { N, r, p, maxmem: 2 * 128 * N * r }, salt, key };
}

/**
 * The only way to hash or verify: handed to the callback of `withHashingSlot`, so no
 * hashing can happen outside the concurrency gate.
 */
export interface PasswordHasher {
  /** A self-describing hash: `scrypt$N$r$p$<salt base64>$<key base64>`. */
  hash(password: string): Promise<string>;
  /**
   * Whether `password` matches `stored`, in constant time. A `null` (GitHub-only) or
   * malformed hash never verifies — but still costs one derivation, so "no such
   * account" and "wrong password" take the same time.
   */
  verify(password: string, stored: string | null): Promise<boolean>;
}

const hasher: PasswordHasher = {
  async hash(password) {
    const salt = randomBytes(SCRYPT_SALT_BYTES);
    const key = await derive(password, salt, SCRYPT_KEY_BYTES, OPTIONS);
    return [SCHEME, SCRYPT_COST, SCRYPT_BLOCK_SIZE, SCRYPT_PARALLELISM, salt.toString('base64'), key.toString('base64')].join('$');
  },
  async verify(password, stored) {
    const parsed = stored === null ? null : parse(stored);
    if (!parsed) {
      await derive(password, randomBytes(SCRYPT_SALT_BYTES), SCRYPT_KEY_BYTES, OPTIONS);
      return false;
    }
    const key = await derive(password, parsed.salt, parsed.key.length, parsed.options);
    return timingSafeEqual(key, parsed.key);
  },
};

/** What the gate reads from the environment. */
export type PasswordEnv = Pick<AppEnv, 'PASSWORD_HASH_CONCURRENCY' | 'PASSWORD_HASH_WAIT_MS'>;

/**
 * Password hashing behind a **process-wide concurrency gate** (register as a
 * singleton). Each derivation holds about 128 MiB, and the rate limiter is per IP and
 * per email, not global, so without the gate a few dozen distinct addresses would be
 * gigabytes of concurrent allocation.
 *
 * At most `PASSWORD_HASH_CONCURRENCY` callbacks run at once; the rest queue in order
 * for up to `PASSWORD_HASH_WAIT_MS`, then fail with a retryable 503. Callers acquire
 * the slot **before** consuming a rate limit (primitives B8), so a saturated gate never
 * counts against anyone's attempts.
 */
export class PasswordService {
  private readonly limit: number;
  private readonly waitMs: number;
  private running = 0;
  private readonly queue: Array<() => void> = [];

  constructor({ env }: { env: PasswordEnv }) {
    this.limit = env.PASSWORD_HASH_CONCURRENCY;
    this.waitMs = env.PASSWORD_HASH_WAIT_MS;
  }

  /**
   * Run `work` holding one hashing slot, handing it the hasher.
   *
   * @throws ServiceUnavailableError when no slot frees up within the wait.
   */
  async withHashingSlot<T>(work: (hasher: PasswordHasher) => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await work(hasher);
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.limit) {
      this.running += 1;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const admit = () => {
        clearTimeout(timer);
        resolve(); // the releasing caller handed its slot over; `running` is unchanged
      };
      const timer = setTimeout(() => {
        this.queue.splice(this.queue.indexOf(admit), 1);
        reject(new ServiceUnavailableError('Sign-in is busy right now. Try again in a moment.'));
      }, this.waitMs);
      this.queue.push(admit);
    });
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.running -= 1;
    }
  }
}
