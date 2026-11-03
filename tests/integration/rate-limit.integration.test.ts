import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { entities, MikroORM, type EntityManager } from '@devmentor/db';
import { rateLimitKey, RateLimiter, SIGN_IN_PER_EMAIL, SIGN_IN_PER_IP, type RateLimitPolicy } from '@devmentor/core';
import { integrationChildEnvironment } from './environment';
import { runNpm } from './npm';

/**
 * TC-RATE-LIMIT-001 — the limiter's single upsert against real PostgreSQL (primitives
 * spec B8): what no fake can show — atomicity under concurrency, the window roll-over
 * and the purge. Owns its container and migrates it with the real npm scripts.
 */
let postgres: StartedPostgreSqlContainer | undefined;
let orm: MikroORM | undefined;
let now = new Date('2026-11-03T10:00:00.000Z');

const POLICY: RateLimitPolicy = { scope: 'it', kind: 'email', limit: 3, windowMs: 60_000 };

function limiter(): RateLimiter {
  return new RateLimiter({
    em: orm!.em.fork() as unknown as EntityManager,
    clock: { now: () => now },
    logger: { warn: () => undefined },
  });
}

async function counters(): Promise<Array<{ key: string; count: number }>> {
  return orm!.em.fork().getConnection().execute('select key, count from auth_rate_limits order by key');
}

const refused = (attempt: Promise<void>) => attempt.then(() => null, (error: unknown) => error);

describe('TC-RATE-LIMIT-001 PostgreSQL-backed rate limiting', () => {
  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('devmentor_rate_limit')
      .withUsername('devmentor')
      .withPassword('devmentor')
      .start();
    await runNpm(['run', 'db:migrate'], integrationChildEnvironment(postgres.getConnectionUri()));
    orm = await MikroORM.init({ entities, clientUrl: postgres.getConnectionUri() });
    await orm.connect();
  }, 180_000);

  afterAll(async () => {
    await orm?.close();
    await postgres?.stop();
  });

  it('counts every attempt and refuses past the limit, with the seconds left', async () => {
    const key = rateLimitKey(POLICY, 'grace@devmentor.test');
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await expect(limiter().consume(key, POLICY)).resolves.toBeUndefined();
    }
    now = new Date(now.getTime() + 20_000);
    const error = await refused(limiter().consume(key, POLICY));
    expect(error).toMatchObject({ status: 429, code: 'rate_limited', retryAfterSeconds: 40 });
    // The refused attempt was counted too.
    expect((await counters()).find((row) => row.key === key)?.count).toBe(4);
  });

  it('starts a new window once the old one has passed', async () => {
    const key = rateLimitKey(POLICY, 'roll@devmentor.test');
    for (let attempt = 0; attempt < 4; attempt += 1) await refused(limiter().consume(key, POLICY));
    now = new Date(now.getTime() + 60_000);
    await expect(limiter().consume(key, POLICY)).resolves.toBeUndefined();
    expect((await counters()).find((row) => row.key === key)?.count).toBe(1);
  });

  it('keeps per-IP and per-email counters independent', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await limiter().consumeFor(SIGN_IN_PER_EMAIL, 'ada@devmentor.test');
    }
    await expect(refused(limiter().consumeFor(SIGN_IN_PER_EMAIL, 'ada@devmentor.test'))).resolves.toMatchObject({ status: 429 });
    await expect(limiter().consumeFor(SIGN_IN_PER_IP, '203.0.113.7')).resolves.toBeUndefined();
    await expect(limiter().consumeFor(SIGN_IN_PER_EMAIL, 'someone-else@devmentor.test')).resolves.toBeUndefined();
  });

  it('is atomic: concurrent attempts on one key each get a distinct count', async () => {
    const policy: RateLimitPolicy = { scope: 'it-burst', kind: 'ip', limit: 10, windowMs: 60_000 };
    const key = rateLimitKey(policy, '198.51.100.9');
    const outcomes = await Promise.all(Array.from({ length: 25 }, () => refused(limiter().consume(key, policy))));

    expect(outcomes.filter((outcome) => outcome === null)).toHaveLength(10);
    expect(outcomes.filter((outcome) => outcome !== null)).toHaveLength(15);
    expect((await counters()).find((row) => row.key === key)?.count).toBe(25);
  });

  it('purges every other key whose window is older than the longest policy', async () => {
    const stale = rateLimitKey(POLICY, 'stale@devmentor.test');
    await limiter().consume(stale, POLICY);
    now = new Date(now.getTime() + 61 * 60_000); // past the longest (1 h) window

    const fresh = rateLimitKey(POLICY, 'fresh@devmentor.test');
    await limiter().consume(fresh, POLICY);

    const keys = (await counters()).map((row) => row.key);
    expect(keys).toContain(fresh);
    expect(keys).not.toContain(stale);
    expect(keys).toHaveLength(1); // every earlier scenario's rows were older too
  });
});
