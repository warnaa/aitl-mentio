import { z } from 'zod';

/**
 * dotenv and Next turn `KEY=` into an empty string. For an optional value that means
 * "not configured", so an empty assignment is read as absent rather than as a value
 * that then fails `min(32)` or an enum check.
 */
const blankAsUnset = (value: unknown): unknown => (value === '' ? undefined : value);

function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess(blankAsUnset, schema.optional());
}

const identityAdapter = z.enum(['github', 'mock']);
const mailerAdapter = z.enum(['resend', 'log']);

/** HS256 needs at least 256 bits of key material. */
const sessionSecret = z.string().min(32, 'must be at least 32 characters');

/**
 * Application-wide environment schema. This is the single source of truth for config
 * across the app — nothing outside `core` (and `db`'s own narrow copy) should read
 * `process.env` directly. Add new config here so it is validated once at boot.
 *
 * Integration credentials are optional and checked where they are used, so a missing
 * one never stops the app from building or booting (primitives spec B6). Two rules
 * deliberately live elsewhere or fail harder:
 * - `SESSION_SECRET` is required in production at **container creation**
 *   (`assertProductionConfig`), never here: `next build` runs as production with no
 *   secrets and reaches `getEnv()`.
 * - A fake adapter selected without `INTEGRATION_TEST_RUN=1` is *dangerous*
 *   configuration and is refused here, at boot.
 */
const appEnvSchema = z
  .object({
    PLATFORM_CURRENCY: z.literal('PLN').default('PLN'),
    PLATFORM_PRICE_BOUNDS: z.string().min(1).default('{"p25":{"minCents":8000,"maxCents":60000},"p50":{"minCents":16000,"maxCents":120000}}'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_NAME: z.string().default('DevMentor'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    /** Public origin of the app, without a trailing slash. */
    APP_URL: z
      .url({ protocol: /^https?$/ })
      .default('http://localhost:3000')
      .transform((url) => url.replace(/\/+$/, '')),

    // Database — mirrors packages/db `env.ts`. Kept here too so config validation is
    // centralised; `db` reads its own copy for CLI use without importing `core`.
    DATABASE_URL: z.string().url().optional(),
    DB_HOST: z.string().default('127.0.0.1'),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_NAME: z.string().default('devmentor'),
    DB_USER: z.string().default('devmentor'),
    DB_PASSWORD: z.string().default('devmentor'),

    // Sessions and signed tokens. `_PREVIOUS` is accepted on verify only (rotation).
    SESSION_SECRET: optional(sessionSecret),
    SESSION_SECRET_PREVIOUS: optional(sessionSecret),
    // Snapshotted at invitation creation/acceptance; later policy never moves a deadline.
    INVITATION_TTL_DAYS: z.preprocess(blankAsUnset, z.coerce.number().int().min(1).max(365).default(14)),
    MENTOR_PUBLISH_WINDOW_DAYS: z.preprocess(blankAsUnset, z.coerce.number().int().min(1).max(365).default(14)),

    // GitHub OAuth app credentials; checked by the sign-in route, not at boot.
    GITHUB_CLIENT_ID: optional(z.string()),
    GITHUB_CLIENT_SECRET: optional(z.string()),

    /**
     * Comma-separated operator allowlist, parsed into trimmed, lower-cased, de-duplicated
     * addresses. Operator authority is derived from it on every request.
     */
    OPERATOR_EMAILS: z
      .string()
      .default('')
      .transform((value): readonly string[] => [
        ...new Set(
          value
            .split(',')
            .map((email) => email.trim().toLowerCase())
            .filter((email) => email !== ''),
        ),
      ]),

    /** Reverse proxies in front of the app whose `x-forwarded-for` entry is trusted. */
    TRUSTED_PROXY_HOPS: z.preprocess(
      blankAsUnset,
      z.coerce.number().int().min(0).default(0),
    ),

    // Adapter selection. A fake adapter needs INTEGRATION_TEST_RUN=1 too (refined below).
    AUTH_IDENTITY_ADAPTER: z.preprocess(
      blankAsUnset,
      identityAdapter.default('github'),
    ),
    /** Left unset, Slice 4 picks the log mailer in development and Resend elsewhere. */
    MAILER_ADAPTER: optional(mailerAdapter),
    INTEGRATION_TEST_RUN: z.preprocess(
      blankAsUnset,
      z
        .enum(['0', '1'])
        .default('0')
        .transform((value) => value === '1'),
    ),

    /**
     * Password hashes allowed to run at once (each holds ~128 MiB), and how long a
     * request waits for a slot before a retryable 503. See `PasswordService`.
     */
    PASSWORD_HASH_CONCURRENCY: z.preprocess(blankAsUnset, z.coerce.number().int().min(1).default(2)),
    PASSWORD_HASH_WAIT_MS: z.preprocess(blankAsUnset, z.coerce.number().int().min(0).default(5000)),

    // Transactional mail over Resend's HTTP API (consumed from Slice 4).
    MAIL_API_KEY: optional(z.string()),
    MAIL_FROM: optional(z.string()),
  })
  .superRefine((env, ctx) => {
    if (env.INTEGRATION_TEST_RUN) {
      return;
    }
    if (env.AUTH_IDENTITY_ADAPTER === 'mock') {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_IDENTITY_ADAPTER'],
        message:
          'AUTH_IDENTITY_ADAPTER=mock lets anyone sign in as anyone; it is refused unless INTEGRATION_TEST_RUN=1',
      });
    }
    if (env.MAILER_ADAPTER === 'log') {
      ctx.addIssue({
        code: 'custom',
        path: ['MAILER_ADAPTER'],
        message:
          'MAILER_ADAPTER=log never delivers mail; it is refused unless INTEGRATION_TEST_RUN=1',
      });
    }
  });

export type AppEnv = z.infer<typeof appEnvSchema>;

let cached: AppEnv | undefined;

/** Parse and cache the validated application environment. */
export function getEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  if (!cached) {
    cached = appEnvSchema.parse(env);
  }
  return cached;
}
