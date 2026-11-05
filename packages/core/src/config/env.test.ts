import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppEnv } from './env';

/**
 * `getEnv` caches its first parse in a module-level `let`, so every case loads a fresh
 * copy of the module. `env.ts` imports only zod, so the reset is cheap.
 */
async function freshGetEnv() {
  vi.resetModules();
  return (await import('./env')).getEnv;
}

/** A raw environment; Next's types make `NODE_ENV` required on `ProcessEnv`. */
type RawEnv = Record<string, string | undefined>;

async function parse(env: RawEnv): Promise<AppEnv> {
  return (await freshGetEnv())(env as NodeJS.ProcessEnv);
}

const secret = 'a'.repeat(32);

/** What a deployed process looks like: production, a valid secret, real adapters. */
const productionShaped: RawEnv = {
  NODE_ENV: 'production',
  SESSION_SECRET: secret,
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
};

beforeEach(() => {
  vi.resetModules();
});

describe('getEnv', () => {
  it('parses an empty environment, leaving every optional integration unset', async () => {
    const env = await parse({});

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      APP_URL: 'http://localhost:3000',
      OPERATOR_EMAILS: [],
      TRUSTED_PROXY_HOPS: 0,
      PASSWORD_HASH_CONCURRENCY: 2,
      PASSWORD_HASH_WAIT_MS: 5000,
      AUTH_IDENTITY_ADAPTER: 'github',
      INTEGRATION_TEST_RUN: false,
    });
    for (const key of [
      'SESSION_SECRET',
      'SESSION_SECRET_PREVIOUS',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'MAILER_ADAPTER',
      'MAIL_API_KEY',
      'MAIL_FROM',
    ] as const) {
      expect(env[key]).toBeUndefined();
    }
  });

  it('parses production without SESSION_SECRET, so `next build` keeps working', async () => {
    const env = await parse({ NODE_ENV: 'production' });

    expect(env.NODE_ENV).toBe('production');
    expect(env.SESSION_SECRET).toBeUndefined();
  });

  it('reads blank assignments as unset', async () => {
    const env = await parse({
      SESSION_SECRET: '',
      SESSION_SECRET_PREVIOUS: '',
      GITHUB_CLIENT_ID: '',
      TRUSTED_PROXY_HOPS: '',
      PASSWORD_HASH_CONCURRENCY: '',
      PASSWORD_HASH_WAIT_MS: '',
      AUTH_IDENTITY_ADAPTER: '',
      MAILER_ADAPTER: '',
      INTEGRATION_TEST_RUN: '',
      MAIL_FROM: '',
    });

    expect(env.SESSION_SECRET).toBeUndefined();
    expect(env.SESSION_SECRET_PREVIOUS).toBeUndefined();
    expect(env.GITHUB_CLIENT_ID).toBeUndefined();
    expect(env.TRUSTED_PROXY_HOPS).toBe(0);
    expect(env.PASSWORD_HASH_CONCURRENCY).toBe(2);
    expect(env.PASSWORD_HASH_WAIT_MS).toBe(5000);
    expect(env.AUTH_IDENTITY_ADAPTER).toBe('github');
    expect(env.MAILER_ADAPTER).toBeUndefined();
    expect(env.INTEGRATION_TEST_RUN).toBe(false);
    expect(env.MAIL_FROM).toBeUndefined();
  });

  it('accepts a full, valid configuration', async () => {
    const env = await parse({
      ...productionShaped,
      SESSION_SECRET_PREVIOUS: 'b'.repeat(40),
      APP_URL: 'https://devmentor.example/',
      TRUSTED_PROXY_HOPS: '2',
      PASSWORD_HASH_CONCURRENCY: '4',
      PASSWORD_HASH_WAIT_MS: '0',
      MAILER_ADAPTER: 'resend',
      MAIL_API_KEY: 're_key',
      MAIL_FROM: 'DevMentor <no-reply@devmentor.example>',
    });

    expect(env).toMatchObject({
      SESSION_SECRET: secret,
      SESSION_SECRET_PREVIOUS: 'b'.repeat(40),
      GITHUB_CLIENT_ID: 'client-id',
      GITHUB_CLIENT_SECRET: 'client-secret',
      APP_URL: 'https://devmentor.example',
      TRUSTED_PROXY_HOPS: 2,
      PASSWORD_HASH_CONCURRENCY: 4,
      PASSWORD_HASH_WAIT_MS: 0,
      MAILER_ADAPTER: 'resend',
      MAIL_API_KEY: 're_key',
      MAIL_FROM: 'DevMentor <no-reply@devmentor.example>',
    });
  });

  it.each(['SESSION_SECRET', 'SESSION_SECRET_PREVIOUS'])(
    'rejects a %s shorter than 32 characters',
    async (key) => {
      await expect(parse({ [key]: 'a'.repeat(31) })).rejects.toThrow(/at least 32 characters/);
    },
  );

  it('parses OPERATOR_EMAILS into a trimmed, lower-cased, de-duplicated list', async () => {
    const env = await parse({
      OPERATOR_EMAILS: ' Founder@DevMentor.Example, ,ops@devmentor.example,founder@devmentor.example,',
    });

    expect(env.OPERATOR_EMAILS).toEqual(['founder@devmentor.example', 'ops@devmentor.example']);
  });

  it.each(['-1', '1.5', 'two'])('rejects TRUSTED_PROXY_HOPS=%s', async (value) => {
    await expect(parse({ TRUSTED_PROXY_HOPS: value })).rejects.toThrow();
  });

  it.each(['0', '-1', '1.5', 'two'])('rejects PASSWORD_HASH_CONCURRENCY=%s', async (value) => {
    await expect(parse({ PASSWORD_HASH_CONCURRENCY: value })).rejects.toThrow();
  });

  it.each(['-1', '1.5', 'soon'])('rejects PASSWORD_HASH_WAIT_MS=%s', async (value) => {
    await expect(parse({ PASSWORD_HASH_WAIT_MS: value })).rejects.toThrow();
  });

  it.each(['ftp://devmentor.example', 'not a url'])('rejects APP_URL=%s', async (value) => {
    await expect(parse({ APP_URL: value })).rejects.toThrow();
  });

  it.each([
    ['AUTH_IDENTITY_ADAPTER', 'stub'],
    ['MAILER_ADAPTER', 'smtp'],
    ['INTEGRATION_TEST_RUN', 'true'],
  ])('rejects the unknown value %s=%s', async (key, value) => {
    await expect(parse({ [key]: value })).rejects.toThrow();
  });

  describe('fake adapters', () => {
    it.each([
      ['AUTH_IDENTITY_ADAPTER=mock without INTEGRATION_TEST_RUN', { AUTH_IDENTITY_ADAPTER: 'mock' }, /AUTH_IDENTITY_ADAPTER=mock/],
      [
        'AUTH_IDENTITY_ADAPTER=mock with INTEGRATION_TEST_RUN=0',
        { AUTH_IDENTITY_ADAPTER: 'mock', INTEGRATION_TEST_RUN: '0' },
        /AUTH_IDENTITY_ADAPTER=mock/,
      ],
      ['MAILER_ADAPTER=log without INTEGRATION_TEST_RUN', { MAILER_ADAPTER: 'log' }, /MAILER_ADAPTER=log/],
      [
        'MAILER_ADAPTER=log with INTEGRATION_TEST_RUN=0',
        { MAILER_ADAPTER: 'log', INTEGRATION_TEST_RUN: '0' },
        /MAILER_ADAPTER=log/,
      ],
    ])('refuses %s in a production-shaped env', async (_label, overrides, message) => {
      await expect(parse({ ...productionShaped, ...overrides })).rejects.toThrow(message);
    });

    it('reports both fakes when both are set without INTEGRATION_TEST_RUN', async () => {
      const failure = parse({ ...productionShaped, AUTH_IDENTITY_ADAPTER: 'mock', MAILER_ADAPTER: 'log' });

      await expect(failure).rejects.toThrow(/AUTH_IDENTITY_ADAPTER=mock/);
      await expect(failure).rejects.toThrow(/MAILER_ADAPTER=log/);
    });

    it('accepts both fakes alongside INTEGRATION_TEST_RUN=1', async () => {
      const env = await parse({
        ...productionShaped,
        AUTH_IDENTITY_ADAPTER: 'mock',
        MAILER_ADAPTER: 'log',
        INTEGRATION_TEST_RUN: '1',
      });

      expect(env).toMatchObject({
        AUTH_IDENTITY_ADAPTER: 'mock',
        MAILER_ADAPTER: 'log',
        INTEGRATION_TEST_RUN: true,
      });
    });
  });

  it('caches the first parse and ignores later arguments', async () => {
    const getEnv = await freshGetEnv();

    const first = getEnv({ APP_NAME: 'First' } as RawEnv as NodeJS.ProcessEnv);
    const second = getEnv({ APP_NAME: 'Second' } as RawEnv as NodeJS.ProcessEnv);

    expect(second).toBe(first);
    expect(second.APP_NAME).toBe('First');
  });

  it('reads process.env when called without an argument', async () => {
    vi.stubEnv('APP_NAME', 'FromProcessEnv');
    try {
      expect((await freshGetEnv())().APP_NAME).toBe('FromProcessEnv');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('invitation policy configuration', () => {
  it('defaults both snapshotted day policies and accepts explicit overrides', async () => {
    expect(await parse({})).toMatchObject({ INVITATION_TTL_DAYS: 14, MENTOR_PUBLISH_WINDOW_DAYS: 14 });
    expect(await parse({ INVITATION_TTL_DAYS: '30', MENTOR_PUBLISH_WINDOW_DAYS: '7' })).toMatchObject({ INVITATION_TTL_DAYS: 30, MENTOR_PUBLISH_WINDOW_DAYS: 7 });
    expect(await parse({ INVITATION_TTL_DAYS: '', MENTOR_PUBLISH_WINDOW_DAYS: '' })).toMatchObject({ INVITATION_TTL_DAYS: 14, MENTOR_PUBLISH_WINDOW_DAYS: 14 });
  });
  it.each(['0', '-1', '1.5', '366', 'invalid'])('rejects invalid policy value %s', async value => {
    for (const key of ['INVITATION_TTL_DAYS', 'MENTOR_PUBLISH_WINDOW_DAYS']) await expect(parse({ [key]: value })).rejects.toThrow();
  });
});
