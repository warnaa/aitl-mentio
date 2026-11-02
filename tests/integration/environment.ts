import { randomBytes } from 'node:crypto';

/**
 * Test infrastructure is the sole exception to the application's config rule: it
 * inherits the parent environment only to pass ephemeral configuration to child
 * processes. Production code continues to read environment through zod config.
 */
export function integrationChildEnvironment(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: databaseUrl,
    DB_POOL_MIN: '0',
    DB_POOL_MAX: '5',
    // Keep migration:up aligned with the repository's committed snapshot name so a
    // test run never creates a duplicate migrations/devmentor.json artifact.
    MIKRO_ORM_MIGRATIONS_SNAPSHOT_NAME: '.snapshot-devmentor',
    // Production refuses to serve without a session secret; a fresh one per run means
    // no key is committed and no cookie outlives the run.
    SESSION_SECRET: randomBytes(32).toString('base64url'),
    // The mock GitHub adapter is accepted only together with the run signal.
    AUTH_IDENTITY_ADAPTER: 'mock',
    INTEGRATION_TEST_RUN: '1',
    // Obviously fake on purpose (mirrored in .github/workflows/ci.yml); the real founder
    // addresses live only in deployment configuration. The mock adapter derives
    // `<login>@devmentor.test`, so the `mock-operator` login signs in as this operator.
    OPERATOR_EMAILS: 'mock-operator@devmentor.test',
  };
}
