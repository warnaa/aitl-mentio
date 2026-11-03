import { scrypt } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableError } from '../../http/errors';
import {
  PasswordService,
  SCRYPT_BLOCK_SIZE,
  SCRYPT_COST,
  SCRYPT_MAXMEM,
  SCRYPT_PARALLELISM,
  type PasswordHasher,
} from './password.service';

const service = (concurrency = 2, waitMs = 1000) =>
  new PasswordService({ env: { PASSWORD_HASH_CONCURRENCY: concurrency, PASSWORD_HASH_WAIT_MS: waitMs } });

/** Run `work` with the real hasher, through a roomy gate. */
const withHasher = <T>(work: (hasher: PasswordHasher) => Promise<T>) => service(4).withHashingSlot(work);

afterEach(() => {
  vi.useRealTimers();
});

describe('PasswordHasher (real scrypt at the production parameters)', () => {
  it('hashes to a self-describing string that is not the password and differs per call', async () => {
    const [first, second] = await withHasher((hasher) =>
      Promise.all([hasher.hash('correct horse battery'), hasher.hash('correct horse battery')]),
    );

    expect(first).toMatch(/^scrypt\$131072\$8\$1\$[A-Za-z0-9+/]+=*\$[A-Za-z0-9+/]+=*$/);
    expect(first).not.toContain('correct horse battery');
    expect(first).not.toBe(second); // random salt
  });

  it('verifies the right password and refuses a wrong one', async () => {
    await withHasher(async (hasher) => {
      const stored = await hasher.hash('correct horse battery');
      await expect(hasher.verify('correct horse battery', stored)).resolves.toBe(true);
      await expect(hasher.verify('correct horse batterz', stored)).resolves.toBe(false);
    });
  });

  it('never verifies a null (GitHub-only) hash, and still pays one derivation for it', async () => {
    const started = performance.now();
    await expect(withHasher((hasher) => hasher.verify('anything', null))).resolves.toBe(false);
    // A real scrypt at N=2^17 takes tens of milliseconds at least; an early return takes ~0.
    expect(performance.now() - started).toBeGreaterThan(20);
  });

  it.each([
    ['another scheme', 'bcrypt$12$x$y$z$w'],
    ['too few parts', 'scrypt$131072$8$1$c2FsdA=='],
    ['a non-numeric cost', 'scrypt$lots$8$1$c2FsdA==$a2V5'],
    ['a zero parameter', 'scrypt$131072$0$1$c2FsdA==$a2V5'],
    ['a cost that is not a power of two', 'scrypt$131071$8$1$c2FsdA==$a2V5'],
    ['a cost of one', 'scrypt$1$8$1$c2FsdA==$a2V5'],
    ['an empty salt', 'scrypt$131072$8$1$$a2V5'],
    ['an empty key', 'scrypt$131072$8$1$c2FsdA==$'],
  ])('refuses a malformed stored hash (%s)', async (_label, stored) => {
    await expect(withHasher((hasher) => hasher.verify('anything', stored))).resolves.toBe(false);
  });

  it('verifies with the parameters stored in the hash, so raising the constants keeps old hashes valid', async () => {
    const salt = Buffer.from('fixed-salt-bytes');
    const key = await new Promise<Buffer>((resolve, reject) =>
      scrypt('older password', salt, 32, { N: 2 ** 14, r: 8, p: 1 }, (error, derived) => (error ? reject(error) : resolve(derived))),
    );
    const older = ['scrypt', 2 ** 14, 8, 1, salt.toString('base64'), key.toString('base64')].join('$');

    await expect(withHasher((hasher) => hasher.verify('older password', older))).resolves.toBe(true);
  });

  it('needs the raised maxmem: these parameters exceed Node’s 32 MiB default (regression)', async () => {
    const attempt = (options: { N: number; r: number; p: number; maxmem?: number }) =>
      new Promise<void>((resolve, reject) =>
        scrypt('x', 'salt', 64, options, (error) => (error ? reject(error) : resolve())),
      );
    const params = { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELISM };

    await expect(attempt(params)).rejects.toThrow(/memory/i);
    await expect(attempt({ ...params, maxmem: SCRYPT_MAXMEM })).resolves.toBeUndefined();
  });
});

describe('PasswordService concurrency gate', () => {
  /** A unit of work that holds its slot until released. */
  function held() {
    let release!: () => void;
    const done = new Promise<void>((resolve) => {
      release = resolve;
    });
    return { work: () => done, release };
  }

  it('admits up to the limit at once and queues the rest in order', async () => {
    const gate = service(2);
    const order: string[] = [];
    const a = held();
    const b = held();
    const c = held();

    const runs = [
      gate.withHashingSlot(async () => {
        order.push('a');
        await a.work();
      }),
      gate.withHashingSlot(async () => {
        order.push('b');
        await b.work();
      }),
      gate.withHashingSlot(async () => {
        order.push('c');
        await c.work();
      }),
    ];
    await Promise.resolve();
    expect(order).toEqual(['a', 'b']); // c waits

    a.release();
    await runs[0];
    await vi.waitFor(() => expect(order).toEqual(['a', 'b', 'c']));
    b.release();
    c.release();
    await Promise.all(runs);
  });

  it('frees the slot when the work throws', async () => {
    const gate = service(1);
    await expect(gate.withHashingSlot(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(gate.withHashingSlot(async () => 'next')).resolves.toBe('next');
  });

  it('passes the hasher to the work and returns its result', async () => {
    await expect(service(1).withHashingSlot(async (hasher) => typeof hasher.hash)).resolves.toBe('function');
  });

  it('fails a waiter with a retryable 503 after PASSWORD_HASH_WAIT_MS, without running its work', async () => {
    vi.useFakeTimers();
    const gate = service(1, 250);
    const busy = held();
    const holder = gate.withHashingSlot(busy.work);
    const waiterWork = vi.fn(async () => 'ran');

    const waiter = gate.withHashingSlot(waiterWork);
    const outcome = expect(waiter).rejects.toBeInstanceOf(ServiceUnavailableError);
    await vi.advanceTimersByTimeAsync(250);
    await outcome;
    expect(waiterWork).not.toHaveBeenCalled();

    busy.release();
    await holder;
    // The timed-out waiter left the queue: the freed slot goes to the next caller at once.
    await expect(gate.withHashingSlot(async () => 'after')).resolves.toBe('after');
  });

  it('keeps the other waiters queued when one times out', async () => {
    vi.useFakeTimers();
    const gate = service(1, 100);
    const busy = held();
    const holder = gate.withHashingSlot(busy.work);
    const first = gate.withHashingSlot(async () => 'first');
    const firstOutcome = expect(first).rejects.toBeInstanceOf(ServiceUnavailableError);
    await vi.advanceTimersByTimeAsync(50);
    const second = gate.withHashingSlot(async () => 'second');

    await vi.advanceTimersByTimeAsync(50); // the first waiter's deadline
    await firstOutcome;
    busy.release();
    await holder;
    await expect(second).resolves.toBe('second');
  });
});
