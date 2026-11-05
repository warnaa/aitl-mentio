import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  type AwilixContainer,
  type Resolver,
} from 'awilix';
import { getOrm } from '@devmentor/db';
import { getEnv, type AppEnv } from '../config/env';
import { loadSession } from '../http/auth';
import { RateLimiter } from '../http/rate-limit';
import { createLogger } from '../logger';
import { GithubIdentityAdapter } from '../services/auth/adapters/github-identity';
import { MockGithubIdentityAdapter } from '../services/auth/adapters/mock-github-identity';
import type { GithubIdentityPort } from '../services/auth/github-identity.port';
import { LogMailer } from '../services/notifications/adapters/log-mailer';
import { ResendMailer } from '../services/notifications/adapters/resend-mailer';
import type { Mailer } from '../services/notifications/mailer.port';
import { EventBus } from '../events/event-bus';
import { EmailVerificationService } from '../services/auth/email-verification.service';
import { PasswordService } from '../services/auth/password.service';
import { readSessionCookie, SessionService } from '../services/auth/session.service';
import { TokenService } from '../services/auth/token.service';
import { UserService } from '../services/auth/user.service';
import { InvitationService } from '../services/invitations/invitation.service';
import { MentorProfileService } from '../services/mentors/mentor-profile.service';
import { SlotService } from '../services/availability/slot.service';
import { systemClock } from '../time/clock';
import type { Cradle } from './cradle';

/**
 * The root container is cached on `globalThis` so Next.js HMR reuses a single
 * container (and the single ORM/pool it holds) across dev reloads. Registrations are
 * explicit — no `loadModules` globbing — so every binding is greppable.
 */
const globalForContainer = globalThis as unknown as {
  __devmentorContainer?: Promise<AwilixContainer<Cradle>>;
};

/**
 * Configuration production cannot serve without. Checked when the container is first
 * created — never in the zod schema — because `next build` also runs as production,
 * with no secrets in CI, and reaches `getEnv()`; the container only exists at request
 * time. Development and the build are unaffected (primitives spec B6, E01 edge case 1b).
 */
function assertProductionConfig(env: AppEnv): void {
  if (env.NODE_ENV !== 'production') {
    return;
  }
  if (!env.SESSION_SECRET) {
    throw new Error(
      'SESSION_SECRET is required when NODE_ENV=production (at least 32 characters; generate one with `openssl rand -base64 32`).',
    );
  }
  // Registration cannot succeed without mail: refuse to serve rather than 503 every sign-up.
  if (mailerChoice(env) === 'resend' && (!env.MAIL_API_KEY || !env.MAIL_FROM)) {
    throw new Error(
      'MAIL_API_KEY and MAIL_FROM are required when NODE_ENV=production (Resend API key and sender address).',
    );
  }
}

type MailerChoice = 'log' | 'log-by-default' | 'resend';

/**
 * Which mailer serves this environment (primitives spec B14). The log mailer — which
 * writes message bodies to the log — is chosen only from flags that are *present*:
 * `MAILER_ADAPTER=log` with `INTEGRATION_TEST_RUN=1` (the env schema refuses the switch
 * alone), or plain `npm run dev` with no `MAILER_ADAPTER` at all, so a local
 * registration form works without a provider. Everything else delivers through Resend.
 */
function mailerChoice(env: AppEnv): MailerChoice {
  if (env.MAILER_ADAPTER === 'log' && env.INTEGRATION_TEST_RUN) {
    return 'log';
  }
  if (env.MAILER_ADAPTER === undefined && env.NODE_ENV === 'development') {
    return 'log-by-default';
  }
  return 'resend';
}

function mailerAdapter(choice: MailerChoice): Resolver<Mailer> {
  return choice === 'resend' ? asClass(ResendMailer).singleton() : asClass(LogMailer).singleton();
}

/**
 * The GitHub identity adapter. The mock is chosen only from two flags that are both
 * *present* — never from credentials that are absent (primitives spec B14). The env
 * schema already refuses the switch without the run flag; requiring both here as well
 * means no other path to this function can select the mock alone.
 */
function identityAdapter(env: AppEnv): Resolver<GithubIdentityPort> {
  return env.AUTH_IDENTITY_ADAPTER === 'mock' && env.INTEGRATION_TEST_RUN
    ? asClass(MockGithubIdentityAdapter).singleton()
    : asClass(GithubIdentityAdapter).singleton();
}

async function build(): Promise<AwilixContainer<Cradle>> {
  const env = getEnv();
  assertProductionConfig(env);

  // Resolve the ORM once up front so it can be registered as a shared singleton value.
  const orm = await getOrm();

  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  container.register({
    env: asValue(env),
    logger: asFunction(createLogger).singleton(),
    clock: asValue(systemClock),
    orm: asValue(orm),
    eventBus: asClass(EventBus).singleton(),
    // Stateless signers over `env` + `clock`; a missing secret surfaces per call as a 503.
    sessionService: asClass(SessionService).singleton(),
    tokenService: asClass(TokenService).singleton(),
    // A singleton on purpose: its concurrency gate must be one per process.
    passwordService: asClass(PasswordService).singleton(),
    // Stateless over `tokenService` + `env`: makes and reads verification links.
    emailVerification: asClass(EmailVerificationService).singleton(),
    // Real GitHub by default; missing credentials surface per call as a 503.
    identity: identityAdapter(env),
    // Resend unless a log mailer is explicitly selected (see `mailerChoice`).
    mailer: mailerAdapter(mailerChoice(env)),
    // A forked EntityManager per scope gives each request its own identity map / UoW.
    em: asFunction(({ orm }: Cradle) => orm.em.fork()).scoped(),
    userService: asClass(UserService).scoped(),
    invitationService: asClass(InvitationService).scoped(),
    mentorProfileService: asClass(MentorProfileService).scoped(),
    slotService: asClass(SlotService).scoped(),
    // Scoped: it counts through the request's `em`.
    rateLimiter: asClass(RateLimiter).scoped(),
  });

  if (mailerChoice(env) === 'log-by-default') {
    container.cradle.logger.warn(
      'MAILER_ADAPTER is unset in development: mail is written to this log (msg "mail.sent"), not delivered',
    );
  }

  // Default in-process subscribers. Concept side effects (send a message, invalidate
  // a cache) register here; for now we just log so the event path is observable.
  container.cradle.eventBus.on('auth.user.created', ({ userId }) => {
    container.cradle.logger.info({ userId }, 'auth.user.created');
  });
  container.cradle.eventBus.on('auth.user.roles_changed', ({ userId, added, removed }) => {
    container.cradle.logger.info({ userId, added, removed }, 'auth.user.roles_changed');
  });

  return container;
}

/**
 * The process-wide container, built once. A build that *fails* is not cached: a
 * database that is down at the first request (`getOrm` rejects) must not poison every
 * later request until a restart. Concurrent callers share one in-flight build; after
 * a rejection the next call builds again — and a production missing-secret failure
 * keeps failing loudly on every request rather than once.
 */
export function getContainer(): Promise<AwilixContainer<Cradle>> {
  if (!globalForContainer.__devmentorContainer) {
    const pending = build();
    globalForContainer.__devmentorContainer = pending;
    pending.catch(() => {
      if (globalForContainer.__devmentorContainer === pending) {
        delete globalForContainer.__devmentorContainer;
      }
    });
  }
  return globalForContainer.__devmentorContainer;
}

async function runInScope<T>(
  fn: (cradle: Cradle) => Promise<T> | T,
  setup?: (scope: AwilixContainer<Cradle>) => void,
): Promise<T> {
  const container = await getContainer();
  const scope = container.createScope<Cradle>();
  try {
    setup?.(scope);
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}

/**
 * Run `fn` inside a fresh awilix scope. The scope owns a forked EntityManager and any
 * other SCOPED services; it is disposed (releasing scoped state) when `fn` settles.
 * This is the entry point for unauthenticated and system work. It registers no
 * `session`: resolving one here is an awilix resolution error, never a silent 401 —
 * code acting for a request uses `withRequestScope`.
 */
export function withScope<T>(fn: (cradle: Cradle) => Promise<T> | T): Promise<T> {
  return runInScope(fn);
}

/**
 * `withScope` for work done on behalf of a request whose session-cookie *value* is
 * already known — the app's page helper, which reads it with `cookies()` and has no
 * `Request`. Registers the scoped, lazily-resolved `session` (see `withRequestScope`).
 */
export function withSessionCookieScope<T>(
  sessionToken: string | null | undefined,
  fn: (cradle: Cradle) => Promise<T> | T,
): Promise<T> {
  return runInScope(fn, (scope) => {
    scope.register({
      // Scoped, so `requireSession` and every service in this scope share one
      // verification and one `findOne(User)`. Resolved lazily: a scope that never asks
      // for the session never touches the database for it.
      session: asFunction((cradle: Cradle) => {
        const session = loadSession(sessionToken, cradle);
        // The cached promise may be resolved by a constructor and never awaited; a
        // rejection still reaches every awaiter, but must not crash the process.
        session.catch(() => undefined);
        return session;
      }).scoped(),
    });
  });
}

/**
 * `withScope` for a route handler: the scope's `session` is resolved from `req`'s
 * `devmentor_session` cookie, on first use, to `Session | null`. A public route that
 * resolves it gets `null` — failing closed is the caller's explicit decision, via
 * `requireSession(req, cradle)`.
 */
export function withRequestScope<T>(
  req: Request,
  fn: (cradle: Cradle) => Promise<T> | T,
): Promise<T> {
  return withSessionCookieScope(readSessionCookie(req.headers.get('cookie')), fn);
}
