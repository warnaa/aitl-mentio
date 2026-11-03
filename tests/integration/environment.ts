import { randomBytes } from 'node:crypto';

/**
 * Test infrastructure is the sole exception to the application's config rule: it
 * inherits the parent environment only to pass ephemeral configuration to child
 * processes. Production code continues to read environment through zod config.
 *
 * @param appUrl the address the app child will be served at; omitted by suites that run
 *   only CLI children (migrations), which never serve the app.
 */
export function integrationChildEnvironment(databaseUrl: string, appUrl?: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: databaseUrl,
    DB_POOL_MIN: '0',
    DB_POOL_MAX: '5',
    // The address the app is actually served at (a random loopback port). The mock
    // GitHub adapter sends the browser to `${APP_URL}/api/auth/github/callback`, so a
    // stale default would send every sign-in to a port nothing listens on. Loopback also
    // matters for the `secure` session cookie: Chrome accepts it over plain HTTP only
    // because loopback origins are trustworthy (spec edge case 32).
    ...(appUrl === undefined ? {} : { APP_URL: appUrl }),
    // Production refuses to serve without a session secret; a fresh one per run means
    // no key is committed and no cookie outlives the run.
    SESSION_SECRET: randomBytes(32).toString('base64url'),
    // The mock GitHub adapter is accepted only together with the run signal.
    AUTH_IDENTITY_ADAPTER: 'mock',
    // Verification mail becomes a `mail.sent` line in app.log, read by `waitForMail`.
    MAILER_ADAPTER: 'log',
    INTEGRATION_TEST_RUN: '1',
    // Obviously fake on purpose (mirrored in .github/workflows/ci.yml); the real founder
    // addresses live only in deployment configuration. The mock adapter derives
    // `<login>@devmentor.test`, so the `mock-operator` login signs in as this operator.
    OPERATOR_EMAILS: 'mock-operator@devmentor.test',
  };
}
